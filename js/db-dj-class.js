// js/db-dj-class.js
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
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COL_OFFERINGS = "dj_class_offerings";
const COL_ENROLLMENTS = "dj_class_enrollments";
const COL_DISCIPLES = "disciples";

export const DJ_LEVEL_ORDER = ["come", "grow", "serve", "lead"];

export function normalizeDjKey(val = "") {
  const k = String(val || "").trim().toLowerCase();
  if (k.includes("come") || k === "dj1" || k === "dj 1") return "come";
  if (k.includes("grow") || k === "dj2" || k === "dj 2") return "grow";
  if (k.includes("serve") || k === "dj3" || k === "dj 3") return "serve";
  if (k.includes("lead") || k === "dj4" || k === "dj 4") return "lead";
  return k;
}

export function getAucklandTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

/**
 * Menentukan apakah pendaftaran kelas masih terbuka:
 * - Status tidak "Completed"
 * - Tidak ditutup manual oleh facilitator
 * - Tanggal hari ini (Pacific/Auckland) >= registration_open_date (jika ada)
 * - Tanggal hari ini (Pacific/Auckland) <= registration_close_date (jika ada)
 */
export function isRegistrationOpen(offering, todayISO = getAucklandTodayISO()) {
  if (!offering) return false;
  if (String(offering.status || "").toLowerCase() === "completed") return false;
  if (offering.registration_manually_closed === true) return false;

  const openDate = String(offering.registration_open_date || "").trim();
  const closeDate = String(offering.registration_close_date || "").trim();

  if (openDate && todayISO < openDate) return false;
  if (closeDate && todayISO > closeDate) return false;
  return true;
}

/**
 * Mengecek apakah level tertentu sudah "Completed" pada profil disciple.
 */
export function isDjLevelCompleted(disciple = {}, classKey = "") {
  const key = normalizeDjKey(classKey);
  const prog = disciple?.dj_progress || {};
  const map = {
    come: prog.come || prog.dj1 || "",
    grow: prog.grow || prog.dj2 || "",
    serve: prog.serve || prog.dj3 || "",
    lead: prog.lead || prog.dj4 || ""
  };
  return String(map[key] || "").trim().toLowerCase() === "completed";
}

/**
 * Validasi urutan prasyarat: Come -> Grow -> Serve -> Lead.
 */
export function checkDjPrerequisite(disciple = {}, targetClassKey = "", allEnrollments = []) {
  const key = normalizeDjKey(targetClassKey);
  const idx = DJ_LEVEL_ORDER.indexOf(key);
  if (idx <= 0) {
    return { allowed: true, missingLevelKey: null, message: "" };
  }

  for (let i = 0; i < idx; i++) {
    const reqKey = DJ_LEVEL_ORDER[i];
    const completedInProfile = isDjLevelCompleted(disciple, reqKey);
    const completedInEnrollment = Array.isArray(allEnrollments) && allEnrollments.some(
      enr =>
        enr.disciple_id === disciple?.id &&
        normalizeDjKey(enr.class_key) === reqKey &&
        String(enr.status || "").toLowerCase() === "completed"
    );

    if (!completedInProfile && !completedInEnrollment) {
      const reqLabel = reqKey.toUpperCase();
      const targetLabel = key.toUpperCase();
      return {
        allowed: false,
        missingLevelKey: reqKey,
        message: `Pre-requisite required: You must complete DJ ${reqLabel} before registering for DJ ${targetLabel}.`
      };
    }
  }

  return { allowed: true, missingLevelKey: null, message: "" };
}

function computeTrafficLightFromProgress(djProgress = {}) {
  const vals = [
    String(djProgress.come || "").toLowerCase(),
    String(djProgress.grow || "").toLowerCase(),
    String(djProgress.serve || "").toLowerCase(),
    String(djProgress.lead || "").toLowerCase()
  ];
  if (vals.some(v => v === "completed")) return "green";
  if (vals.some(v => v === "in progress" || v === "enrolled")) return "amber";
  return "red";
}

export async function getAllDjOfferings() {
  const snap = await getDocs(collection(db, COL_OFFERINGS));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.created_at_iso || b.registration_open_date || "").localeCompare(
      String(a.created_at_iso || a.registration_open_date || "")
    ));
}

