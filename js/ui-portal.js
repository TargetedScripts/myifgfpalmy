// js/ui-portal.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as dbPortal from "./db-portal.js";
import { getDailyReflections, seedNov20toDec31Reflections } from "./db-content.js";
import {
  getAssignmentsByDate,
  upsertAssignment,
  deleteAssignment,
  getUnavailability,
  addUnavailability,
  deleteUnavailability
} from "./db-roster.js";
import { getDepartments, getRolesReference, getDisciples } from "./db-master.js";

const {
  getPublicMonthlyThemes,
  getPublicWeeklyInsights,
  getMyAssignments,
  respondToAssignment,
  getMyUnavailability,
  updateMyContactProfile
} = dbPortal;

const DEFAULT_CHURCH_PROFILE = {
  church_id: "ifgf_palmy",
  name: "IFGF Palmerston North",
  address: "Palmerston North, New Zealand",
  service_day: "Sunday",
  service_time: "4:30 PM",
  timezone: "Pacific/Auckland",
  website_url: "https://ifgfpalmy.org"
};

const LEGACY_SINGER_NAMES = ["Singer 1", "Singer 2", "Singer 3"];

function isUniversalSharedTask(role = {}) {
  if (role?.is_universal === true) return true;
  const n = String(role?.role_name || role?.name || role || "").toLowerCase();
  return n.includes("cuci piring") || n.includes("vacuum");
}

function isLeadershipRoleName(roleName = "") {
  const n = String(roleName || "").trim().toLowerCase();
  return n.startsWith("head of dept") || n.startsWith("lead of dept");
}

function normKey(val = "") {
  return String(val || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeEmailList(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(e => String(e || "").trim().toLowerCase()).filter(Boolean);
  }
  return String(val || "")
    .split(/[,;\n]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function getRoleSlotsCount(role) {
  const raw = Number(role?.slots_count);
  if (Number.isFinite(raw) && raw >= 1) return Math.min(20, Math.floor(raw));
  if (/^singer$/i.test(String(role?.role_name || role?.name || "").trim())) return 3;
  return 1;
}

function buildRoleSlots(role) {
  const count = getRoleSlotsCount(role);
  const baseName = String(role?.role_name || role?.name || "Role").trim();
  if (count <= 1) {
    return [{
      slotIndex: 1,
      slotsCount: 1,
      slotKey: role.id,
      displayLabel: baseName
    }];
  }
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    return {
      slotIndex: num,
      slotsCount: count,
      slotKey: `${role.id}__${num}`,
      displayLabel: `${baseName} ${num}`
    };
  });
}

function roleMatchesDept(role, dept) {
  const deptKeys = new Set([normKey(dept.id), normKey(dept.name)].filter(Boolean));
  const roleKeys = [
    normKey(role.department_id),
    normKey(role.dept_id),
    normKey(role.dept_name),
    normKey(role.department_name)
  ].filter(Boolean);
  return roleKeys.some(k => deptKeys.has(k));
}

async function fetchSelectableMinistryRoles() {
  try {
    const [depts, roles] = await Promise.all([
      getDepartments().catch(() => []),
      getRolesReference().catch(() => [])
    ]);

    const deptMap = new Map();
    depts.forEach((d, idx) => {
      deptMap.set(d.id, {
        name: d.name || d.id,
        sort_order: Number(d.sort_order) || idx + 1,
        is_active: d.is_active !== false
      });
    });

    return roles
      .filter(r => r.is_active !== false && r.active !== false)
      .map((r, idx) => {
        const label = String(r.role_name || r.name || "").trim();
        const deptInfo = deptMap.get(r.department_id);
        return {
          ...r,
          _label: label,
          _deptName: deptInfo?.name || r.dept_name || "General Ministry",
          _deptOrder: deptInfo?.sort_order ?? 999,
          _roleOrder: Number(r.sort_order) || idx + 1,
          _isUniversal: isUniversalSharedTask(r)
        };
      })
      .filter(r => Boolean(r._label) && !isLeadershipRoleName(r._label))
      .sort((a, b) => {
        if (a._isUniversal !== b._isUniversal) return a._isUniversal ? 1 : -1;
        if (a._deptOrder !== b._deptOrder) return a._deptOrder - b._deptOrder;
        if (a._roleOrder !== b._roleOrder) return a._roleOrder - b._roleOrder;
        return a._label.localeCompare(b._label);
      });
  } catch (err) {
    console.warn("fetchSelectableMinistryRoles error:", err);
    return [];
  }
}

async function fetchChurchProfile() {
  try {
    const snap = await getDoc(doc(db, "church_profile", "ifgf_palmy"));
    if (snap.exists()) {
      return { ...DEFAULT_CHURCH_PROFILE, ...snap.data() };
    }
  } catch (err) {
    console.warn("Using default church profile fallback:", err);
  }
  return { ...DEFAULT_CHURCH_PROFILE };
}

async function fetchAnnouncements() {
  try {
    const snap = await getDocs(collection(db, "announcements"));
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.is_active !== false)
      .sort((a, b) => {
        const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        if (pinDiff !== 0) return pinDiff;
        const dateA = String(a.announcement_date || a.created_at_iso || "");
        const dateB = String(b.announcement_date || b.created_at_iso || "");
        return dateB.localeCompare(dateA);
      });
  } catch (err) {
    console.warn("fetchAnnouncements fallback:", err);
    return [];
  }
}

