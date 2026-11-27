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
export function isDjLevelCompleted(disciple = {}, classKey = "", allEnrollments = []) {
  const key = normalizeDjKey(classKey);
  const prog = disciple?.dj_progress || {};
  const map = {
    come: prog.come || prog.dj1 || "",
    grow: prog.grow || prog.dj2 || "",
    serve: prog.serve || prog.dj3 || "",
    lead: prog.lead || prog.dj4 || ""
  };
  if (String(map[key] || "").trim().toLowerCase() === "completed") {
    return true;
  }

  return Array.isArray(allEnrollments) && allEnrollments.some(
    enr =>
      enr.disciple_id === disciple?.id &&
      normalizeDjKey(enr.class_key || enr.class_name || enr.level || "") === key &&
      String(enr.status || "").trim().toLowerCase() === "completed"
  );
}

/**
 * Mengecek apakah seluruh jenjang DJ (Come -> Grow -> Serve -> Lead) sudah Completed.
 */
export function hasCompletedAllDjLevels(disciple = {}, allEnrollments = []) {
  return DJ_LEVEL_ORDER.every(lvlKey => isDjLevelCompleted(disciple, lvlKey, allEnrollments));
}

/**
 * Validasi kelayakan pendaftaran:
 * 1. Jika semua level DJ (Come -> Grow -> Serve -> Lead) sudah Completed -> tolak & beri notifikasi.
 * 2. Jika level target sudah Completed -> tolak & beri notifikasi.
 * 3. Jika prasyarat level sebelumnya belum Completed -> tolak & beri notifikasi.
 */
