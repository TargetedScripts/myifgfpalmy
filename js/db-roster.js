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
    role_name: roleObj.role_name || roleObj.name || "",
    department_id: roleObj.department_id || roleObj.dept_id || "",
    disciple_id: discipleObj.id,
    disciple_name: discipleObj.full_name,
    disciple_phone: discipleObj.phone || "",
    status,
    updated_at: serverTimestamp()
  }, { merge: true });
}

export async function upsertAssignment(existingId, data) {
  const docId = existingId || `${data.service_date}__${data.role_id || data.role_name}`;
  await setDoc(doc(db, "assignments", docId), {
    service_date: data.service_date,
    role_id: data.role_id || "",
    role_name: data.role_name || "",
    department_id: data.department_id || data.dept_id || "",
    disciple_id: data.disciple_id,
    disciple_name: data.disciple_name,
    disciple_phone: data.disciple_phone || "",
    status: data.status || "Assigned",
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
  if (!assignmentId) return;
  await deleteDoc(doc(db, "assignments", assignmentId));
}

// Alias agar ui-roster.js yang memanggil deleteAssignment tetap berjalan lancar
export async function deleteAssignment(assignmentId) {
  await removeAssignment(assignmentId);
}

// --- 3. VOLUNTEER UNAVAILABILITY (FROM / TO DATE RANGE) ---
export async function getUnavailabilityList() {
  const snap = await getDocs(collection(db, "volunteer_unavailability"));
  return snap.docs
    .map(d => {
      const data = d.data();
      const start = data.start_date || data.unavailable_date || "";
      const end = data.end_date || data.unavailable_date || start;
      return { id: d.id, ...data, start_date: start, end_date: end };
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

// Alias agar ui-roster.js yang memanggil getUnavailability tetap berjalan lancar
export async function getUnavailability() {
  return await getUnavailabilityList();
}

export async function addUnavailability(data) {
  const start = data.start_date || data.unavailable_date;
  const end = data.end_date && data.end_date >= start ? data.end_date : start;
  await addDoc(collection(db, "volunteer_unavailability"), {
    disciple_id: data.disciple_id,
    disciple_name: data.disciple_name,
    start_date: start,
    end_date: end,
    unavailable_date: start, // backward compatibility
    reason: data.reason || "",
    created_at: serverTimestamp()
  });
}

export async function deleteUnavailability(id) {
  if (!id) return;
  await deleteDoc(doc(db, "volunteer_unavailability", id));
}
