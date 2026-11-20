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
  where,
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

// --- 2. DJ DISCIPLESHIP PROGRESS ---
export async function updateDiscipleDJStages(discipleId, djStages) {
  const completedCount = ["come", "grow", "serve", "lead"].filter(k => Boolean(djStages[k])).length;
  let trafficLight = "red";
  if (completedCount === 4) {
    trafficLight = "green";
  } else if (completedCount > 0) {
    trafficLight = "amber";
  }

  await updateDoc(doc(db, "disciples", discipleId), {
    dj_stages: {
      come: Boolean(djStages.come),
      grow: Boolean(djStages.grow),
      serve: Boolean(djStages.serve),
      lead: Boolean(djStages.lead)
    },
    dj_traffic_light: trafficLight,
    updated_at: serverTimestamp()
  });

  return trafficLight;
}

// --- 3. ICARE GROUPS ---
export async function getICareGroups() {
  const q = query(collection(db, "icare_groups"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveICareGroup(data) {
  const payload = {
    name: data.name,
    leader_name: data.leader_name || "",
    schedule: data.schedule || "",
    location: data.location || "",
    member_ids: data.member_ids || [],
    updated_at: serverTimestamp()
  };
  if (data.id) {
    await updateDoc(doc(db, "icare_groups", data.id), payload);
  } else {
    await addDoc(collection(db, "icare_groups"), {
      ...payload,
      created_at: serverTimestamp()
    });
  }
}

export async function deleteICareGroup(id) {
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
    full_name: data.full_name,
    phone: data.phone || "",
    email: data.email || "",
    visit_date: data.visit_date,
    category: data.category || "Student / Migrant",
    followup_status: data.followup_status || "New Visitor",
    notes: data.notes || "",
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
  await deleteDoc(doc(db, "newcomers", id));
}