export async function getAllDjEnrollments() {
  const snap = await getDocs(collection(db, COL_ENROLLMENTS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEnrollmentsByOffering(offeringId) {
  if (!offeringId) return [];
  const q = query(collection(db, COL_ENROLLMENTS), where("offering_id", "==", offeringId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createDjClassOffering({
  class_key,
  class_name,
  class_title = "",
  facilitator_id = "",
  facilitator_name = "",
  facilitator_email = "",
  registration_open_date = "",
  registration_close_date = "",
  class_start_date = "",
  chapters = []
}) {
  const key = normalizeDjKey(class_key || class_name);
  const label = class_name || (key.charAt(0).toUpperCase() + key.slice(1));
  const todayISO = getAucklandTodayISO();

  const normalizedChapters = (Array.isArray(chapters) ? chapters : []).map((ch, idx) => ({
    chapter_no: Number(ch.chapter_no) || idx + 1,
    title: String(ch.title || "").trim(),
    page: String(ch.page || "").trim(),
    completed: false,
    completed_date: ""
  }));

  const payload = {
    class_key: key,
    class_name: label,
    class_title: String(class_title || `${label} Class`).trim(),
    facilitator_id: String(facilitator_id || "").trim(),
    facilitator_name: String(facilitator_name || "").trim(),
    facilitator_email: String(facilitator_email || "").trim().toLowerCase(),
    registration_open_date: registration_open_date || todayISO,
    registration_close_date: registration_close_date || "",
    registration_manually_closed: false,
    class_start_date: class_start_date || "",
    status: "Open",
    created_at_iso: todayISO,
    chapters: normalizedChapters,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };

  const ref = await addDoc(collection(db, COL_OFFERINGS), payload);
  return { id: ref.id, ...payload };
}

export async function setDjRegistrationClosed(offeringId, closed = true) {
  if (!offeringId) return;
  await updateDoc(doc(db, COL_OFFERINGS, offeringId), {
    registration_manually_closed: Boolean(closed),
    updated_at: serverTimestamp()
  });
}

export async function startDjClassOffering(offeringId, startDate = getAucklandTodayISO()) {
  if (!offeringId) return;
  await updateDoc(doc(db, COL_OFFERINGS, offeringId), {
    status: "Ongoing",
    class_start_date: startDate,
    registration_manually_closed: true,
    updated_at: serverTimestamp()
  });
}

export async function deleteDjClassOffering(offeringId) {
  if (!offeringId) return;
  await deleteDoc(doc(db, COL_OFFERINGS, offeringId));
}

export async function registerDiscipleToDjClass({ offering, disciple, allEnrollments = [] }) {
  if (!offering?.id) throw new Error("Class offering not found.");
  if (!disciple?.id) throw new Error("Disciple profile is required to register.");

  if (!isRegistrationOpen(offering)) {
    throw new Error("Registration for this DJ class is already closed.");
  }

  const prereq = checkDjPrerequisite(disciple, offering.class_key, allEnrollments);
  if (!prereq.allowed) {
    throw new Error(prereq.message);
  }

  const already = (allEnrollments || []).find(
    e => e.offering_id === offering.id && e.disciple_id === disciple.id
  );
  if (already) {
    return { alreadyRegistered: true, enrollment: already };
  }

  const payload = {
    offering_id: offering.id,
    class_key: normalizeDjKey(offering.class_key),
    class_name: offering.class_name,
    disciple_id: disciple.id,
    disciple_name: disciple.full_name || "Member",
    disciple_email: String(disciple.email || "").trim().toLowerCase(),
    disciple_phone: disciple.phone || "",
    status: "Enrolled",
    completed_date: "",
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };

  const ref = await addDoc(collection(db, COL_ENROLLMENTS), payload);

  const key = normalizeDjKey(offering.class_key);
  const currVal = String(disciple?.dj_progress?.[key] || "").toLowerCase();
  if (currVal !== "completed") {
    const nextProg = {
      ...(disciple.dj_progress || {}),
      [key]: "In Progress"
    };
    await setDoc(doc(db, COL_DISCIPLES, disciple.id), {
      dj_progress: nextProg,
      dj_traffic_light: computeTrafficLightFromProgress(nextProg),
      updated_at: serverTimestamp()
    }, { merge: true });
  }

  return { alreadyRegistered: false, enrollment: { id: ref.id, ...payload } };
}

export async function updateDjChapterCompletion({
  offeringId,
  chapterIndex,
  completed,
  completedDate = ""
}) {
  const offRef = doc(db, COL_OFFERINGS, offeringId);
  const snap = await getDoc(offRef);
  if (!snap.exists()) throw new Error("DJ Class offering not found.");

  const offering = { id: snap.id, ...snap.data() };
  const chapters = Array.isArray(offering.chapters) ? [...offering.chapters] : [];
  if (!chapters[chapterIndex]) throw new Error("Chapter not found.");

  const isDone = Boolean(completed);
  const finalDate = isDone
    ? (String(completedDate || "").trim() || getAucklandTodayISO())
    : "";

  chapters[chapterIndex] = {
    ...chapters[chapterIndex],
    completed: isDone,
    completed_date: finalDate
  };

  const allCompleted = chapters.length > 0 && chapters.every(ch => ch.completed === true);
  const nextStatus = allCompleted
    ? "Completed"
    : (offering.status === "Completed" ? "Ongoing" : (offering.status || "Ongoing"));

  await updateDoc(offRef, {
    chapters,
    status: nextStatus,
    completed_at_iso: allCompleted ? (finalDate || getAucklandTodayISO()) : "",
    updated_at: serverTimestamp()
  });

  if (allCompleted) {
    const key = normalizeDjKey(offering.class_key);
    const enrollments = await getEnrollmentsByOffering(offeringId);

    for (const enr of enrollments) {
      await updateDoc(doc(db, COL_ENROLLMENTS, enr.id), {
        status: "Completed",
        completed_date: finalDate || getAucklandTodayISO(),
        updated_at: serverTimestamp()
      });

      if (enr.disciple_id && key) {
        const discRef = doc(db, COL_DISCIPLES, enr.disciple_id);
        const discSnap = await getDoc(discRef);
        if (discSnap.exists()) {
          const discData = discSnap.data();
          const nextProg = {
            ...(discData.dj_progress || {}),
            [key]: "Completed"
          };
          await setDoc(discRef, {
            dj_progress: nextProg,
            dj_traffic_light: "green",
            updated_at: serverTimestamp()
          }, { merge: true });
        }
      }
    }
  }

  return {
    offering: { ...offering, chapters, status: nextStatus },
    allCompleted
  };
}