export function checkDjPrerequisite(disciple = {}, targetClassKey = "", allEnrollments = []) {
  const key = normalizeDjKey(targetClassKey);
  const targetLabel = key ? key.toUpperCase() : "DJ";

  if (hasCompletedAllDjLevels(disciple, allEnrollments)) {
    return {
      allowed: false,
      reason: "all_completed",
      missingLevelKey: null,
      message: "You have already completed all Discipleship Journey (DJ) classes (COME → GROW → SERVE → LEAD). You cannot enroll in additional DJ classes."
    };
  }

  if (key && isDjLevelCompleted(disciple, key, allEnrollments)) {
    return {
      allowed: false,
      reason: "already_completed",
      missingLevelKey: null,
      message: `You have already completed DJ ${targetLabel}. You cannot enroll in DJ ${targetLabel} again.`
    };
  }

  const idx = DJ_LEVEL_ORDER.indexOf(key);
  if (idx <= 0) {
    return { allowed: true, reason: null, missingLevelKey: null, message: "" };
  }

  for (let i = 0; i < idx; i++) {
    const reqKey = DJ_LEVEL_ORDER[i];
    const completed = isDjLevelCompleted(disciple, reqKey, allEnrollments);

    if (!completed) {
      const reqLabel = reqKey.toUpperCase();
      return {
        allowed: false,
        reason: "missing_prerequisite",
        missingLevelKey: reqKey,
        message: `Pre-requisite required: You must complete DJ ${reqLabel} before enrolling in DJ${targetLabel}.`
      };
    }
  }

  return { allowed: true, reason: null, missingLevelKey: null, message: "" };
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
    class_title: String(class_title || `${label} Class`).trim(), facilitator_id: String(facilitator_id \vert{}\vert{} "").trim(), facilitator_name: String(facilitator_name \vert{}\vert{} "").trim(), facilitator_email: String(facilitator_email \vert{}\vert{} "").trim().toLowerCase(), registration_open_date: registration_open_date \vert{}\vert{} todayISO, registration_close_date: registration_close_date \vert{}\vert{} "", registration_manually_closed: false, class_start_date: class_start_date \vert{}\vert{} "", status: "Open", created_at_iso: todayISO, chapters: normalizedChapters, created_at: serverTimestamp(), updated_at: serverTimestamp() };  const ref = await addDoc(collection(db, COL_OFFERINGS), payload); return { id: ref.id, ...payload }; }  export async function setDjRegistrationClosed(offeringId, closed = true) { if (!offeringId) return; await updateDoc(doc(db, COL_OFFERINGS, offeringId), { registration_manually_closed: Boolean(closed), updated_at: serverTimestamp() }); }  export async function startDjClassOffering(offeringId, startDate = getAucklandTodayISO()) { if (!offeringId) return; await updateDoc(doc(db, COL_OFFERINGS, offeringId), { status: "Ongoing", class_start_date: startDate, registration_manually_closed: true, updated_at: serverTimestamp() }); }  export async function deleteDjClassOffering(offeringId) { if (!offeringId) return; await deleteDoc(doc(db, COL_OFFERINGS, offeringId)); }  export async function registerDiscipleToDjClass({ offering, disciple, allEnrollments = [] }) { if (!offering?.id) throw new Error("Class offering not found."); if (!disciple?.id) throw new Error("Disciple profile is required to register.");  if (!isRegistrationOpen(offering)) { throw new Error("Registration for this DJ class is already closed."); }  const prereq = checkDjPrerequisite(disciple, offering.class_key \vert{}\vert{} offering.class_name \vert{}\vert{} offering.level, allEnrollments); if (!prereq.allowed) { throw new Error(prereq.message); }  const already = (allEnrollments \vert{}\vert{} []).find( e => e.offering_id === offering.id && e.disciple_id === disciple.id ); if (already) { return { alreadyRegistered: true, enrollment: already }; }  const payload = { offering_id: offering.id, class_key: normalizeDjKey(offering.class_key \vert{}\vert{} offering.class_name \vert{}\vert{} offering.level), class_name: offering.class_name \vert{}\vert{} offering.level \vert{}\vert{} "Come", disciple_id: disciple.id, disciple_name: disciple.full_name \vert{}\vert{} "Member", disciple_email: String(disciple.email \vert{}\vert{} "").trim().toLowerCase(), disciple_phone: disciple.phone \vert{}\vert{} "", status: "Enrolled", completed_date: "", created_at: serverTimestamp(), updated_at: serverTimestamp() };  const ref = await addDoc(collection(db, COL_ENROLLMENTS), payload);  const key = normalizeDjKey(offering.class_key \vert{}\vert{} offering.class_name \vert{}\vert{} offering.level); const currVal = String(disciple?.dj_progress?.[key] \vert{}\vert{} "").toLowerCase(); if (currVal !== "completed") { const nextProg = { ...(disciple.dj_progress \vert{}\vert{} {}), [key]: "In Progress" }; await setDoc(doc(db, COL_DISCIPLES, disciple.id), { dj_progress: nextProg, dj_traffic_light: computeTrafficLightFromProgress(nextProg), updated_at: serverTimestamp() }, { merge: true }); }  return { alreadyRegistered: false, enrollment: { id: ref.id, ...payload } }; }  export async function updateDjChapterCompletion({ offeringId, chapterIndex, completed, completedDate = "" }) { const offRef = doc(db, COL_OFFERINGS, offeringId); const snap = await getDoc(offRef); if (!snap.exists()) throw new Error("DJ Class offering not found.");  const offering = { id: snap.id, ...snap.data() }; const chapters = Array.isArray(offering.chapters) ? [...offering.chapters] : []; if (!chapters[chapterIndex]) throw new Error("Chapter not found.");  const isDone = Boolean(completed); const finalDate = isDone ? (String(completedDate \vert{}\vert{} "").trim() \vert{}\vert{} getAucklandTodayISO()) : "";  chapters[chapterIndex] = { ...chapters[chapterIndex], completed: isDone, completed_date: finalDate };  const allCompleted = chapters.length > 0 && chapters.every(ch => ch.completed === true); const nextStatus = allCompleted ? "Completed" : (offering.status === "Completed" ? "Ongoing" : (offering.status \vert{}\vert{} "Ongoing"));  await updateDoc(offRef, { chapters, status: nextStatus, completed_at_iso: allCompleted ? (finalDate \vert{}\vert{} getAucklandTodayISO()) : "", updated_at: serverTimestamp() });  if (allCompleted) { const key = normalizeDjKey(offering.class_key \vert{}\vert{} offering.class_name \vert{}\vert{} offering.level); const enrollments = await getEnrollmentsByOffering(offeringId);  for (const enr of enrollments) { await updateDoc(doc(db, COL_ENROLLMENTS, enr.id), { status: "Completed", completed_date: finalDate \vert{}\vert{} getAucklandTodayISO(), updated_at: serverTimestamp() });  if (enr.disciple_id && key) { const discRef = doc(db, COL_DISCIPLES, enr.disciple_id); const discSnap = await getDoc(discRef); if (discSnap.exists()) { const discData = discSnap.data(); const nextProg = { ...(discData.dj_progress \vert{}\vert{} {}), [key]: "Completed" }; await setDoc(discRef, { dj_progress: nextProg, dj_traffic_light: "green", updated_at: serverTimestamp() }, { merge: true }); } } } }  return { offering: { ...offering, chapters, status: nextStatus }, allCompleted }; } ```  ---  ### Kode Lengkap `js/ui-portal.js`  ```javascript // js/ui-portal.js import { db } from "./firebase-config.js"; import { collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; import * as dbPortal from "./db-portal.js"; import { getDailyReflections, seedNov20toDec31Reflections } from "./db-content.js"; import { getAssignmentsByDate, upsertAssignment, deleteAssignment, getUnavailability, addUnavailability, deleteUnavailability } from "./db-roster.js"; import { getDepartments, getRolesReference, getDisciples } from "./db-master.js"; import { DJ_LEVEL_ORDER, normalizeDjKey, getAucklandTodayISO, isRegistrationOpen, checkDjPrerequisite, getAllDjOfferings, getAllDjEnrollments, getEnrollmentsByOffering, createDjClassOffering, setDjRegistrationClosed, registerDiscipleToDjClass, updateDjChapterCompletion } from "./db-dj-class.js";  const { getPublicMonthlyThemes, getPublicWeeklyInsights, getMyAssignments, respondToAssignment, getMyUnavailability, updateMyContactProfile } = dbPortal;  const DEFAULT_CHURCH_PROFILE = { church_id: "ifgf_palmy", name: "IFGF Palmerston North", address: "Palmerston North, New Zealand", service_day: "Sunday", service_time: "4:30 PM", timezone: "Pacific/Auckland", website_url: "https://ifgfpalmy.org" };  const LEGACY_SINGER_NAMES = ["Singer 1", "Singer 2", "Singer 3"];  function isUniversalSharedTask(role = {}) { if (role?.is_universal === true) return true; const n = String(role?.role_name \vert{}\vert{} role?.name \vert{}\vert{} role \vert{}\vert{} "").toLowerCase(); return n.includes("cuci piring") \vert{}\vert{} n.includes("vacuum"); }  function isLeadershipRoleName(roleName = "") { const n = String(roleName \vert{}\vert{} "").trim().toLowerCase(); return n.startsWith("head of dept") \vert{}\vert{} n.startsWith("lead of dept"); }  function normKey(val = "") { return String(val \vert{}\vert{} "") .toLowerCase() .replace(/[^a-z0-9]+/g, "_") .replace(/^_\vert{}_$/g, ""); }  function normalizeEmailList(val) { if (!val) return []; if (Array.isArray(val)) { return val.map(e => String(e \vert{}\vert{} "").trim().toLowerCase()).filter(Boolean); } return String(val \vert{}\vert{} "") .split(/[,;\n]+/) .map(e => e.trim().toLowerCase()) .filter(Boolean); }  function getRoleSlotsCount(role) { const raw = Number(role?.slots_count); if (Number.isFinite(raw) && raw >= 1) return Math.min(20, Math.floor(raw)); if (/^singer$/i.test(String(role?.role_name \vert{}\vert{} role?.name \vert{}\vert{} "").trim())) return 3; return 1; }  function buildRoleSlots(role) { const count = getRoleSlotsCount(role); const baseName = String(role?.role_name \vert{}\vert{} role?.name \vert{}\vert{} "Role").trim(); if (count <= 1) { return [{ slotIndex: 1, slotsCount: 1, slotKey: role.id, displayLabel: baseName }]; } return Array.from({ length: count }, (_, idx) => { const num = idx + 1; return { slotIndex: num, slotsCount: count, slotKey: `${role.id}__${num}`, displayLabel: `${baseName} ${num}` }; }); }  function roleMatchesDept(role, dept) { const deptKeys = new Set([normKey(dept.id), normKey(dept.name)].filter(Boolean)); const roleKeys = [ normKey(role.department_id), normKey(role.dept_id), normKey(role.dept_name), normKey(role.department_name) ].filter(Boolean); return roleKeys.some(k => deptKeys.has(k)); }  async function fetchSelectableMinistryRoles() { try { const [depts, roles] = await Promise.all([ getDepartments().catch(() => []), getRolesReference().catch(() => []) ]);  const deptMap = new Map(); depts.forEach((d, idx) => { deptMap.set(d.id, { name: d.name \vert{}\vert{} d.id, sort_order: Number(d.sort_order) \vert{}\vert{} idx + 1, is_active: d.is_active !== false }); });  return roles .filter(r => r.is_active !== false && r.active !== false) .map((r, idx) => { const label = String(r.role_name \vert{}\vert{} r.name \vert{}\vert{} "").trim(); const deptInfo = deptMap.get(r.department_id); return { ...r, _label: label, _deptName: deptInfo?.name \vert{}\vert{} r.dept_name \vert{}\vert{} "General Ministry", _deptOrder: deptInfo?.sort_order ?? 999, _roleOrder: Number(r.sort_order) \vert{}\vert{} idx + 1, _isUniversal: isUniversalSharedTask(r) }; }) .filter(r => Boolean(r._label) && !isLeadershipRoleName(r._label)) .sort((a, b) => { if (a._isUniversal !== b._isUniversal) return a._isUniversal ? 1 : -1; if (a._deptOrder !== b._deptOrder) return a._deptOrder - b._deptOrder; if (a._roleOrder !== b._roleOrder) return a._roleOrder - b._roleOrder; return a._label.localeCompare(b._label); }); } catch (err) { console.warn("fetchSelectableMinistryRoles error:", err); return []; } }  async function fetchChurchProfile() { try { const snap = await getDoc(doc(db, "church_profile", "ifgf_palmy")); if (snap.exists()) { return { ...DEFAULT_CHURCH_PROFILE, ...snap.data() }; } } catch (err) { console.warn("Using default church profile fallback:", err); } return { ...DEFAULT_CHURCH_PROFILE }; }  async function fetchAnnouncements() { try { const snap = await getDocs(collection(db, "announcements")); return snap.docs .map(d => ({ id: d.id, ...d.data() })) .filter(a => a.is_active !== false) .sort((a, b) => { const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0); if (pinDiff !== 0) return pinDiff; const dateA = String(a.announcement_date \vert{}\vert{} a.created_at_iso \vert{}\vert{} ""); const dateB = String(b.announcement_date \vert{}\vert{} b.created_at_iso \vert{}\vert{} ""); return dateB.localeCompare(dateA); }); } catch (err) { console.warn("fetchAnnouncements fallback:", err); return []; } }  async function fetchHubSnapshotCounts() { try { const [discSnap, deptSnap, roleSnap] = await Promise.all([ getDocs(collection(db, "disciples")).catch(() => null), getDocs(collection(db, "departments")).catch(() => null), getDocs(collection(db, "roles_reference")).catch(() => null) ]);  const activeDisciples = discSnap ? discSnap.docs.filter(d => (d.data().status \vert{}\vert{} "Active") === "Active").length : 0; const totalDisciples = discSnap ? discSnap.size : 0; const departmentsCount = deptSnap ? deptSnap.docs.filter(d => d.data().active !== false && d.data().is_active !== false).length : 0; const rolesCount = roleSnap ? roleSnap.docs.filter(d => d.data().active !== false && d.data().is_active !== false).length : 0;  return { activeDisciples, totalDisciples, departmentsCount, rolesCount }; } catch (err) { console.warn("fetchHubSnapshotCounts fallback:", err); return { activeDisciples: 0, totalDisciples: 0, departmentsCount: 0, rolesCount: 0 }; } }  async function fetchPublicDailyReflections() { if (typeof dbPortal.getPublicDailyReflections === "function") { const items = await dbPortal.getPublicDailyReflections(); if (items && items.length > 0) return items; } if (typeof dbPortal.getPublicDailyDevotions === "function") { const items = await dbPortal.getPublicDailyDevotions(); if (items && items.length > 0) return items; } return await getDailyReflections(); }  let portalState = { profile: null, churchProfile: { ...DEFAULT_CHURCH_PROFILE }, announcements: [], snapshot: { activeDisciples: 0, totalDisciples: 0, departmentsCount: 0, rolesCount: 0 }, selectableRoles: [], months: [], weeks: [], reflections: [], djOfferings: [], allDjEnrollments: [], selectedDjOfferingId: "", selectedDjEnrollments: [], myDuties: [], myBlockouts: [], allDepartments: [], allRoles: [], allDisciples: [], allUnavailability: [], managedDepartments: [], selectedRosterDate: "", dateAssignments: [], publicEventsBound: false, memberEventsBound: false };  function esc(str = "") { return String(str \vert{}\vert{} "") .replace(/&/g, "&amp;") .replace(/</g, "&lt;") .replace(/>/g, "&gt;") .replace(/"/g, "&quot;"); }  function isSystemAdminUser() { const level = String(portalState.profile?.accessLevel \vert{}\vert{} "").toLowerCase(); const sysRole = String( portalState.profile?.system_role \vert{}\vert{} portalState.profile?.discipleDoc?.system_role \vert{}\vert{} portalState.profile?.role \vert{}\vert{} "" ).toLowerCase(); return level === "super_admin" \vert{}\vert{} sysRole === "super_admin"; }  function canManageChurchPortal() { const level = String(portalState.profile?.accessLevel \vert{}\vert{} "").toLowerCase(); const sysRole = String( portalState.profile?.system_role \vert{}\vert{} portalState.profile?.discipleDoc?.system_role \vert{}\vert{} portalState.profile?.role \vert{}\vert{} "" ).toLowerCase(); return ( level === "super_admin" \vert{}\vert{} level === "coordinator" \vert{}\vert{} sysRole === "super_admin" \vert{}\vert{} sysRole === "coordinator" \vert{}\vert{} portalState.profile?.isAdmin === true ); }  function canManageDjClasses() { if (canManageChurchPortal()) return true; const interests = portalState.profile?.discipleDoc?.ministry_interests; if (!Array.isArray(interests)) return false; return interests.some(item => { const s = String(item \vert{}\vert{} "").toLowerCase(); return s.includes("dj facilitator") \vert{}\vert{} s.includes("facilitator"); }); }  function getPrereqLabelForLevel(levelKey) { const idx = DJ_LEVEL_ORDER.indexOf(normalizeDjKey(levelKey)); if (idx <= 0) return "None"; return DJ_LEVEL_ORDER[idx - 1].toUpperCase(); }  function getFacilitatorDisplayName(offering = {}) { const name = String(offering.facilitator_name \vert{}\vert{} "").trim(); if (name) return name; const email = String(offering.facilitator_email \vert{}\vert{} "").trim(); if (email) return email; return "TBA"; }  function resolveManagedDepartments(discipleDoc, departments) { const activeDepts = departments.filter(d => d.active !== false && d.is_active !== false); if (isSystemAdminUser() \vert{}\vert{} canManageChurchPortal()) { return activeDepts; }  const email = String( discipleDoc?.email \vert{}\vert{} portalState.profile?.email \vert{}\vert{} "" ).trim().toLowerCase();  const interests = Array.isArray(discipleDoc?.ministry_interests) ? discipleDoc.ministry_interests.map(i => String(i \vert{}\vert{} "").trim().toLowerCase()) : [];  return activeDepts.filter(dept => { const leads = normalizeEmailList(dept.lead_emails \vert{}\vert{} dept.lead_email \vert{}\vert{} dept.head_email); if (email && leads.includes(email)) return true;  const deptNameLower = String(dept.name \vert{}\vert{} "").trim().toLowerCase(); if (!deptNameLower) return false;  return interests.some(item => (item.startsWith("head of dept") \vert{}\vert{} item.startsWith("lead of dept")) && item.includes(deptNameLower) ); }); }  async function resolveDiscipleForCurrentUser(profile) { if (profile?.discipleDoc) return profile.discipleDoc;  const email = String(profile?.email \vert{}\vert{} "").trim().toLowerCase(); const displayName = String(profile?.displayName \vert{}\vert{} profile?.name \vert{}\vert{} "").trim().toLowerCase();  try { const snap = await getDocs(collection(db, "disciples")); const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));  if (email) { const byEmail = all.find(d => String(d.email \vert{}\vert{} "").trim().toLowerCase() === email); if (byEmail) return byEmail; }  if (displayName) { const byName = all.find(d => String(d.full_name \vert{}\vert{} "").trim().toLowerCase() === displayName); if (byName) return byName; } } catch (err) { console.warn("resolveDiscipleForCurrentUser lookup skipped:", err); }  if (isSystemAdminUser() \vert{}\vert{} canManageChurchPortal()) { return { id: profile?.uid \vert{}\vert{} "system_admin", member_id: "SUPER_ADMIN", full_name: profile?.displayName \vert{}\vert{} profile?.name \vert{}\vert{} "System Admin", email: profile?.email \vert{}\vert{} "", phone: "", address: "", system_role: "super_admin", dj_traffic_light: "green", ministry_interests: [], _isAdminFallback: true }; }  return null; }  // --- 1. CHURCH PORTAL INITIALIZER (GUEST & LOGGED-IN) --- export async function initPublicPortal() { try { let [churchProfile, announcements, snapshot, months, weeks, reflections, djOfferings, allDjEnrollments] = await Promise.all([ fetchChurchProfile(), fetchAnnouncements(), fetchHubSnapshotCounts(), getPublicMonthlyThemes(), getPublicWeeklyInsights(), fetchPublicDailyReflections(), getAllDjOfferings().catch(() => []), getAllDjEnrollments().catch(() => []) ]);  if (reflections.length === 0) { try { await seedNov20toDec31Reflections(); reflections = await fetchPublicDailyReflections(); } catch (seedErr) { console.warn("Auto-seed Daily Reflections skipped:", seedErr); } }  portalState.churchProfile = churchProfile; portalState.announcements = announcements; portalState.snapshot = snapshot; portalState.months = months; portalState.weeks = weeks; portalState.reflections = reflections; portalState.djOfferings = djOfferings; portalState.allDjEnrollments = allDjEnrollments;  bindPublicPortalEvents(); renderPublicFeed(); } catch (err) { console.error("Church portal load error:", err); } }  function bindPublicPortalEvents() { if (portalState.publicEventsBound) return; portalState.publicEventsBound = true;  const panel = document.getElementById("panel-public"); if (!panel) return;  panel.addEventListener("submit", async (e) => { if (e.target.id === "form-announcement") { e.preventDefault(); if (!canManageChurchPortal()) return;  const title = document.getElementById("ann-title")?.value.trim() \vert{}\vert{} ""; const category = document.getElementById("ann-category")?.value \vert{}\vert{} "General"; const body = document.getElementById("ann-body")?.value.trim() \vert{}\vert{} ""; const pinned = Boolean(document.getElementById("ann-pinned")?.checked); if (!title \vert{}\vert{} !body) return;  const submitBtn = e.target.querySelector('button[type="submit"]'); if (submitBtn) submitBtn.disabled = true;  try { await addDoc(collection(db, "announcements"), { church_id: portalState.churchProfile.church_id \vert{}\vert{} "ifgf_palmy", title, category, body, pinned, announcement_date: getAucklandTodayISO(), author_name: portalState.profile?.displayName \vert{}\vert{} "Admin", is_active: true, created_at: serverTimestamp() }); e.target.reset(); portalState.announcements = await fetchAnnouncements(); renderAnnouncementBoard(); } catch (err) { alert("Failed to post announcement: " + (err?.message \vert{}\vert{} err)); } finally { if (submitBtn) submitBtn.disabled = false; } }  if (e.target.id === "form-church-profile") { e.preventDefault(); if (!canManageChurchPortal()) return;  const payload = { church_id: "ifgf_palmy", name: document.getElementById("cp-name")?.value.trim() \vert{}\vert{} "IFGF Palmerston North", service_day: document.getElementById("cp-day")?.value.trim() \vert{}\vert{} "Sunday", service_time: document.getElementById("cp-time")?.value.trim() \vert{}\vert{} "4:30 PM", address: document.getElementById("cp-address")?.value.trim() \vert{}\vert{} "Palmerston North, New Zealand", website_url: document.getElementById("cp-website")?.value.trim() \vert{}\vert{} "https://ifgfpalmy.org", timezone: "Pacific/Auckland", updated_at: serverTimestamp() };  try { await setDoc(doc(db, "church_profile", "ifgf_palmy"), payload, { merge: true }); portalState.churchProfile = { ...portalState.churchProfile, ...payload }; document.getElementById("church-profile-editor")?.classList.add("hidden"); renderPublicFeed(); if (portalState.profile?.discipleDoc) { renderMyDuties(); } } catch (err) { alert("Failed to save church profile: " + (err?.message \vert{}\vert{} err)); } }  if (e.target.id === "form-create-dj-offering") { e.preventDefault(); if (!canManageDjClasses()) { alert("Only DJ Facilitators or Admins can open a new DJ class."); return; }  const rawLevel = document.getElementById("dj-new-level")?.value \vert{}\vert{} "come"; const classKey = normalizeDjKey(rawLevel); const className = classKey.charAt(0).toUpperCase() + classKey.slice(1); const classTitle = document.getElementById("dj-new-title")?.value.trim() \vert{}\vert{} ""; const openDate = document.getElementById("dj-new-open")?.value \vert{}\vert{} getAucklandTodayISO(); const closeDate = document.getElementById("dj-new-close")?.value \vert{}\vert{} "";  const facilitatorName = portalState.profile?.discipleDoc?.full_name \vert{}\vert{} portalState.profile?.displayName \vert{}\vert{} portalState.profile?.name \vert{}\vert{} "Facilitator"; const facilitatorEmail = portalState.profile?.discipleDoc?.email \vert{}\vert{} portalState.profile?.email \vert{}\vert{} "";  const submitBtn = e.target.querySelector('button[type="submit"]'); if (submitBtn) submitBtn.disabled = true;  try { const created = await createDjClassOffering({ class_key: classKey, class_name: className, class_title: classTitle, facilitator_id: portalState.profile?.discipleDoc?.id \vert{}\vert{} portalState.profile?.uid \vert{}\vert{} "", facilitator_name: facilitatorName, facilitator_email: facilitatorEmail, registration_open_date: openDate, registration_close_date: closeDate }); e.target.reset(); const openEl = document.getElementById("dj-new-open"); if (openEl) openEl.value = getAucklandTodayISO();  portalState.djOfferings = await getAllDjOfferings().catch(() => []); if (created?.id) portalState.selectedDjOfferingId = created.id; renderPublicDjClasses(); if (portalState.profile?.discipleDoc) { await loadSelectedDjEnrollments(); renderDjFacilitatorTeachingPanel(); } } catch (err) { alert("Failed to create DJ class: " + (err?.message \vert{}\vert{} err)); } finally { if (submitBtn) submitBtn.disabled = false; } } });  panel.addEventListener("click", async (e) => { const toggleProfileBtn = e.target.closest("#btn-toggle-church-profile"); if (toggleProfileBtn) { document.getElementById("church-profile-editor")?.classList.toggle("hidden"); return; }  const delAnnBtn = e.target.closest("button[data-delete-ann]"); if (delAnnBtn) { if (!canManageChurchPortal()) return; const annId = delAnnBtn.dataset.deleteAnn; if (!annId \vert{}\vert{} !confirm("Delete this announcement?")) return; delAnnBtn.disabled = true; try { await deleteDoc(doc(db, "announcements", annId)); portalState.announcements = portalState.announcements.filter(a => a.id !== annId); renderAnnouncementBoard(); } catch (err) { delAnnBtn.disabled = false; alert("Failed to delete announcement: " + (err?.message \vert{}\vert{} err)); } return; }  const jumpBtn = e.target.closest("button[data-jump-tab]"); if (jumpBtn) { const targetTab = jumpBtn.dataset.jumpTab; const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
      if (tabBtn && !tabBtn.classList.contains("hidden")) {
        tabBtn.click();
      }
      return;
    }

    const enrollBtn = e.target.closest("button[data-enroll-dj]");
    if (enrollBtn) {
      const offeringId = enrollBtn.dataset.enrollDj;
      const discipleDoc = portalState.profile?.discipleDoc;

      if (!discipleDoc || discipleDoc._isAdminFallback) {
        alert("Please sign in with a registered disciple member account to enroll in a DJ class.");
        return;
      }

      const offering = portalState.djOfferings.find(o => o.id === offeringId);
      if (!offering) {
        alert("DJ class offering not found.");
        return;
      }

      const prereqCheck = checkDjPrerequisite(
        discipleDoc,
        offering.class_key || offering.class_name || offering.level,
        portalState.allDjEnrollments
      );
      if (!prereqCheck.allowed) {
        alert(prereqCheck.message);
        return;
      }

      enrollBtn.disabled = true;
      try {
        const res = await registerDiscipleToDjClass({
          offering,
          disciple: discipleDoc,
          allEnrollments: portalState.allDjEnrollments
        });

        portalState.allDjEnrollments = await getAllDjEnrollments().catch(() => []);
        if (res?.alreadyRegistered) {
          alert(`You are already enrolled in ${offering.class_title || offering.class_name || "this DJ class"}.`);
        } else {
          const levelKey = normalizeDjKey(offering.class_key || offering.class_name || offering.level);
          if (res?.enrollment?.id) {
            portalState.profile.discipleDoc = {
              ...discipleDoc,
              dj_progress: {
                ...(discipleDoc.dj_progress || {}),
                [levelKey]:
                  String(discipleDoc?.dj_progress?.[levelKey] || "").toLowerCase() === "completed"
                    ? "Completed"
                    : "In Progress"
              }
            };
          }
          alert(`Successfully enrolled in ${offering.class_title || offering.class_name || "DJ Class"}!`);
        }

        renderPublicDjClasses();
        if (portalState.selectedDjOfferingId === offeringId) {
          await loadSelectedDjEnrollments();
          renderDjFacilitatorTeachingPanel();
        }
      } catch (err) {
        alert(err?.message || "Failed to enroll in DJ class.");
      } finally {
        enrollBtn.disabled = false;
      }
    }
  });
}

