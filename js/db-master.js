// js/db-master.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. DEPARTMENTS (ADD / EDIT / DELETE) ---
export async function getDepartments() {
  const q = query(collection(db, "departments"), orderBy("sort_order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveDepartment(id, data) {
  if (id) {
    await setDoc(doc(db, "departments", id), {
      ...data,
      updated_at: serverTimestamp()
    }, { merge: true });
  } else {
    await addDoc(collection(db, "departments"), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    });
  }
}

export async function deleteDepartment(id) {
  if (!id) return;
  await deleteDoc(doc(db, "departments", id));
}

// --- 2. ROLES REFERENCE (ADD / EDIT / MOVE DEPT / DELETE) ---
export async function getRolesReference() {
  const q = query(collection(db, "roles_reference"), orderBy("role_name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRoles() {
  const list = await getRolesReference();
  return list.map(r => ({
    ...r,
    name: r.role_name || r.name || "",
    dept_id: r.department_id || r.dept_id || "",
    dept_name: r.dept_name || r.department_name || "",
    active: r.is_active !== false
  }));
}

export async function saveRoleReference(id, data) {
  const roleName = (data.role_name ?? data.name ?? "").trim();
  const departmentId = (data.department_id ?? data.dept_id ?? "").trim();
  const isActive = data.is_active !== false && data.active !== false;

  const payload = {
    ...data,
    ...(roleName ? { role_name: roleName } : {}),
    ...(departmentId ? { department_id: departmentId } : {}),
    is_active: isActive,
    updated_at: serverTimestamp()
  };

  if (id) {
    await setDoc(doc(db, "roles_reference", id), payload, { merge: true });
  } else {
    await addDoc(collection(db, "roles_reference"), {
      ...payload,
      created_at: serverTimestamp()
    });
  }
}

export async function saveRole(id, data) {
  return await saveRoleReference(id, data);
}

export async function deleteRoleReference(id) {
  if (!id) return;
  await deleteDoc(doc(db, "roles_reference", id));
}

export async function deleteRole(id) {
  return await deleteRoleReference(id);
}

export async function toggleRoleActive(id, currentState) {
  await updateDoc(doc(db, "roles_reference", id), {
    is_active: !currentState,
    updated_at: serverTimestamp()
  });
}

// --- 3. DISCIPLES (SOFT-DELETE ONLY) ---
export async function getDisciples() {
  const q = query(collection(db, "disciples"), orderBy("full_name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveDisciple(id, data) {
  const payload = {
    ...data,
    email: (data.email || "").trim().toLowerCase(),
    updated_at: serverTimestamp()
  };
  if (id) {
    await setDoc(doc(db, "disciples", id), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "disciples"), payload);
  }
}

// --- 4. BULK CSV IMPORTER (GOOGLE FORMS / SHEETS) ---
function cleanText(val) {
  return (val || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
}

function normalizeNZPhone(raw) {
  let digits = cleanText(raw).replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "64" + digits.slice(1);
  if (digits.startsWith("2") && digits.length >= 8 && digits.length <= 10) return "64" + digits;
  return digits;
}

function parseCSVRows(csvText) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((ch === "\n" || (ch === "\r" && next === "\n")) && !inQuotes) {
      if (ch === "\r") i++;
      row.push(cell);
      if (row.some(c => cleanText(c) !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some(c => cleanText(c) !== "")) rows.push(row);
  }
  return rows;
}

export async function importDisciplesFromCSV(csvText) {
  const rows = parseCSVRows(csvText);
  if (rows.length < 2) throw new Error("CSV file is empty or invalid.");

  const headers = rows[0].map(h => cleanText(h).toLowerCase());
  const existingDisciples = await getDisciples();
  const byEmail = new Map();
  existingDisciples.forEach(d => {
    if (d.email) byEmail.set(d.email.toLowerCase(), d);
  });

  const mergedRecords = new Map();

  for (let r = 1; r < rows.length; r++) {
    const line = rows[r];
    const getCol = (keyword) => {
      const idx = headers.findIndex(h => h.includes(keyword));
      return idx >= 0 ? cleanText(line[idx]) : "";
    };

    const fullName = getCol("full name");
    const email = getCol("email address").toLowerCase();
    if (!fullName && !email) continue;

    const dj1 = getCol("dj 1");
    const dj2 = getCol("dj 2");
    const dj3 = getCol("dj 3");
    const dj4 = getCol("dj 4");
    const djStates = [dj1, dj2, dj3, dj4];

    let djLight = "red";
    if (djStates.some(s => s.toLowerCase() === "completed")) {
      djLight = "green";
    } else if (djStates.some(s => s.toLowerCase() === "in progress")) {
      djLight = "amber";
    }

    const rawInterests = getCol("ministry interest")
      .split(",")
      .map(x => cleanText(x))
      .filter(Boolean);

    const activeCol = getCol("active").toLowerCase();
    const status = activeCol === "no" || activeCol === "inactive" ? "Irregular" : "Active";

    const key = email || `name:${fullName.toLowerCase()}`;
    const prev = mergedRecords.get(key);

    const mergedInterests = Array.from(
      new Set([...(prev?.ministry_interests || []), ...rawInterests])
    );

    mergedRecords.set(key, {
      member_id: getCol("member id") || prev?.member_id || "",
      full_name: fullName || prev?.full_name || "",
      nick_name: getCol("nick name") || prev?.nick_name || "",
      gender: getCol("gender") || prev?.gender || "",
      place_of_birth: getCol("place of birth") || prev?.place_of_birth || "",
      date_of_birth: getCol("date of birth") || prev?.date_of_birth || "",
      nz_status: getCol("status in new zealand") || prev?.nz_status || "",
      institution: getCol("institution/company") || prev?.institution || "",
      email,
      phone: normalizeNZPhone(getCol("phone/whatsapp")) || prev?.phone || "",
      address: getCol("home address") || prev?.address || "",
      dj_progress: {
        come: dj1 || prev?.dj_progress?.come || "Not Started",
        grow: dj2 || prev?.dj_progress?.grow || "Not Started",
        serve: dj3 || prev?.dj_progress?.serve || "Not Started",
        lead: dj4 || prev?.dj_progress?.lead || "Not Started"
      },
      dj_traffic_light: djLight,
      in_icare: getCol("joined an icare") || prev?.in_icare || "",
      ministry_interests: mergedInterests,
      marital_status: getCol("marital status") || prev?.marital_status || "",
      spouse_name: getCol("spouse") || prev?.spouse_name || "",
      children_names: getCol("children") || prev?.children_names || "",
      pastoral_notes: getCol("how can we help") || prev?.pastoral_notes || "",
      status
    });
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const [, record] of mergedRecords) {
    const existing = record.email ? byEmail.get(record.email) : null;
    if (existing) {
      await setDoc(doc(db, "disciples", existing.id), {
        ...record,
        system_role: existing.system_role || "member",
        updated_at: serverTimestamp()
      }, { merge: true });
      updatedCount++;
    } else {
      await addDoc(collection(db, "disciples"), {
        ...record,
        system_role: record.email === "tedysutedja@gmail.com" || record.email === "admin@ifgfpalmy.org"
          ? "super_admin"
          : "member",
        baptism_info: { is_baptized: false, baptism_date: "" },
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      createdCount++;
    }
  }

  return {
    totalRows: rows.length - 1,
    uniqueProfiles: mergedRecords.size,
    createdCount,
    updatedCount
  };
}

// --- 5. ONE-CLICK SEED MASTER DATA (9 DEPARTMENTS & ROLES) ---
export async function seedInitialMasterData() {
  const depts = [
    { id: "pulpit_editorial", name: "Pulpit & Editorial", sort_order: 1, is_active: true },
    { id: "praise_worship", name: "Praise & Worship", sort_order: 2, is_active: true },
    { id: "creative_production", name: "Creative & Production", sort_order: 3, is_active: true },
    { id: "kitchen_catering", name: "Kitchen & Catering", sort_order: 4, is_active: true },
    { id: "usher_facility", name: "Usher & Facility", sort_order: 5, is_active: true },
    { id: "dj_class", name: "DJ Class", sort_order: 6, is_active: true },
    { id: "icare", name: "iCare", sort_order: 7, is_active: true },
    { id: "icorner_missions", name: "iCorner & Missions", sort_order: 8, is_active: true },
    { id: "finance", name: "Finance [Deferred]", sort_order: 9, is_active: false }
  ];

  for (const d of depts) {
    await setDoc(doc(db, "departments", d.id), {
      name: d.name,
      sort_order: d.sort_order,
      is_active: d.is_active,
      created_at: serverTimestamp()
    }, { merge: true });
  }

  const roles = [
    { role_name: "Preacher / Speaker", department_id: "pulpit_editorial", dept_name: "Pulpit & Editorial", min_dj_level: "Grow", can_reimburse: false, is_universal: false },
    { role_name: "Service MC / Host", department_id: "pulpit_editorial", dept_name: "Pulpit & Editorial", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Weekly Insight Editor", department_id: "pulpit_editorial", dept_name: "Pulpit & Editorial", min_dj_level: "Grow", can_reimburse: false, is_universal: false },
    { role_name: "Worship Leader", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Grow", can_reimburse: false, is_universal: false },
    { role_name: "Singer 1", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Singer 2", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Singer 3", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Acoustic / Electric Guitar", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Bass Guitar", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Keyboard / Piano", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Drums / Cajon", department_id: "praise_worship", dept_name: "Praise & Worship", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Sound Engineer", department_id: "creative_production", dept_name: "Creative & Production", min_dj_level: "Come", can_reimburse: true, is_universal: false },
    { role_name: "Lighting", department_id: "creative_production", dept_name: "Creative & Production", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Multi Media", department_id: "creative_production", dept_name: "Creative & Production", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Camera", department_id: "creative_production", dept_name: "Creative & Production", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Photographer / Social Media", department_id: "creative_production", dept_name: "Creative & Production", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Graphic Designer (Poster)", department_id: "creative_production", dept_name: "Creative & Production", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Kitchen Lead / Cook", department_id: "kitchen_catering", dept_name: "Kitchen & Catering", min_dj_level: "Come", can_reimburse: true, is_universal: false },
    { role_name: "Fellowship Refreshments", department_id: "kitchen_catering", dept_name: "Kitchen & Catering", min_dj_level: "Come", can_reimburse: true, is_universal: false },
    { role_name: "Barista / Coffee Station", department_id: "kitchen_catering", dept_name: "Kitchen & Catering", min_dj_level: "Come", can_reimburse: true, is_universal: false },
    { role_name: "Head Usher", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Grow", can_reimburse: false, is_universal: false },
    { role_name: "Welcome & Seating Usher", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Hall Setup & Packdown", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Come", can_reimburse: false, is_universal: false },
    { role_name: "Cuci Piring 1", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Come", can_reimburse: false, is_universal: true },
    { role_name: "Cuci Piring 2", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Come", can_reimburse: false, is_universal: true },
    { role_name: "Cuci Piring 3", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Come", can_reimburse: false, is_universal: true },
    { role_name: "Vacuum", department_id: "usher_facility", dept_name: "Usher & Facility", min_dj_level: "Come", can_reimburse: false, is_universal: true },
    { role_name: "DJ Facilitator", department_id: "dj_class", dept_name: "DJ Class", min_dj_level: "Grow", can_reimburse: false, is_universal: false },
    { role_name: "iCare Leader", department_id: "icare", dept_name: "iCare", min_dj_level: "Grow", can_reimburse: false, is_universal: false },
    { role_name: "iCorner Host", department_id: "icorner_missions", dept_name: "iCorner & Missions", min_dj_level: "Come", can_reimburse: true, is_universal: false },
    { role_name: "Missions & Outreach Coord", department_id: "icorner_missions", dept_name: "iCorner & Missions", min_dj_level: "Grow", can_reimburse: true, is_universal: false }
  ];

  for (let i = 0; i < roles.length; i++) {
    const r = roles[i];
    const slug = r.role_name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    await setDoc(doc(db, "roles_reference", slug), {
      ...r,
      sort_order: i + 1,
      is_active: true,
      created_at: serverTimestamp()
    }, { merge: true });
  }
}
