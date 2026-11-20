// js/db-portal.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- 1. PUBLIC FEED QUERIES (NO LOGIN REQUIRED) ---
export async function getPublicMonthlyThemes() {
  const q = query(collection(db, "monthly_themes"), orderBy("month_key", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPublicWeeklyInsights() {
  const q = query(collection(db, "weekly_insights"), orderBy("service_date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPublicDailyDevotions() {
  const q = query(collection(db, "daily_devotions"), orderBy("devotion_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPublicMediaGalleries() {
  const q = query(collection(db, "media_galleries"), orderBy("event_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// --- 2. MEMBER SELF-SERVICE QUERIES ---
export async function getMyAssignments(discipleId) {
  if (!discipleId) return [];
  const q = query(
    collection(db, "assignments"),
    where("disciple_id", "==", discipleId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.service_date || "").localeCompare(b.service_date || ""));
}

export async function respondToAssignment(assignmentId, newStatus) {
  await updateDoc(doc(db, "assignments", assignmentId), {
    status: newStatus,
    responded_at: serverTimestamp(),
    updated_at: serverTimestamp()
  });
}

export async function getMyUnavailability(discipleId) {
  if (!discipleId) return [];
  const q = query(
    collection(db, "volunteer_unavailability"),
    where("disciple_id", "==", discipleId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => {
      const data = d.data();
      const start = data.start_date || data.unavailable_date || "";
      const end = data.end_date || data.unavailable_date || start;
      return { id: d.id, ...data, start_date: start, end_date: end };
    })
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export async function updateMyContactProfile(discipleId, updates) {
  await updateDoc(doc(db, "disciples", discipleId), {
    ...updates,
    updated_at: serverTimestamp()
  });
}
