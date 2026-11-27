// js/db-dj-class.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const DJ_LEVEL_ORDER = ["come", "grow", "serve", "lead"];

const DEFAULT_DJ_CHAPTERS = {
  come: [
    "Chapter 1: Salvation & New Birth",
    "Chapter 2: Water Baptism & Holy Spirit",
    "Chapter 3: Daily Devotion & Prayer",
    "Chapter 4: Living in Community"
  ],
  grow: [
    "Chapter 1: Knowing God's Word",
    "Chapter 2: Faith & Obedience",
    "Chapter 3: Character & Integrity",
    "Chapter 4: Sharing Your Testimony"
  ],
  serve: [
    "Chapter 1: Heart of a Servant",
    "Chapter 2: Spiritual Gifts & Calling",
    "Chapter 3: Excellence in Ministry",
    "Chapter 4: Teamwork & Accountability"
  ],
  lead: [
    "Chapter 1: Vision & Multiplication",
    "Chapter 2: Mentoring & Care Group",
    "Chapter 3: Leading with Humility",
    "Chapter 4: Raising Next-Gen Leaders"
  ]
};

export function normalizeDjKey(val = "") {
  const s = String(val || "").trim().toLowerCase();
  if (s.includes("lead")) return "lead";
  if (s.includes("serve")) return "serve";
  if (s.includes("grow")) return "grow";
  return "come";
}