function renderAnnouncementBoard() {
  const listEl = document.getElementById("church-announcements-list");
  if (!listEl) return;

  const isManager = canManageChurchPortal();
  const items = portalState.announcements;

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
        No internal announcements posted yet.
      </div>
    `;
    return;
  }

  const categoryBadge = (cat) => {
    const c = String(cat || "General").toLowerCase();
    if (c.includes("roster")) return "bg-blue-50 text-blue-800 border-blue-200";
    if (c.includes("service")) return "bg-amber-50 text-amber-900 border-amber-200";
    if (c.includes("urgent")) return "bg-red-50 text-red-800 border-red-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  listEl.innerHTML = items.map(a => `
    <div class="p-3.5 rounded-xl border ${a.pinned ? "border-amber-300 bg-amber-50/40" : "border-slate-200 bg-white"} space-y-1.5 text-xs">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${a.pinned ? `<span class="px-2 py-0.5 bg-amber-400 text-slate-950 font-extrabold rounded text-[10px]">PINNED</span>` : ""}
          <span class="px-2 py-0.5 border rounded font-semibold text-[10px] ${categoryBadge(a.category)}">${esc(a.category || "General")}</span>
          <span class="font-mono text-[11px] text-slate-500">${esc(a.announcement_date || "")}</span>
        </div>
        ${isManager ? `<button type="button" data-delete-ann="${esc(a.id)}" class="text-red-600 hover:underline font-semibold shrink-0">Delete</button>` : ""}
      </div>
      <h4 class="font-bold text-sm text-slate-900">${esc(a.title)}</h4>
      <p class="text-slate-700 whitespace-pre-line leading-relaxed">${esc(a.body)}</p>${a.author_name ? `<p class="text-[11px] text-slate-400">Posted by ${esc(a.author_name)}</p>` : ""}
    </div>
  `).join("");
}

function renderPublicDjClasses() {
  const container = document.getElementById("public-dj-classes-section");
  if (!container) return;

  const todayISO = getAucklandTodayISO();
  const canCreate = canManageDjClasses();
  const offerings = [...portalState.djOfferings].sort((a, b) => {
    const openA = isRegistrationOpen(a, todayISO) ? 0 : 1;
    const openB = isRegistrationOpen(b, todayISO) ? 0 : 1;
    if (openA !== openB) return openA - openB;
    return String(b.created_at_iso || b.registration_open_date || "").localeCompare(
      String(a.created_at_iso || a.registration_open_date || "")
    );
  });

  const levelBadge = (key) => {
    const l = normalizeDjKey(key);
    if (l === "lead") return "bg-purple-100 text-purple-900 border-purple-200";
    if (l === "serve") return "bg-blue-100 text-blue-900 border-blue-200";
    if (l === "grow") return "bg-emerald-100 text-emerald-900 border-emerald-200";
    return "bg-amber-100 text-amber-900 border-amber-200";
  };

  const cardsHtml = offerings.length > 0
    ? offerings.map(o => {
        const isOpen = isRegistrationOpen(o, todayISO);
        const isCompleted = String(o.status || "").toLowerCase() === "completed";
        const chapters = Array.isArray(o.chapters) ? o.chapters : [];
        const completedCount = chapters.filter(c => c.completed === true).length;
        const levelKey = normalizeDjKey(o.class_key || o.class_name || "come");
        const levelLabel = o.class_name || (levelKey.charAt(0).toUpperCase() + levelKey.slice(1));
        const prereqLabel = getPrereqLabelForLevel(levelKey);
        const facilitatorName = getFacilitatorDisplayName(o);

        return `
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded-full border font-bold text-[10px] ${levelBadge(levelKey)}">
                DJ: ${esc(levelLabel)}
              </span>
              <span class="px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                isCompleted
                  ? "bg-slate-200 text-slate-700"
                  : isOpen
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-red-100 text-red-800"
              }">
                ${isCompleted ? "COMPLETED" : isOpen ? "OPEN" : "CLOSED"}
              </span>
            </div>

            <h4 class="font-bold text-sm text-slate-900">${esc(o.class_title || `${levelLabel} Class`)}</h4>
            <p class="text-[11px] text-slate-700">
              Facilitator: <strong>${esc(facilitatorName)}</strong>
            </p>
            <p class="text-[11px] text-slate-600">
              Prereq: <strong>${esc(prereqLabel)}</strong> • Chapters: <strong>${completedCount}/${chapters.length}</strong>
            </p>
            ${(o.registration_open_date || o.registration_close_date) ? `
              <p class="text-[10px] font-mono text-slate-500">
                Reg: ${esc(o.registration_open_date || "—")} → ${esc(o.registration_close_date || "—")}
              </p>
            ` : ""}

            <div class="pt-1 flex items-center justify-between gap-2">
              ${
                isOpen
                  ? `<button type="button" data-enroll-dj="${esc(o.id)}" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-[11px]">
                       Enroll Class
                     </button>`
                  : `<span class="text-[11px] text-slate-400 font-medium">${isCompleted ? "Class finished" : "Registration closed"}</span>`
              }
            </div>
          </div>
        `;
      }).join("")
    : `<p class="text-xs text-slate-500 col-span-full">No DJ classes published yet.</p>`;

  container.innerHTML = `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-bold text-sm text-slate-900">🎓 Discipleship Journey (DJ) Classes</h3>
          <p class="text-[11px] text-slate-500">Sequential path: ${DJ_LEVEL_ORDER.map(k => k.toUpperCase()).join(" → ")}</p>
        </div>
        <span class="text-[11px] font-semibold text-slate-500">${offerings.length} class(es)</span>
      </div>

      ${canCreate ? `
        <form id="form-create-dj-offering" class="bg-amber-50/60 p-3 rounded-xl border border-amber-200 space-y-2 text-xs">
          <p class="font-bold text-slate-900">➕ Open New DJ Class (Facilitator)</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <div>
              <label class="text-[10px] font-bold text-slate-600 uppercase">DJ Class Level</label>
              <select id="dj-new-level" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold mt-0.5">
                ${DJ_LEVEL_ORDER.map(k => `<option value="${k}">${k.charAt(0).toUpperCase() + k.slice(1)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="text-[10px] font-bold text-slate-600 uppercase">Batch / Title</label>
              <input type="text" id="dj-new-title" placeholder="e.g. Come — Dec 2026" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-slate-600 uppercase">Registration Opens</label>
              <input type="date" id="dj-new-open" value="${esc(todayISO)}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-slate-600 uppercase">Registration Closes</label>
              <input type="date" id="dj-new-close" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5" />
            </div>
          </div>
          <div class="flex justify-end pt-1">
            <button type="submit" class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg">
              🚀 Publish DJ Class
            </button>
          </div>
        </form>
      ` : ""}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${cardsHtml}</div>
    </div>
  `;
}

function renderPublicFeed() {
  const panel = document.getElementById("panel-public");
  if (!panel) return;

  const isEditorOpen = !document.getElementById("church-profile-editor")?.classList.contains("hidden") &&
    Boolean(document.getElementById("church-profile-editor"));

  const todayISO = getAucklandTodayISO();
  const currentMonthKey = todayISO.slice(0, 7);
  const cp = portalState.churchProfile;
  const isManager = canManageChurchPortal();

  const activeMonth =
    portalState.months.find(m => m.month_key === currentMonthKey) ||
    portalState.months.find(m => m.month_key >= currentMonthKey) ||
    portalState.months[0];

  const sortedWeeks = [...portalState.weeks].sort((a, b) =>
    String(a.service_date || "").localeCompare(String(b.service_date || ""))
  );
  const nextService =
    sortedWeeks.find(w => (w.service_date || "") >= todayISO) ||
    sortedWeeks[sortedWeeks.length - 1] ||
    null;

  const normalizedRef = portalState.reflections
    .map(d => ({
      ...d,
      _date: d.reflection_date || d.devotion_date || d.id || ""
    }))
    .sort((a, b) => a._date.localeCompare(b._date));
  const todayRef =
    normalizedRef.find(d => d._date === todayISO) ||
    normalizedRef.find(d => d._date >= todayISO) ||
    normalizedRef[normalizedRef.length - 1] ||
    null;

  const snap = portalState.snapshot;

  panel.innerHTML = `
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div class="space-y-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-block text-[10px] uppercase tracking-widest px-2.5 py-1 bg-amber-500 text-slate-950 font-extrabold rounded-full">
              ${esc(cp.name)}
            </span>
            <span class="text-[11px] font-mono text-slate-300 bg-white/10 px-2.5 py-0.5 rounded-full">
              ${esc(cp.service_day)} •${esc(cp.service_time)}
            </span>
          </div>
          <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight">Church Portal & Internal Hub</h2>
          <p class="text-xs text-slate-300">📍 ${esc(cp.address)}</p>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <a href="${esc(cp.website_url || "https://ifgfpalmy.org")}" target="_blank" rel="noopener"
            class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-semibold transition">
            🌐 Public Website (ifgfpalmy.org) ↗
          </a>
          ${isManager ? `
            <button type="button" id="btn-toggle-church-profile"
              class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition">
              ⚙️ Church Info
            </button>
          ` : ""}
        </div>
      </div>

      ${isManager ? `
        <div id="church-profile-editor" class="${isEditorOpen ? "" : "hidden"} bg-slate-950/70 border border-white/15 rounded-xl p-4 text-xs">
          <form id="form-church-profile" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
            <div>
              <label class="text-slate-300 font-semibold">Church Name</label>
              <input type="text" id="cp-name" value="${esc(cp.name)}" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white mt-1" />
            </div>
            <div>
              <label class="text-slate-300 font-semibold">Service Day</label>
              <input type="text" id="cp-day" value="${esc(cp.service_day)}" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white mt-1" />
            </div>
            <div>
              <label class="text-slate-300 font-semibold">Service Time</label>
              <input type="text" id="cp-time" value="${esc(cp.service_time)}" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white mt-1" />
            </div>
            <div>
              <label class="text-slate-300 font-semibold">Address</label>
              <input type="text" id="cp-address" value="${esc(cp.address)}" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white mt-1" />
            </div>
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="text-slate-300 font-semibold">Website URL</label>
                <input type="url" id="cp-website" value="${esc(cp.website_url)}" class="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white mt-1" />
              </div>
              <button type="submit" class="self-end px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg">
                Save
              </button>
            </div>
          </form>
        </div>
      ` : ""}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 space-y-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="font-bold text-sm text-slate-900">📢 Announcement Board</h3>
              <p class="text-[11px] text-slate-500">Internal updates, roster reminders & church notices</p>
            </div>
            <span class="text-[11px] font-semibold text-slate-500">${portalState.announcements.length} active</span>
          </div>

          ${isManager ? `
            <form id="form-announcement" class="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" id="ann-title" required placeholder="Announcement title..." class="sm:col-span-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold" />
                <select id="ann-category" class="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold">
                  <option value="General">General</option>
                  <option value="Sunday Service">Sunday Service</option>
                  <option value="Ministry Roster">Ministry Roster</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <textarea id="ann-body" rows="2" required placeholder="Write short internal notice..." class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg"></textarea>
              <div class="flex items-center justify-between gap-2">
                <label class="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" id="ann-pinned" class="rounded border-slate-300" /> Pin to top
                </label>
                <button type="submit" class="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
                  + Post Notice
                </button>
              </div>
            </form>
          ` : ""}

          <div id="church-announcements-list" class="space-y-2.5"></div>
        </div>

        <div id="public-dj-classes-section"></div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="font-bold text-sm text-slate-900">🗓️ Next Sunday Service</h3>
            ${activeMonth ? `
              <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                ${esc(activeMonth.month_key)} • ${esc(activeMonth.title)}
              </span>
            ` : ""}
          </div>

          ${nextService ? `
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded">${esc(nextService.service_date)}</span>
                  <span class="font-semibold text-slate-700">${esc(cp.service_time)}</span>
                </div>
                ${nextService.speaker ? `<span class="font-bold px-2.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-full">🎙️ ${esc(nextService.speaker)}</span>` : ""}
              </div>
              <h4 class="font-bold text-base text-slate-900">${esc(nextService.title)}</h4>
              ${nextService.scripture_reading || nextService.key_verse ? `
                <p class="text-slate-600">📖 ${esc(nextService.scripture_reading \vert{}\vert{} "")}${nextService.key_verse ? ` • ${esc(nextService.key_verse)}` : ""}</p>
              ` : ""}
            </div>
          ` : `
            <p class="text-xs text-slate-500">No upcoming Sunday service scheduled yet.</p>
          `}
        </div>
      </div>

      <div class="space-y-4">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-bold text-sm text-slate-900">✨ Today's Reflection</h3>
            <span class="text-[10px] font-extrabold px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full">${esc(todayRef?._date || todayISO)}</span>
          </div>
          ${todayRef ? `
            <div class="space-y-1.5 text-xs">
              ${todayRef.scripture ? `<p class="font-bold text-amber-800">${esc(todayRef.scripture)}</p>` : ""}
              <h4 class="font-bold text-sm text-slate-900">${esc(todayRef.title)}</h4>
              <p class="text-slate-700 line-clamp-5 leading-relaxed">${esc(todayRef.reflection)}</p>
              <div class="pt-1 flex items-center justify-between text-[11px]">
                <a href="${esc(cp.website_url || "https://ifgfpalmy.org")}" target="_blank" rel="noopener" class="font-semibold text-blue-700 hover:underline">
                  Read full on website ↗
                </a>
                ${isManager ? `<button type="button" data-jump-tab="curriculum" class="font-semibold text-slate-700 hover:underline">Manage →</button>` : ""}
              </div>
            </div>
          ` : `
            <p class="text-xs text-slate-500">Daily reflection will be published soon.</p>
          `}
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 class="font-bold text-sm text-slate-900">📊 Ministry Hub Snapshot</h3>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-lg font-extrabold text-slate-900">${snap.activeDisciples}</p>
              <p class="text-[10px] font-semibold text-slate-500 uppercase">Active Disciples</p>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-lg font-extrabold text-slate-900">${snap.departmentsCount}</p>
              <p class="text-[10px] font-semibold text-slate-500 uppercase">Departments</p>
            </div>
            <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <p class="text-lg font-extrabold text-slate-900">${snap.rolesCount}</p>
              <p class="text-[10px] font-semibold text-slate-500 uppercase">Ministry Roles</p>
            </div>
          </div>

          ${isManager ? `
            <div class="grid grid-cols-2 gap-2 pt-1 text-xs">
              <button type="button" data-jump-tab="roster" class="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-center">
                📅 Sunday Roster
              </button>
              <button type="button" data-jump-tab="disciples" class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-center">
                Disciples (360°)
              </button>
            </div>
          ` : ""}
        </div>
      </div>
    </div>
  `;

  renderAnnouncementBoard();
  renderPublicDjClasses();
}

// --- 2. MEMBER SELF-SERVICE PORTAL (LOGGED-IN USER) ---
export async function initMemberSelfService(profile) {
  portalState.profile = profile;
  bindMemberPortalEvents();
  await refreshMemberSelfService();
  renderPublicFeed();
}

function findSectionCardByChild(childEl, fallbackId) {
  if (fallbackId) {
    const direct = document.getElementById(fallbackId);
    if (direct) return direct;
  }
  if (!childEl) return null;
  let curr = childEl.parentElement;
  const bodyEl = document.getElementById("member-selfservice-body");
  while (curr && curr !== bodyEl && curr.parentElement) {
    if (curr.parentElement === bodyEl) return curr;
    curr = curr.parentElement;
  }
  return childEl.parentElement;
}

function applyMemberPortalLayoutOrder() {
  const bodyEl = document.getElementById("member-selfservice-body");
  if (!bodyEl) return;

  const profileHeaderCard =
    document.getElementById("my-profile-card") ||
    findSectionCardByChild(document.getElementById("my-profile-name"), null);

  const dutiesCard =
    document.getElementById("my-duties-card") ||
    findSectionCardByChild(document.getElementById("my-duties-list"), null);

  const blockoutCard =
    document.getElementById("my-blockout-card") ||
    findSectionCardByChild(document.getElementById("form-my-blockout"), null);

  const profileFormCard =
    document.getElementById("my-profile-form-card") ||
    findSectionCardByChild(document.getElementById("form-my-profile"), null);

  const rosterManagerCard = document.getElementById("my-portal-dept-roster-manager");
  const djTeachingCard = document.getElementById("my-portal-dj-teaching-panel");

  let twoColGrid = document.getElementById("my-portal-bottom-two-col");
  if (!twoColGrid) {
    twoColGrid = document.createElement("div");
    twoColGrid.id = "my-portal-bottom-two-col";
  }
  twoColGrid.className = "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start";

  [blockoutCard, profileFormCard].forEach(card => {
    if (!card) return;
    card.classList.remove("mt-4", "mt-5", "mt-6", "mb-4", "mb-6");
    if (card.parentElement !== twoColGrid) {
      twoColGrid.appendChild(card);
    }
  });

  if (dutiesCard) {
    dutiesCard.classList.remove("mt-4", "mt-5", "mt-6", "mb-4", "mb-6");
  }
  if (rosterManagerCard) {
    rosterManagerCard.classList.remove("mt-4", "mt-5", "mt-6", "mb-4", "mb-6");
  }
  if (djTeachingCard) {
    djTeachingCard.classList.remove("mt-4", "mt-5", "mt-6", "mb-4", "mb-6");
  }

  const hasManagedDepts = Array.isArray(portalState.managedDepartments) && portalState.managedDepartments.length > 0;
  const hasDjPanel = canManageDjClasses() && portalState.djOfferings.length > 0;

  if (profileHeaderCard && profileHeaderCard.parentElement === bodyEl) {
    bodyEl.appendChild(profileHeaderCard);
  }

  if (hasManagedDepts) {
    if (rosterManagerCard) bodyEl.appendChild(rosterManagerCard);
    if (hasDjPanel && djTeachingCard) bodyEl.appendChild(djTeachingCard);
    if (dutiesCard) bodyEl.appendChild(dutiesCard);
    bodyEl.appendChild(twoColGrid);
  } else {
    if (hasDjPanel && djTeachingCard) bodyEl.appendChild(djTeachingCard);
    if (dutiesCard) bodyEl.appendChild(dutiesCard);
    bodyEl.appendChild(twoColGrid);
    if (rosterManagerCard && rosterManagerCard.parentElement === bodyEl) {
      bodyEl.removeChild(rosterManagerCard);
    }
  }
}

async function loadSelectedDjEnrollments() {
  if (!portalState.djOfferings.length) {
    portalState.selectedDjOfferingId = "";
    portalState.selectedDjEnrollments = [];
    return;
  }
  if (!portalState.selectedDjOfferingId || !portalState.djOfferings.some(o => o.id === portalState.selectedDjOfferingId)) {
    portalState.selectedDjOfferingId = portalState.djOfferings[0].id;
  }
  portalState.selectedDjEnrollments = await getEnrollmentsByOffering(portalState.selectedDjOfferingId).catch(() => []);
}

async function refreshMemberSelfService() {
  const discipleDoc = await resolveDiscipleForCurrentUser(portalState.profile);
  const unregBanner = document.getElementById("member-unregistered-notice");
  const selfServiceBody = document.getElementById("member-selfservice-body");

  if (!discipleDoc) {
    unregBanner?.classList.remove("hidden");
    selfServiceBody?.classList.add("hidden");
    return;
  }

  portalState.profile = { ...portalState.profile, discipleDoc };
  unregBanner?.classList.add("hidden");
  selfServiceBody?.classList.remove("hidden");

  const isRealDiscipleRecord = Boolean(discipleDoc.id) && !discipleDoc._isAdminFallback;

  const [
    duties,
    blockouts,
    selectableRoles,
    allDepartments,
    allRoles,
    allDisciples,
    allUnavailability,
    djOfferings,
    allDjEnrollments
  ] = await Promise.all([
    isRealDiscipleRecord ? getMyAssignments(discipleDoc.id).catch(() => []) : Promise.resolve([]),
    isRealDiscipleRecord ? getMyUnavailability(discipleDoc.id).catch(() => []) : Promise.resolve([]),
    fetchSelectableMinistryRoles(),
    getDepartments().catch(() => []),
    getRolesReference().catch(() => []),
    getDisciples().catch(() => []),
    getUnavailability().catch(() => []),
    getAllDjOfferings().catch(() => []),
    getAllDjEnrollments().catch(() => [])
  ]);

  const todayISO = getAucklandTodayISO();
  portalState.myDuties = duties.sort((a, b) =>
    String(a.service_date || "").localeCompare(String(b.service_date || ""))
  );
  portalState.myBlockouts = blockouts
    .filter(b => (b.end_date || b.start_date || "") >= todayISO)
    .sort((a, b) => String(a.start_date || "").localeCompare(String(b.start_date || "")));
  portalState.selectableRoles = selectableRoles;

  portalState.allDepartments = [...allDepartments].sort((a, b) =>
    (Number(a.sort_order) || 999) - (Number(b.sort_order) || 999) ||
    String(a.name || "").localeCompare(String(b.name || ""))
  );
  portalState.allRoles = allRoles
    .filter(r => r.active !== false && r.is_active !== false && !isLeadershipRoleName(r.role_name || r.name))
    .sort((a, b) => (Number(a.sort_order) || 999) - (Number(b.sort_order) || 999));
  portalState.allDisciples = allDisciples.filter(d => (d.status || "Active") === "Active");
  portalState.allUnavailability = allUnavailability;
  portalState.managedDepartments = resolveManagedDepartments(discipleDoc, portalState.allDepartments);
  portalState.djOfferings = djOfferings;
  portalState.allDjEnrollments = allDjEnrollments;

  if (!portalState.selectedRosterDate && portalState.weeks.length > 0) {
    const sortedWeeks = [...portalState.weeks].sort((a, b) =>
      String(a.service_date || "").localeCompare(String(b.service_date || ""))
    );
    const upcoming = sortedWeeks.find(w => (w.service_date || "") >= todayISO) || sortedWeeks[0];
    portalState.selectedRosterDate = upcoming?.service_date || "";
  }

  if (portalState.managedDepartments.length > 0 && portalState.selectedRosterDate) {
    portalState.dateAssignments = await getAssignmentsByDate(portalState.selectedRosterDate).catch(() => []);
  }

  if (canManageDjClasses()) {
    await loadSelectedDjEnrollments();
  }

  renderMyProfileHeader(discipleDoc);
  const phoneInput = document.getElementById("my-phone-input");
  const addressInput = document.getElementById("my-address-input");
  if (phoneInput) phoneInput.value = discipleDoc.phone || "";
  if (addressInput) addressInput.value = discipleDoc.address || "";
  renderMyInterestsChecklist(discipleDoc.ministry_interests || []);

  renderMyDuties();
  renderMyBlockouts();
  renderDepartmentRosterManagerInMyPortal();
  renderDjFacilitatorTeachingPanel();
  applyMemberPortalLayoutOrder();
}

// --- DJ FACILITATOR TEACHING PANEL IN MY PORTAL ---
function renderDjFacilitatorTeachingPanel() {
  const bodyEl = document.getElementById("member-selfservice-body");
  if (!bodyEl) return;

  let container = document.getElementById("my-portal-dj-teaching-panel");
  if (!container) {
    container = document.createElement("div");
    container.id = "my-portal-dj-teaching-panel";
    bodyEl.appendChild(container);
  }

  if (!canManageDjClasses() || portalState.djOfferings.length === 0) {
    container.innerHTML = "";
    return;
  }

  const offering =
    portalState.djOfferings.find(o => o.id === portalState.selectedDjOfferingId) ||
    portalState.djOfferings[0];

  const chapters = Array.isArray(offering.chapters) ? offering.chapters : [];
  const isCompleted = String(offering.status || "").toLowerCase() === "completed";
  const isClosed = offering.registration_manually_closed === true;
  const todayISO = getAucklandTodayISO();
  const facilitatorName = getFacilitatorDisplayName(offering);

  const offeringOptions = portalState.djOfferings.map(o => `
    <option value="${esc(o.id)}" ${o.id === offering.id ? "selected" : ""}>
      ${esc(o.class_title \vert{}\vert{} o.class_name \vert{}\vert{} "DJ Class")} (${esc(o.status || "Open")})
    </option>
  `).join("");

  const chaptersHtml = chapters.map((ch, idx) => {
    const chTitle = ch.title || ch.name || `Chapter ${ch.chapter_no || idx + 1}`;
    const done = ch.completed === true;
    const doneDate = ch.completed_date || todayISO;
    return `
      <div class="flex items-center justify-between gap-2 p-2.5 rounded-lg border ${done ? "bg-emerald-50/70 border-emerald-200" : "bg-white border-slate-20