async function fetchHubSnapshotCounts() {
  try {
    const [discSnap, deptSnap, roleSnap] = await Promise.all([
      getDocs(collection(db, "disciples")).catch(() => null),
      getDocs(collection(db, "departments")).catch(() => null),
      getDocs(collection(db, "roles_reference")).catch(() => null)
    ]);

    const activeDisciples = discSnap
      ? discSnap.docs.filter(d => (d.data().status || "Active") === "Active").length
      : 0;
    const totalDisciples = discSnap ? discSnap.size : 0;
    const departmentsCount = deptSnap
      ? deptSnap.docs.filter(d => d.data().active !== false && d.data().is_active !== false).length
      : 0;
    const rolesCount = roleSnap
      ? roleSnap.docs.filter(d => d.data().active !== false && d.data().is_active !== false).length
      : 0;

    return { activeDisciples, totalDisciples, departmentsCount, rolesCount };
  } catch (err) {
    console.warn("fetchHubSnapshotCounts fallback:", err);
    return { activeDisciples: 0, totalDisciples: 0, departmentsCount: 0, rolesCount: 0 };
  }
}

async function fetchPublicDailyReflections() {
  if (typeof dbPortal.getPublicDailyReflections === "function") {
    const items = await dbPortal.getPublicDailyReflections();
    if (items && items.length > 0) return items;
  }
  if (typeof dbPortal.getPublicDailyDevotions === "function") {
    const items = await dbPortal.getPublicDailyDevotions();
    if (items && items.length > 0) return items;
  }
  return await getDailyReflections();
}

