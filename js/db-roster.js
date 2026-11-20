// js/db-roster.js
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
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. SUNDAY SERVICES ---
export async function getSundayServices() {
  const q = query(collection(db, "sunday_services"), orderBy("service_date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function ensureServiceRecord(serviceDate, meta = {}) {
  const ref = doc(db, "sunday_services", serviceDate);
  await setDoc(ref, {
    service_date: serviceDate,
    service_time: meta.service_time || "10:30 AM",
    title: meta.title || "Sunday Celebration Service",
    key_verse: meta.key_verse || "",
    status: meta.status || "Draft",
    updated_at: serverTimestamp()
  }, { merge: true });
}

// --- 2. ASSIGNMENTS (PER SERVICE DATE) ---
export async function getAssignmentsByDate(serviceDate) {
  const q = query(
    collection(db, "assignments"),
    where("service_date", "==", serviceDate)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveAssignment(serviceDate, roleObj, discipleObj, status = "Assigned") {
  const docId = `${serviceDate}__${roleObj.id}`;
  await setDoc(doc(db, "assignments", docId), {
    service_date: serviceDate,
    role_id: roleObj.id,
    role_name: roleObj.role_name,
    department_id: roleObj.department_id,
    disciple_id: discipleObj.id,
    disciple_name: discipleObj.full_name,
    disciple_phone: discipleObj.phone || "",
    status,
    updated_at: serverTimestamp()
  }, { merge: true });
}

export async function updateAssignmentStatus(assignmentId, status) {
  await updateDoc(doc(db, "assignments", assignmentId), {
    status,
    updated_at: serverTimestamp()
  });
}

export async function removeAssignment(assignmentId) {
  await deleteDoc(doc(db, "assignments", assignmentId));
}

// --- 3. VOLUNTEER UNAVAILABILITY (BLOCK-OUT DATES) ---
export async function getUnavailabilityList() {
  const q = query(collection(db, "volunteer_unavailability"), orderBy("unavailable_date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addUnavailability(data) {
  await addDoc(collection(db, "volunteer_unavailability"), {
    ...data,
    created_at: serverTimestamp()
  });
}

export async function deleteUnavailability(id) {
  await deleteDoc(doc(db, "volunteer_unavailability", id));
}
