// js/db-care.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. SUNDAY ATTENDANCE ---
export async function getSundayAttendance(serviceDate) {
  if (!serviceDate) return { present_ids: [], visitors_count: 0, kids_count: 0, notes: "" };
  const snap = await getDoc(doc(db, "sunday_attendance", serviceDate));
  if (!snap.exists()) {
    return { service_date: serviceDate, present_ids: [], visitors_count: 0, kids_count: 0, notes: "" };
  }
  return { service_date: serviceDate, ...snap.data() };
}

export async function saveSundayAttendance(serviceDate, payload) {
  await setDoc(doc(db, "sunday_attendance", serviceDate), {
    service_date: serviceDate,
    present_ids: payload.present_ids || [],
    visitors_count: Number(payload.visitors_count || 0),
    kids_count: Number(payload.kids_count || 0),
    notes: payload.notes || "",
    updated_at: serverTimestamp()
  }, { merge: true });
}

// --- 2. DJ DISCIPLESHIP PROGRESS (SYNCED WITH dj_stages & dj_progress) ---
export async function updateDiscipleDJStages(discipleId, djStages, existingProgress = {}) {
  const keys = ["come", "grow", "serve", "lead"];
  const normalizedStages = {
    come: Boolean(djStages.come),
    grow: Boolean(djStages.grow),
    serve: Boolean(djStages.serve),
    lead: Boolean(djStages.lead)
  };

  const syncedProgress = {};
  keys.forEach(k => {
    if (normalizedStages[k]) {
      syncedProgress[k] = "Completed";
    } else {
      const prev = String(existingProgress?.[k] || "");
      syncedProgress[k] = prev.toLowerCase() === "in progress" ? "In Progress" : "Not Started";
    }
  });

  const completedCount = keys.filter(k => normalizedStages[k]).length;
  const hasInProgress = keys.some(k => syncedProgress[k] === "In Progress");

  let trafficLight = "red";
  if (completedCount === 4) {
    trafficLight = "green";
  } else if (completedCount > 0 || hasInProgress) {
    trafficLight = "amber";
  }

  await updateDoc(doc(db, "disciples", discipleId), {
    dj_stages: normalizedStages,
    dj_progress: syncedProgress,
    dj_traffic_light: trafficLight,
    updated_at: serverTimestamp()
  });

  return { trafficLight, djStages: normalizedStages, djProgress: syncedProgress };
}

// --- 3. ICARE GROUPS ---
export async function getICareGroups() {
  const q = query(collection(db, "icare_groups"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveICareGroup(data) {
  const payload = {
    name: (data.name || "").trim(),
    leader_id: data.leader_id || "",
    leader_name: (data.leader_name || "").trim(),
    schedule: (data.schedule || "").trim(),
    location: (data.location || "").trim(),
    member_ids: Array.isArray(data.member_ids) ? data.member_ids : [],
    updated_at: serverTimestamp()
  };
  if (data.id) {
    await setDoc(doc(db, "icare_groups", data.id), payload, { merge: true });
    return data.id;
  } else {
    const ref = await addDoc(collection(db, "icare_groups"), {
      ...payload,
      created_at: serverTimestamp()
    });
    return ref.id;
  }
}

export async function deleteICareGroup(id) {
  if (!id) return;
  await deleteDoc(doc(db, "icare_groups", id));
}

// --- 4. NEWCOMERS / ICORNER ---
export async function getNewcomers() {
  const q = query(collection(db, "newcomers"), orderBy("visit_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addNewcomer(data) {
  await addDoc(collection(db, "newcomers"), {
    full_name: (data.full_name || "").trim(),
    phone: (data.phone || "").trim(),
    email: (data.email || "").trim().toLowerCase(),
    visit_date: data.visit_date,
    category: data.category || "Student / Migrant",
    followup_status: data.followup_status || "New Visitor",
    notes: (data.notes || "").trim(),
    created_at: serverTimestamp()
  });
}

export async function updateNewcomerStatus(id, status) {
  await updateDoc(doc(db, "newcomers", id), {
    followup_status: status,
    updated_at: serverTimestamp()
  });
}

export async function deleteNewcomer(id) {
  if (!id) return;
  await deleteDoc(doc(db, "newcomers", id));
}