let portalState = {
  profile: null,
  churchProfile: { ...DEFAULT_CHURCH_PROFILE },
  announcements: [],
  snapshot: { activeDisciples: 0, totalDisciples: 0, departmentsCount: 0, rolesCount: 0 },
  selectableRoles: [],
  months: [],
  weeks: [],
  reflections: [],
  myDuties: [],
  myBlockouts: [],
  // Department Roster Manager state inside My Portal
  allDepartments: [],
  allRoles: [],
  allDisciples: [],
  allUnavailability: [],
  managedDepartments: [],
  selectedRosterDate: "",
  dateAssignments: [],
  publicEventsBound: false,
  memberEventsBound: false
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAucklandTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function isSystemAdminUser() {
  const level = String(portalState.profile?.accessLevel || "").toLowerCase();
  const sysRole = String(
    portalState.profile?.system_role ||
    portalState.profile?.discipleDoc?.system_role ||
    portalState.profile?.role ||
    ""
  ).toLowerCase();
  return level === "super_admin" || sysRole === "super_admin";
}

function canManageChurchPortal() {
  const level = String(portalState.profile?.accessLevel || "").toLowerCase();
  const sysRole = String(
    portalState.profile?.system_role ||
    portalState.profile?.discipleDoc?.system_role ||
    portalState.profile?.role ||
    ""
  ).toLowerCase();
  return (
    level === "super_admin" ||
    level === "coordinator" ||
    sysRole === "super_admin" ||
    sysRole === "coordinator" ||
    portalState.profile?.isAdmin === true
  );
}

function resolveManagedDepartments(discipleDoc, departments) {
  const activeDepts = departments.filter(d => d.active !== false && d.is_active !== false);
  if (isSystemAdminUser() || canManageChurchPortal()) {
    return activeDepts;
  }

  const email = String(
    discipleDoc?.email || portalState.profile?.email || ""
  ).trim().toLowerCase();

  const interests = Array.isArray(discipleDoc?.ministry_interests)
    ? discipleDoc.ministry_interests.map(i => String(i || "").trim().toLowerCase())
    : [];

  return activeDepts.filter(dept => {
    const leads = normalizeEmailList(dept.lead_emails || dept.lead_email || dept.head_email);
    if (email && leads.includes(email)) return true;

    const deptNameLower = String(dept.name || "").trim().toLowerCase();
    if (!deptNameLower) return false;

    return interests.some(item =>
      (item.startsWith("head of dept") || item.startsWith("lead of dept")) &&
      item.includes(deptNameLower)
    );
  });
}

async function resolveDiscipleForCurrentUser(profile) {
  if (profile?.discipleDoc) return profile.discipleDoc;

  const email = String(profile?.email || "").trim().toLowerCase();
  const displayName = String(profile?.displayName || profile?.name || "").trim().toLowerCase();

  try {
    const snap = await getDocs(collection(db, "disciples"));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (email) {
      const byEmail = all.find(d => String(d.email || "").trim().toLowerCase() === email);
      if (byEmail) return byEmail;
    }

    if (displayName) {
      const byName = all.find(d => String(d.full_name || "").trim().toLowerCase() === displayName);
      if (byName) return byName;
    }
  } catch (err) {
    console.warn("resolveDiscipleForCurrentUser lookup skipped:", err);
  }

  if (isSystemAdminUser() || canManageChurchPortal()) {
    return {
      id: profile?.uid || "system_admin",
      member_id: "SUPER_ADMIN",
      full_name: profile?.displayName || profile?.name || "System Admin",
      email: profile?.email || "",
      phone: "",
      address: "",
      system_role: "super_admin",
      dj_traffic_light: "green",
      ministry_interests: [],
      _isAdminFallback: true
    };
  }

  return null;
}

// --- 1. CHURCH PORTAL INITIALIZER (GUEST & LOGGED-IN) ---
export async function initPublicPortal() {
  try {
    let [churchProfile, announcements, snapshot, months, weeks, reflections] = await Promise.all([
      fetchChurchProfile(),
      fetchAnnouncements(),
      fetchHubSnapshotCounts(),
      getPublicMonthlyThemes(),
      getPublicWeeklyInsights(),
      fetchPublicDailyReflections()
    ]);

    if (reflections.length === 0) {
      try {
        await seedNov20toDec31Reflections();
        reflections = await fetchPublicDailyReflections();
      } catch (seedErr) {
        console.warn("Auto-seed Daily Reflections skipped:", seedErr);
      }
    }

    portalState.churchProfile = churchProfile;
    portalState.announcements = announcements;
    portalState.snapshot = snapshot;
    portalState.months = months;
    portalState.weeks = weeks;
    portalState.reflections = reflections;

    bindPublicPortalEvents();
    renderPublicFeed();
  } catch (err) {
    console.error("Church portal load error:", err);
  }
}

function bindPublicPortalEvents() {
  if (portalState.publicEventsBound) return;
  portalState.publicEventsBound = true;

  const panel = document.getElementById("panel-public");
  if (!panel) return;

  panel.addEventListener("submit", async (e) => {
    if (e.target.id === "form-announcement") {
      e.preventDefault();
      if (!canManageChurchPortal()) return;

      const title = document.getElementById("ann-title")?.value.trim() || "";
      const category = document.getElementById("ann-category")?.value || "General";
      const body = document.getElementById("ann-body")?.value.trim() || "";
      const pinned = Boolean(document.getElementById("ann-pinned")?.checked);
      if (!title || !body) return;

      const submitBtn = e.target.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        await addDoc(collection(db, "announcements"), {
          church_id: portalState.churchProfile.church_id || "ifgf_palmy",
          title,
          category,
          body,
          pinned,
          announcement_date: getAucklandTodayISO(),
          author_name: portalState.profile?.displayName || "Admin",
          is_active: true,
          created_at: serverTimestamp()
        });
        e.target.reset();
        portalState.announcements = await fetchAnnouncements();
        renderAnnouncementBoard();
      } catch (err) {
        alert("Failed to post announcement: " + (err?.message || err));
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    }

    if (e.target.id === "form-church-profile") {
      e.preventDefault();
      if (!canManageChurchPortal()) return;

      const payload = {
        church_id: "ifgf_palmy",
        name: document.getElementById("cp-name")?.value.trim() || "IFGF Palmerston North",
        service_day: document.getElementById("cp-day")?.value.trim() || "Sunday",
        service_time: document.getElementById("cp-time")?.value.trim() || "4:30 PM",
        address: document.getElementById("cp-address")?.value.trim() || "Palmerston North, New Zealand",
        website_url: document.getElementById("cp-website")?.value.trim() || "https://ifgfpalmy.org",
        timezone: "Pacific/Auckland",
        updated_at: serverTimestamp()
      };

      try {
        await setDoc(doc(db, "church_profile", "ifgf_palmy"), payload, { merge: true });
        portalState.churchProfile = { ...portalState.churchProfile, ...payload };
        document.getElementById("church-profile-editor")?.classList.add("hidden");
        renderPublicFeed();
        if (portalState.profile?.discipleDoc) {
          renderMyDuties();
        }
      } catch (err) {
        alert("Failed to save church profile: " + (err?.message || err));
      }
    }
  });

  panel.addEventListener("click", async (e) => {
    const toggleProfileBtn = e.target.closest("#btn-toggle-church-profile");
    if (toggleProfileBtn) {
      document.getElementById("church-profile-editor")?.classList.toggle("hidden");
      return;
    }

    const delAnnBtn = e.target.closest("button[data-delete-ann]");
    if (delAnnBtn) {
      if (!canManageChurchPortal()) return;
      const annId = delAnnBtn.dataset.deleteAnn;
      if (!annId || !confirm("Delete this announcement?")) return;
      delAnnBtn.disabled = true;
      try {
        await deleteDoc(doc(db, "announcements", annId));
        portalState.announcements = portalState.announcements.filter(a => a.id !== annId);
        renderAnnouncementBoard();
      } catch (err) {
        delAnnBtn.disabled = false;
        alert("Failed to delete announcement: " + (err?.message || err));
      }
      return;
    }

    const jumpBtn = e.target.closest("button[data-jump-tab]");
    if (jumpBtn) {
      const targetTab = jumpBtn.dataset.jumpTab;
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
      if (tabBtn && !tabBtn.classList.contains("hidden")) {
        tabBtn.click();
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
      <p class="text-slate-700 whitespace-pre-line leading-relaxed">${esc(a.body)}</p>
      ${a.author_name ? `<p class="text-[11px] text-slate-400">Posted by ${esc(a.author_name)}</p>` : ""}
    </div>
  `).join("");
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
              ${esc(cp.service_day)} • ${esc(cp.service_time)}
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
                <p class="text-slate-600">📖 ${esc(nextService.scripture_reading || "")}${nextService.key_verse ? ` • ${esc(nextService.key_verse)}` : ""}</p>
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
}

// --- 2. MEMBER SELF-SERVICE PORTAL (LOGGED-IN USER) ---
export async function initMemberSelfService(profile) {
  portalState.profile = profile;
  bindMemberPortalEvents();
  await refreshMemberSelfService();
  renderPublicFeed();
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
    allUnavailability
  ] = await Promise.all([
    isRealDiscipleRecord ? getMyAssignments(discipleDoc.id).catch(() => []) : Promise.resolve([]),
    isRealDiscipleRecord ? getMyUnavailability(discipleDoc.id).catch(() => []) : Promise.resolve([]),
    fetchSelectableMinistryRoles(),
    getDepartments().catch(() => []),
    getRolesReference().catch(() => []),
    getDisciples().catch(() => []),
    getUnavailability().catch(() => [])
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

  renderMyProfileHeader(discipleDoc);
  const phoneInput = document.getElementById("my-phone-input");
  const addressInput = document.getElementById("my-address-input");
  if (phoneInput) phoneInput.value = discipleDoc.phone || "";
  if (addressInput) addressInput.value = discipleDoc.address || "";
  renderMyInterestsChecklist(discipleDoc.ministry_interests || []);

  renderMyDuties();
  renderMyBlockouts();
  renderDepartmentRosterManagerInMyPortal();
}

function renderMyInterestsChecklist(savedInterests = []) {
  const container = document.getElementById("my-interests-checklist");
  if (!container) return;

  const roles = portalState.selectableRoles;
  if (!roles || roles.length === 0) {
    container.innerHTML = `<p class="text-[11px] text-slate-500 col-span-full">No ministry roles available yet.</p>`;
    return;
  }

  const normalizedSaved = (Array.isArray(savedInterests) ? savedInterests : [])
    .map(s => String(s || "").trim().toLowerCase())
    .filter(Boolean);

  const isRoleSelected = (roleName) => {
    const target = roleName.toLowerCase();
    return normalizedSaved.includes(target);
  };

  container.classList.remove("grid", "grid-cols-1", "sm:grid-cols-2");
  container.classList.add("space-y-3");

  const byDept = new Map();
  roles.forEach(r => {
    const deptLabel = r._deptName || "General Ministry";
    if (!byDept.has(deptLabel)) byDept.set(deptLabel, []);
    byDept.get(deptLabel).push(r);
  });

  container.innerHTML = Array.from(byDept.entries()).map(([deptName, deptRoles]) => {
    const checkboxesHtml = deptRoles.map(r => {
      const roleName = r._label;
      if (r._isUniversal) {
        return `
          <label class="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 cursor-not-allowed select-none opacity-85" title="Shared responsibility for all members">
            <span class="flex items-center gap-2 min-w-0">
              <input type="checkbox" name="my-interest-role" value="${esc(roleName)}" checked disabled class="rounded border-slate-300 text-slate-500 cursor-not-allowed" />
              <span class="text-xs font-medium text-slate-600 truncate">${esc(roleName)}</span>
            </span>
            <span class="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded shrink-0">All</span>
          </label>
        `;
      }

      const checked = isRoleSelected(roleName) ? "checked" : "";
      return `
        <label class="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 hover:border-slate-400 cursor-pointer select-none">
          <input type="checkbox" name="my-interest-role" value="${esc(roleName)}" ${checked} class="rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
          <span class="text-xs font-medium text-slate-800 truncate" title="${esc(roleName)}">${esc(roleName)}</span>
        </label>
      `;
    }).join("");

    return `
      <div class="space-y-1.5">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${esc(deptName)}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">${checkboxesHtml}</div>
      </div>
    `;
  }).join("");
}

function renderMyProfileHeader(discipleDoc) {
  const nameEl = document.getElementById("my-profile-name");
  const metaEl = document.getElementById("my-profile-meta");
  if (!nameEl || !metaEl) return;

  const djColor = (discipleDoc.dj_traffic_light || "red").toLowerCase();
  const djBadgeClass =
    djColor === "green"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : djColor === "amber"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-800 border-red-200";

  const confirmedCount = portalState.myDuties.filter(d => d.status === "Confirmed").length;
  const isSysAdmin = isSystemAdminUser() || canManageChurchPortal();
  const managedDepts = portalState.managedDepartments;

  let roleScopeBadge = "";
  if (isSysAdmin) {
    roleScopeBadge = `<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-900 text-amber-400">🛡️ SYSTEM ADMIN (ALL ROSTERS)</span>`;
  } else if (managedDepts.length > 0) {
    roleScopeBadge = `<span class="px-2 py-0.5 rounded-full font-bold text-[10px] bg-blue-100 text-blue-900 border border-blue-200">👑 HEAD OF DEPT: ${esc(managedDepts.map(d => d.name).join(", "))}</span>`;
  }

  nameEl.textContent = discipleDoc.full_name || "Member";
  metaEl.innerHTML = `
    <span class="inline-flex flex-wrap items-center gap-2 mt-1">
      <span class="font-mono font-semibold text-slate-700">${esc(discipleDoc.member_id || "Member")}</span>
      <span>•</span>
      <span>${esc(discipleDoc.email || "")}</span>
      <span>•</span>
      <span class="px-2 py-0.5 border rounded-full font-bold text-[10px] ${djBadgeClass}">DJ: ${esc(djColor.toUpperCase())}</span>
      ${roleScopeBadge ? `<span>•</span>${roleScopeBadge}` : ""}
      <span>•</span>
      <span class="font-semibold text-slate-700">Upcoming Duties: ${portalState.myDuties.length} (${confirmedCount} Confirmed)</span>
    </span>
  `;
}

// --- 3. HEAD OF DEPT & SYSTEM ADMIN ROSTER MANAGER INSIDE MY PORTAL ---
function findAssignmentForPortalSlot(role, slot) {
  const baseName = String(role?.role_name || role?.name || "").trim();
  const exactBySlot = portalState.dateAssignments.find(
    a => a.slot_key === slot.slotKey || a.role_id === slot.slotKey
  );
  if (exactBySlot) return exactBySlot;

  if (slot.slotIndex === 1) {
    const matching = portalState.dateAssignments.filter(
      a => !a.slot_key && (a.role_id === role.id || a.role_name === baseName)
    );
    return matching[0] || null;
  }

  const matchingForRole = portalState.dateAssignments.filter(
    a => a.role_id === role.id || a.role_name === baseName || a.role_name === slot.displayLabel
  );
  return matchingForRole[slot.slotIndex - 1] || null;
}

function isDiscipleUnavailableOnDate(discipleId, serviceDate) {
  return portalState.allUnavailability.find(u => {
    if (u.disciple_id !== discipleId) return false;
    const start = u.start_date || u.unavailable_date || "";
    const end = u.end_date || start;
    return serviceDate >= start && serviceDate <= end;
  });
}

function discipleMatchesRoleInterest(disciple, role) {
  if (isUniversalSharedTask(role)) return true;
  const interests = Array.isArray(disciple?.ministry_interests) ? disciple.ministry_interests : [];
  const target = String(role?.role_name || role?.name || "").trim().toLowerCase();
  if (!target) return false;
  return interests.some(item => {
    const val = String(item || "").trim().toLowerCase();
    if (val === target) return true;
    if (target === "singer" && LEGACY_SINGER_NAMES.some(s => s.toLowerCase() === val)) return true;
    return false;
  });
}

function renderDepartmentRosterManagerInMyPortal() {
  const bodyEl = document.getElementById("member-selfservice-body");
  if (!bodyEl) return;

  let container = document.getElementById("my-portal-dept-roster-manager");
  if (!container) {
    container = document.createElement("div");
    container.id = "my-portal-dept-roster-manager";
    container.className = "mt-6";
    bodyEl.appendChild(container);
  }

  const managedDepts = portalState.managedDepartments;
  if (!managedDepts || managedDepts.length === 0) {
    container.innerHTML = "";
    return;
  }

  const isSysAdmin = isSystemAdminUser() || canManageChurchPortal();
  const sortedWeeks = [...portalState.weeks].sort((a, b) =>
    String(a.service_date || "").localeCompare(String(b.service_date || ""))
  );

  const dateOptions = sortedWeeks.map(w => `
    <option value="${esc(w.service_date)}" ${w.service_date === portalState.selectedRosterDate ? "selected" : ""}>
      ${esc(w.service_date)} — ${esc(w.title || "Sunday Celebration")}
    </option>
  `).join("");

  const deptCardsHtml = managedDepts.map(dept => {
    const deptRoles = portalState.allRoles.filter(r => roleMatchesDept(r, dept));
    if (deptRoles.length === 0) return "";

    const expandedSlots = deptRoles.flatMap(role =>
      buildRoleSlots(role).map(slot => ({ role, slot }))
    );

    const filledCount = expandedSlots.filter(({ role, slot }) =>
      Boolean(findAssignmentForPortalSlot(role, slot)?.disciple_id)
    ).length;

    const rowsHtml = expandedSlots.map(({ role, slot }) => {
      const current = findAssignmentForPortalSlot(role, slot);
      const selectedId = current?.disciple_id || "";
      const universal = isUniversalSharedTask(role);

      const sortedDisciples = [...portalState.allDisciples].sort((a, b) => {
        if (!universal) {
          const intA = discipleMatchesRoleInterest(a, role) ? 0 : 1;
          const intB = discipleMatchesRoleInterest(b, role) ? 0 : 1;
          if (intA !== intB) return intA - intB;
        }
        return String(a.full_name || "").localeCompare(String(b.full_name || ""));
      });

      const optionsHtml = sortedDisciples.map(d => {
        const unavail = isDiscipleUnavailableOnDate(d.id, portalState.selectedRosterDate);
        const interested = !universal && discipleMatchesRoleInterest(d, role);
        const flags = [
          interested ? "✨" : "",
          unavail ? "🚫 Unavail" : ""
        ].filter(Boolean).join(" ");
        return `<option value="${esc(d.id)}" ${d.id === selectedId ? "selected" : ""}>${esc(d.full_name)}${flags ? ` (${flags})` : ""}</option>`;
      }).join("");

      const statusBadge = selectedId
        ? `<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
            current?.status === "Confirmed"
              ? "bg-emerald-100 text-emerald-800"
              : current?.status === "Declined"
              ? "bg-red-100 text-red-800"
              : "bg-amber-100 text-amber-800"
          }">${esc(current?.status || "Assigned")}</span>`
        : `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Open</span>`;

      return `
        <div class="py-2 border-b border-slate-100 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-900">${esc(slot.displayLabel)}</p>
            <p class="text-[10px] text-slate-500">Min DJ: ${esc(role.min_dj_level || "Come")}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <select
              onchange="window.assignMyPortalRosterSlot('${esc(role.id)}', '${esc(slot.slotKey)}', this.value)"
              class="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white max-w-[220px]"
            >
              <option value="">— Unassigned —</option>
              ${optionsHtml}
            </select>
            ${statusBadge}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
        <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
          <h4 class="font-bold text-xs uppercase tracking-wider text-slate-800">${esc(dept.name)}</h4>
          <span class="text-[11px] font-bold text-slate-600">${filledCount}/${expandedSlots.length} filled</span>
        </div>
        <div>${rowsHtml}</div>
      </div>
    `;
  }).filter(Boolean).join("");

  container.innerHTML = `
    <div class="bg-white p-5 rounded-2xl border-2 ${isSysAdmin ? "border-slate-900" : "border-blue-200"} shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
            isSysAdmin ? "bg-slate-900 text-amber-400" : "bg-blue-100 text-blue-900"
          }">
            ${isSysAdmin ? "🛡️ System Admin — Full Roster Control" : "👑 Head of Dept — Department Roster Control"}
          </span>
          <h3 class="font-bold text-base text-slate-900 mt-1">
            ${isSysAdmin ? "All Departments Sunday Roster" : `Manage Roster: ${esc(managedDepts.map(d => d.name).join(", "))}`}
          </h3>
          <p class="text-xs text-slate-500">
            ${isSysAdmin
              ? "As System Admin, you can assign or modify roster slots across all departments."
              : "You can assign or update Sunday service roles for the department(s) under your leadership."}
          </p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <label for="my-portal-roster-date" class="text-xs font-bold text-slate-700">Service Date:</label>
          <select
            id="my-portal-roster-date"
            onchange="window.changeMyPortalRosterDate(this.value)"
            class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white"
          >
            ${dateOptions || `<option value="">No service dates</option>`}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        ${deptCardsHtml || `<p class="text-xs text-slate-500 col-span-full">No active roles found for your department scope.</p>`}
      </div>
    </div>
  `;
}

window.changeMyPortalRosterDate = async (serviceDate) => {
  if (!serviceDate) return;
  portalState.selectedRosterDate = serviceDate;
  portalState.dateAssignments = await getAssignmentsByDate(serviceDate).catch(() => []);
  renderDepartmentRosterManagerInMyPortal();
};

window.assignMyPortalRosterSlot = async (roleId, slotKey, discipleId) => {
  const role = portalState.allRoles.find(r => r.id === roleId);
  if (!role || !portalState.selectedRosterDate) return;

  const slots = buildRoleSlots(role);
  const slot = slots.find(s => s.slotKey === slotKey) || slots[0];
  const existing = findAssignmentForPortalSlot(role, slot);

  try {
    if (!discipleId) {
      if (existing?.id) {
        await deleteAssignment(existing.id);
      }
    } else {
      const disciple = portalState.allDisciples.find(d => d.id === discipleId);
      if (!disciple) return;
      const deptObj = portalState.allDepartments.find(
        d => d.id === (role.department_id || role.dept_id)
      );
      await upsertAssignment(existing?.id || null, {
        service_date: portalState.selectedRosterDate,
        department_id: role.department_id || role.dept_id || "",
        dept_id: role.department_id || role.dept_id || "",
        dept_name: deptObj?.name || role.dept_name || "",
        role_id: role.id,
        slot_key: slot.slotKey,
        slot_index: slot.slotIndex,
        role_name: slot.displayLabel,
        disciple_id: disciple.id,
        disciple_name: disciple.full_name,
        disciple_phone: disciple.phone || "",
        status: "Assigned"
      });
    }

    portalState.dateAssignments = await getAssignmentsByDate(portalState.selectedRosterDate).catch(() => []);
    renderDepartmentRosterManagerInMyPortal();

    const currentDisciple = portalState.profile?.discipleDoc;
    if (currentDisciple?.id && !currentDisciple._isAdminFallback) {
      const duties = await getMyAssignments(currentDisciple.id).catch(() => []);
      portalState.myDuties = duties.sort((a, b) =>
        String(a.service_date || "").localeCompare(String(b.service_date || ""))
      );
      renderMyProfileHeader(currentDisciple);
      renderMyDuties();
    }
  } catch (err) {
    alert("Failed to update roster slot: " + (err?.message || err));
  }
};

function renderMyDuties() {
  const container = document.getElementById("my-duties-list");
  if (!container) return;

  const serviceTime = portalState.churchProfile?.service_time || "4:30 PM";

  if (portalState.myDuties.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
        You have no upcoming ministry roster assignments yet.
      </div>
    `;
    return;
  }

  container.innerHTML = portalState.myDuties.map(d => {
    const insight = portalState.weeks.find(w => w.service_date === d.service_date);
    const status = d.status || "Pending";
    const statusStyle =
      status === "Confirmed"
        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
        : status === "Declined"
        ? "bg-red-100 text-red-800 border border-red-200"
        : "bg-amber-100 text-amber-800 border border-amber-200";

    const confirmBtnClass =
      status === "Confirmed"
        ? "bg-emerald-700 text-white ring-2 ring-emerald-300"
        : "bg-emerald-600 hover:bg-emerald-700 text-white";

    const declineBtnClass =
      status === "Declined"
        ? "bg-red-600 text-white ring-2 ring-red-200"
        : "bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700";

    return `
      <div class="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-mono font-bold px-2.5 py-0.5 bg-slate-900 text-amber-400 rounded">${esc(d.service_date)}</span>
            <span class="text-[11px] font-semibold text-slate-500">${esc(serviceTime)}</span>
            <span class="text-xs font-bold text-slate-900">${esc(d.role_name)}</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${statusStyle}">${esc(status)}</span>
          </div>
          ${d.dept_name || d.department_name ? `<p class="text-[11px] text-slate-500">Department: <strong class="text-slate-700">${esc(d.dept_name || d.department_name)}</strong></p>` : ""}
          ${insight ? `
            <p class="text-xs text-slate-600">
              📖 <strong>${esc(insight.title)}</strong>${insight.speaker ? ` • 🎙️ ${esc(insight.speaker)}` : ""}
            </p>
          ` : ""}
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button type="button" onclick="window.respondMyDuty('${esc(d.id)}', 'Confirmed')" class="px-3 py-1.5 text-xs font-bold rounded-lg transition ${confirmBtnClass}">
            ✅ Confirm
          </button>
          <button type="button" onclick="window.respondMyDuty('${esc(d.id)}', 'Declined')" class="px-3 py-1.5 text-xs font-semibold rounded-lg transition ${declineBtnClass}">
            ❌ Decline
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function formatDateRangeLabel(start, end) {
  return !end || start === end ? start : `${start} → ${end}`;
}

function renderMyBlockouts() {
  const container = document.getElementById("my-blockouts-list");
  if (!container) return;

  if (portalState.myBlockouts.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500">No upcoming unavailable dates set.</p>`;
    return;
  }

  container.innerHTML = portalState.myBlockouts.map(b => `
    <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs">
      <div>
        <span class="font-mono font-bold text-red-700">${esc(formatDateRangeLabel(b.start_date, b.end_date))}</span>
        ${b.reason ? `<span class="text-slate-600 ml-1.5">— ${esc(b.reason)}</span>` : ""}
      </div>
      <button type="button" onclick="window.deleteMyBlockout('${esc(b.id)}')" class="text-red-600 hover:underline font-medium shrink-0">Remove</button>
    </div>
  `).join("");
}

function bindMemberPortalEvents() {
  if (portalState.memberEventsBound) return;
  portalState.memberEventsBound = true;

  document.getElementById("form-my-blockout")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const discipleDoc = portalState.profile?.discipleDoc;
    if (!discipleDoc || discipleDoc._isAdminFallback) return;

    const fromDate = document.getElementById("my-blockout-from").value;
    const toDate = document.getElementById("my-blockout-to").value || fromDate;
    const reason = document.getElementById("my-blockout-reason").value.trim();
    if (!fromDate) return;

    if (toDate < fromDate) {
      alert("'To Date' cannot be earlier than 'From Date'.");
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    try {
      await addUnavailability({
        disciple_id: discipleDoc.id,
        disciple_name: discipleDoc.full_name,
        start_date: fromDate,
        end_date: toDate,
        reason
      });
      e.target.reset();
      await refreshMemberSelfService();
    } catch (err) {
      alert("Failed to save unavailable date: " + (err?.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  document.getElementById("form-my-profile")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const discipleDoc = portalState.profile?.discipleDoc;
    if (!discipleDoc || discipleDoc._isAdminFallback) return;

    const phone = document.getElementById("my-phone-input").value.trim();
    const address = document.getElementById("my-address-input").value.trim();
    const interests = Array.from(
      document.querySelectorAll('input[name="my-interest-role"]:checked')
    ).map(cb => cb.value.trim()).filter(Boolean);

    const btn = e.target.querySelector('button[type="submit"]');
    const origText = btn?.textContent || "Save Changes";
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Saving...";
    }

    try {
      await updateMyContactProfile(discipleDoc.id, {
        phone,
        address,
        ministry_interests: interests
      });
      portalState.profile.discipleDoc.phone = phone;
      portalState.profile.discipleDoc.address = address;
      portalState.profile.discipleDoc.ministry_interests = interests;
      if (btn) btn.textContent = "✅ Saved!";
      setTimeout(() => {
        if (btn) btn.textContent = origText;
      }, 2000);
    } catch (err) {
      if (btn) btn.textContent = origText;
      alert("Failed to update profile: " + (err?.message || err));
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

window.respondMyDuty = async (assignmentId, status) => {
  try {
    await respondToAssignment(assignmentId, status);
    await refreshMemberSelfService();
  } catch (err) {
    alert("Failed to update duty status: " + (err?.message || err));
  }
};

window.deleteMyBlockout = async (id) => {
  try {
    await deleteUnavailability(id);
    await refreshMemberSelfService();
  } catch (err) {
    alert("Failed to remove unavailable date: " + (err?.message || err));
  }
};