export function getAucklandTodayISO() {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Pacific/Auckland",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const y = parts.find(p => p.type === "year")?.value || "2026";
    const m = parts.find(p => p.type === "month")?.value || "01";
    const d = parts.find(p => p.type === "day")?.value || "01";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function isDjOfferingDisabled(offering = {}) {
  const status = String(offering.status || "").trim().toLowerCase();
  return status === "disabled" || offering.is_active === false;
}

export function isDjOfferingHidden(offering = {}) {
  return offering.is_hidden === true;
}

export function isRegistrationOpen(offering = {}, todayISO = getAucklandTodayISO()) {
  if (!offering) return false;
  if (isDjOfferingDisabled(offering)) return false;
  const status = String(offering.status || "open").trim().toLowerCase();
  if (status === "completed" || status === "closed") return false;
  if (offering.registration_manually_closed === true) return false;

  const openDate = String(offering.registration_open_date || "").trim();
  const closeDate = String(offering.registration_close_date || "").trim();

  if (openDate && todayISO < openDate) return false;
  if (closeDate && todayISO > closeDate) return false;
  return true;
}

export function isDjLevelCompleted(discipleDoc = {}, levelKey = "come", allEnrollments = []) {
  const key = normalizeDjKey(levelKey);
  const progressVal = String(discipleDoc?.dj_progress?.[key] || "").trim().toLowerCase();
  if (progressVal === "completed") return true;

  if (discipleDoc?.id && Array.isArray(allEnrollments)) {
    return allEnrollments.some(
      e =>
        e.disciple_id === discipleDoc.id &&
        normalizeDjKey(e.class_key || e.class_name) === key &&
        String(e.status || "").trim().toLowerCase() === "completed"
    );
  }
  return false;
}

export function getHighestCompletedDjLevel(discipleDoc = {}, allEnrollments = []) {
  let highest = null;
  for (const lvl of DJ_LEVEL_ORDER) {
    if (isDjLevelCompleted(discipleDoc, lvl, allEnrollments)) {
      highest = lvl;
    }
  }
  return highest;
}

export function validateDjEnrollmentEligibility(discipleDoc = {}, targetLevelKey = "come", allEnrollments = []) {
  const target = normalizeDjKey(targetLevelKey);
  const targetIdx = DJ_LEVEL_ORDER.indexOf(target);

  if (isDjLevelCompleted(discipleDoc, "lead", allEnrollments)) {
    return {
      allowed: false,
      message: "You have already completed all Discipleship Journey (DJ) classes up to LEAD."
    };
  }

  if (isDjLevelCompleted(discipleDoc, target, allEnrollments)) {
    return {
      allowed: false,
      message: `You have already completed DJ: ${target.toUpperCase()}.`
    };
  }

  if (targetIdx > 0) {
    const prevKey = DJ_LEVEL_ORDER[targetIdx - 1];
    if (!isDjLevelCompleted(discipleDoc, prevKey, allEnrollments)) {
      return {
        allowed: false,
        message: `Prerequisite required: You must complete DJ: ${prevKey.toUpperCase()} before enrolling in DJ: ${target.toUpperCase()}.`
      };
    }
  }

  return { allowed: true, message: "Eligible" };
}

export async function getAllDjOfferings() {
  const snap = await getDocs(collection(db, "dj_class_offerings"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) =>
      String(b.created_at_iso || b.registration_open_date || "").localeCompare(
        String(a.created_at_iso || a.registration_open_date || "")
      )
    );
}

export async function getAllDjEnrollments() {
  const snap = await getDocs(collection(db, "dj_class_enrollments"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getEnrollmentsByOffering(offeringId) {
  if (!offeringId) return [];
  const q = query(
    collection(db, "dj_class_enrollments"),
    where("offering_id", "==", offeringId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createDjClassOffering({
  class_key = "come",
  class_name = "Come",
  class_title = "",
  facilitator_id = "",
  facilitator_name = "",
  facilitator_email = "",
  registration_open_date = "",
  registration_close_date = "",
  is_hidden = false
} = {}) {
  const key = normalizeDjKey(class_key || class_name);
  const label = class_name || (key.charAt(0).toUpperCase() + key.slice(1));
  const chapterList = (DEFAULT_DJ_CHAPTERS[key] || DEFAULT_DJ_CHAPTERS.come).map((title, idx) => ({
    chapter_no: idx + 1,
    title,
    completed: false,
    completed_date: ""
  }));

  const payload = {
    class_key: key,
    class_name: label,
    class_title: class_title || `${label} Class`,
    facilitator_id,
    facilitator_name,
    facilitator_email,
    registration_open_date: registration_open_date || getAucklandTodayISO(),
    registration_close_date: registration_close_date || "",
    registration_manually_closed: false,
    status: "open",
    is_active: true,
    is_hidden: Boolean(is_hidden),
    chapters: chapterList,
    created_at_iso: getAucklandTodayISO(),
    created_at: serverTimestamp()
  };

  const ref = await addDoc(collection(db, "dj_class_offerings"), payload);
  return { id: ref.id, ...payload };
}

export async function updateDjClassOffering(offeringId, updates = {}) {
  if (!offeringId) throw new Error("Missing offering ID.");
  const ref = doc(db, "dj_class_offerings", offeringId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("DJ class offering not found.");

  const current = snap.data();
  const nextKey = updates.class_key
    ? normalizeDjKey(updates.class_key)
    : normalizeDjKey(current.class_key || current.class_name);
  const nextName = nextKey.charAt(0).toUpperCase() + nextKey.slice(1);

  const patch = {
    class_key: nextKey,
    class_name: nextName,
    class_title: String(updates.class_title ?? current.class_title ?? `${nextName} Class`).trim(),
    facilitator_id: String(updates.facilitator_id ?? current.facilitator_id ?? "").trim(),
    facilitator_name: String(updates.facilitator_name ?? current.facilitator_name ?? "").trim(),
    facilitator_email: String(updates.facilitator_email ?? current.facilitator_email ?? "").trim(),
    registration_open_date: String(updates.registration_open_date ?? current.registration_open_date ?? "").trim(),
    registration_close_date: String(updates.registration_close_date ?? current.registration_close_date ?? "").trim(),
    updated_at: serverTimestamp()
  };

  if (typeof updates.is_hidden === "boolean") {
    patch.is_hidden = updates.is_hidden;
  }

  await updateDoc(ref, patch);
  return { id: offeringId, ...current, ...patch };
}

export async function setDjRegistrationClosed(offeringId, closed = true) {
  if (!offeringId) return;
  await updateDoc(doc(db, "dj_class_offerings", offeringId), {
    registration_manually_closed: Boolean(closed),
    status: closed ? "closed" : "open",
    is_active: true,
    updated_at: serverTimestamp()
  });
}

export async function setDjOfferingHidden(offeringId, hidden = true) {
  if (!offeringId) return;
  await updateDoc(doc(db, "dj_class_offerings", offeringId), {
    is_hidden: Boolean(hidden),
    updated_at: serverTimestamp()
  });
}

export async function setDjOfferingDisabled(offeringId, disabled = true) {
  if (!offeringId) return;
  await updateDoc(doc(db, "dj_class_offerings", offeringId), {
    status: disabled ? "disabled" : "open",
    is_active: !disabled,
    registration_manually_closed: Boolean(disabled),
    updated_at: serverTimestamp()
  });
}

export async function registerDiscipleToDjClass({ offering, disciple, allEnrollments = [] }) {
  if (!offering?.id || !disciple?.id) {
    throw new Error("Missing offering or disciple information.");
  }
  if (isDjOfferingDisabled(offering)) {
    throw new Error("This DJ class is currently disabled.");
  }

  const existing = allEnrollments.find(
    e => e.offering_id === offering.id && e.disciple_id === disciple.id
  );
  if (existing) {
    return { alreadyRegistered: true, enrollment: existing };
  }

  const levelKey = normalizeDjKey(offering.class_key || offering.class_name);
  const enrollmentPayload = {
    offering_id: offering.id,
    class_key: levelKey,
    class_name: offering.class_name || levelKey.toUpperCase(),
    class_title: offering.class_title || "",
    disciple_id: disciple.id,
    disciple_name: disciple.full_name || "Member",
    disciple_email: disciple.email || "",
    status: "Enrolled",
    enrolled_at_iso: getAucklandTodayISO(),
    created_at: serverTimestamp()
  };

  const enrRef = await addDoc(collection(db, "dj_class_enrollments"), enrollmentPayload);

  const currentProg = String(disciple?.dj_progress?.[levelKey] || "").toLowerCase();
  if (currentProg !== "completed") {
    await updateDoc(doc(db, "disciples", disciple.id), {
      [`dj_progress.${levelKey}`]: "In Progress",
      updated_at: serverTimestamp()
    }).catch(() => {});
  }

  return {
    alreadyRegistered: false,
    enrollment: { id: enrRef.id, ...enrollmentPayload }
  };
}

export async function updateDjChapterCompletion({
  offeringId,
  chapterIndex,
  completed,
  completedDate = getAucklandTodayISO()
}) {
  const offeringRef = doc(db, "dj_class_offerings", offeringId);
  const snap = await getDoc(offeringRef);
  if (!snap.exists()) throw new Error("DJ class offering not found.");

  const data = snap.data();
  const chapters = Array.isArray(data.chapters) ? [...data.chapters] : [];
  if (!chapters[chapterIndex]) throw new Error("Chapter not found.");

  chapters[chapterIndex] = {
    ...chapters[chapterIndex],
    completed: Boolean(completed),
    completed_date: completed ? completedDate : ""
  };

  const allCompleted = chapters.length > 0 && chapters.every(ch => ch.completed === true);
  const nextStatus = allCompleted
    ? "completed"
    : isDjOfferingDisabled(data)
    ? "disabled"
    : data.registration_manually_closed
    ? "closed"
    : "open";

  await updateDoc(offeringRef, {
    chapters,
    status: nextStatus,
    updated_at: serverTimestamp()
  });

  if (allCompleted) {
    const levelKey = normalizeDjKey(data.class_key || data.class_name);
    const enrollments = await getEnrollmentsByOffering(offeringId);
    for (const enr of enrollments) {
      await updateDoc(doc(db, "dj_class_enrollments", enr.id), {
        status: "Completed",
        completed_date: completedDate,
        updated_at: serverTimestamp()
      }).catch(() => {});

      if (enr.disciple_id) {
        await updateDoc(doc(db, "disciples", enr.disciple_id), {
          [`dj_progress.${levelKey}`]: "Completed",
          updated_at: serverTimestamp()
        }).catch(() => {});
      }
    }
  }

  return { allCompleted, chapters, status: nextStatus };
}
