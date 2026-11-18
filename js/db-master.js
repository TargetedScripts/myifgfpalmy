
// js/db-master.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. DEPARTMENTS ---
export async function getDepartments() {
  const q = query(collection(db, "departments"), orderBy("sort_order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveDepartment(id, data) {
  if (id) {
    await updateDoc(doc(db, "departments", id), { ...data, updated_at: serverTimestamp() });
  } else {
    await addDoc(collection(db, "departments"), { ...data, created_at: serverTimestamp() });
  }
}

// --- 2. ROLES REFERENCE ---
export async function getRolesReference() {
  const q = query(collection(db, "roles_reference"), orderBy("role_name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveRoleReference(id, data) {
  if (id) {
    await updateDoc(doc(db, "roles_reference", id), { ...data, updated_at: serverTimestamp() });
  } else {
    await addDoc(collection(db, "roles_reference"), { ...data, created_at: serverTimestamp() });
  }
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
    await updateDoc(doc(db, "disciples", id), payload);
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "disciples"), payload);
  }
}

// --- 4. ONE-CLICK SEED MASTER DATA (9 DEPARTMENTS & 24+ ROLES) ---
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
    { role_name: "Preacher / Speaker", department_id: "pulpit_editorial", min_dj_level: "Grow", can_reimburse: false },
    { role_name: "Service MC / Host", department_id: "pulpit_editorial", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Weekly Insight Editor", department_id: "pulpit_editorial", min_dj_level: "Grow", can_reimburse: false },
    { role_name: "Worship Leader", department_id: "praise_worship", min_dj_level: "Grow", can_reimburse: false },
    { role_name: "Singer / Backing Vocal", department_id: "praise_worship", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Acoustic / Electric Guitar", department_id: "praise_worship", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Bass Guitar", department_id: "praise_worship", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Keyboard / Piano", department_id: "praise_worship", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Drums / Cajon", department_id: "praise_worship", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Sound Engineer", department_id: "creative_production", min_dj_level: "Come", can_reimburse: true },
    { role_name: "Multimedia / Lyrics Operator", department_id: "creative_production", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Livestream & Camera", department_id: "creative_production", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Photographer / Social Media", department_id: "creative_production", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Graphic Designer (Poster)", department_id: "creative_production", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Kitchen Lead / Cook", department_id: "kitchen_catering", min_dj_level: "Come", can_reimburse: true },
    { role_name: "Fellowship Refreshments", department_id: "kitchen_catering", min_dj_level: "Come", can_reimburse: true },
    { role_name: "Barista / Coffee Station", department_id: "kitchen_catering", min_dj_level: "Come", can_reimburse: true },
    { role_name: "Head Usher", department_id: "usher_facility", min_dj_level: "Grow", can_reimburse: false },
    { role_name: "Welcome & Seating Usher", department_id: "usher_facility", min_dj_level: "Come", can_reimburse: false },
    { role_name: "Hall Setup & Packdown", department_id: "usher_facility", min_dj_level: "Come", can_reimburse: false },
    { role_name: "DJ Facilitator", department_id: "dj_class", min_dj_level: "Grow", can_reimburse: false },
    { role_name: "iCare Leader", department_id: "icare", min_dj_level: "Grow", can_reimburse: false },
    { role_name: "iCorner Host", department_id: "icorner_missions", min_dj_level: "Come", can_reimburse: true },
    { role_name: "Missions & Outreach Coord", department_id: "icorner_missions", min_dj_level: "Grow", can_reimburse: true }
  ];

  for (const r of roles) {
    const slug = r.role_name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    await setDoc(doc(db, "roles_reference", slug), {
      ...r,
      is_active: true,
      created_at: serverTimestamp()
    }, { merge: true });
  }
}
