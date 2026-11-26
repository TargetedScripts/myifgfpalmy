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
import { addUnavailability, deleteUnavailability } from "./db-roster.js";

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

function isUniversalSharedTask(roleName = "") {
  const n = String(roleName || "").toLowerCase();
  return (
    n.includes("cuci piring") ||
    n.includes("dishwash") ||
    n.includes("dish wash") ||
    n.includes("dishes") ||
    n.includes("vacuum")
  );
}

function extractRoleLabel(r = {}) {
  const direct =
    r.role_name ?? r.name ?? r.title ?? r.role ?? r.label ?? r.nama ?? r.roleName;
  if (direct) return String(direct).trim();

  const skipKeys = new Set([
    "id",
    "church_id",
    "department_id",
    "dept_id",
    "created_at",
    "updated_at",
    "created_at_iso"
  ]);
  for (const [k, v] of Object.entries(r)) {
    if (!skipKeys.has(k) && typeof v === "string" && v.trim().length > 0 && v.trim().length < 60) {
      return v.trim();
    }
  }
  return "";
}

async function fetchSelectableMinistryRoles() {
  try {
    let items = [];

    // 1. Cek koleksi "roles" jika ada isinya
    const roleSnap = await getDocs(collection(db, "roles"));
    if (!roleSnap.empty) {
      items = roleSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.active !== false && r.is_active !== false && r.enabled !== false)
        .map(r => ({
          ...r,
          _label: extractRoleLabel(r),
          _isUniversal: isUniversalSharedTask(extractRoleLabel(r))
        }))
        .filter(r => r._label);
    }

    // 2. Jika koleksi "roles" kosong, ambil dari array apa pun di koleksi "departments"
    if (items.length === 0) {
      const deptSnap = await getDocs(collection(db, "departments"));
      const seen = new Set();

      deptSnap.docs.forEach(d => {
        const data = d.data();
        if (data.active === false || data.is_active === false || data.enabled === false) return;

        let extractedAnyRoleFromDept = false;
        Object.values(data).forEach(val => {
          if (Array.isArray(val)) {
            val.forEach(raw => {
              const label = typeof raw === "string" ? raw.trim() : extractRoleLabel(raw);
              if (label && !seen.has(label.toLowerCase())) {
                seen.add(label.toLowerCase());
                extractedAnyRoleFromDept = true;
                items.push({
                  id: `${d.id}_${label}`,
                  _label: label,
                  _isUniversal: isUniversalSharedTask(label)
                });
              }
            });
          }
        });

        // Fallback jika dokumen department tidak punya array role, pakai nama department-nya
        if (!extractedAnyRoleFromDept) {
          const deptLabel = String(
            data.department_name ?? data.name ?? data.title ?? data.label ?? ""
          ).trim();
          if (deptLabel && !seen.has(deptLabel.toLowerCase())) {
            seen.add(deptLabel.toLowerCase());
            items.push({
              id: d.id,
              _label: deptLabel,
              _isUniversal: isUniversalSharedTask(deptLabel)
            });
          }
        }
      });
    }

    return items.sort((a, b) => {
      if (a._isUniversal !== b._isUniversal) return a._isUniversal ? 1 : -1;
      const orderA = Number.isFinite(Number(a.sort_order ?? a.order ?? a.display_order))
        ? Number(a.sort_order ?? a.order ?? a.display_order)
        : 999;
      const orderB = Number.isFinite(Number(b.sort_order ?? b.order ?? b.display_order))
        ? Number(b.sort_order ?? b.order ?? b.display_order)
        : 999;
      if (orderA !== orderB) return orderA - orderB;
      return a._label.localeCompare(b._label);
    });
  } catch (err) {
    console.warn("fetchSelectableMinistryRoles fallback:", err);
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
      getDocs(collection(db, "roles")).catch(() => null)
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

function canManageChurchPortal() {
  const level = portalState.profile?.accessLevel || "";
  return level === "super_admin" || level === "coordinator";
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
    <!-- COMPACT CHURCH HUB HEADER -->
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

    <!-- MAIN 1-SCREEN GRID -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- LEFT 2 COLUMNS: ANNOUNCEMENT BOARD + NEXT SERVICE -->
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

        <!-- NEXT SUNDAY SERVICE SNAPSHOT -->
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

      <!-- RIGHT COLUMN: TODAY'S REFLECTION + HUB SNAPSHOT -->
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
  const discipleDoc = portalState.profile?.discipleDoc;
  const unregBanner = document.getElementById("member-unregistered-notice");
  const selfServiceBody = document.getElementById("member-selfservice-body");

  if (!discipleDoc) {
    unregBanner?.classList.remove("hidden");
    selfServiceBody?.classList.add("hidden");
    return;
  }

  unregBanner?.classList.add("hidden");
  selfServiceBody?.classList.remove("hidden");

  const [duties, blockouts, selectableRoles] = await Promise.all([
    getMyAssignments(discipleDoc.id),
    getMyUnavailability(discipleDoc.id),
    fetchSelectableMinistryRoles()
  ]);

  const todayISO = getAucklandTodayISO();
  portalState.myDuties = duties.sort((a, b) =>
    String(a.service_date || "").localeCompare(String(b.service_date || ""))
  );
  portalState.myBlockouts = blockouts
    .filter(b => (b.end_date || b.start_date || "") >= todayISO)
    .sort((a, b) => String(a.start_date || "").localeCompare(String(b.start_date || "")));
  portalState.selectableRoles = selectableRoles;

  renderMyProfileHeader(discipleDoc);
  const phoneInput = document.getElementById("my-phone-input");
  const addressInput = document.getElementById("my-address-input");
  if (phoneInput) phoneInput.value = discipleDoc.phone || "";
  if (addressInput) addressInput.value = discipleDoc.address || "";
  renderMyInterestsChecklist(discipleDoc.ministry_interests || []);

  renderMyDuties();
  renderMyBlockouts();
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
    return normalizedSaved.some(saved => {
      if (saved === target) return true;
      if (target === "drummer" && saved === "drum") return true;
      if (target === "multi media" && saved.includes("multimedia")) return true;
      if (target === "sound system" && saved.includes("sound")) return true;
      return false;
    });
  };

  container.innerHTML = roles.map(r => {
    const roleName = r._label || extractRoleLabel(r);
    const isUniversal = Boolean(r._isUniversal || isUniversalSharedTask(roleName));

    if (isUniversal) {
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

  nameEl.textContent = discipleDoc.full_name || "Member";
  metaEl.innerHTML = `
    <span class="inline-flex flex-wrap items-center gap-2 mt-1">
      <span class="font-mono font-semibold text-slate-700">${esc(discipleDoc.member_id || "Member")}</span>
      <span>•</span>
      <span>${esc(discipleDoc.email || "")}</span>
      <span>•</span>
      <span class="px-2 py-0.5 border rounded-full font-bold text-[10px] ${djBadgeClass}">DJ: ${esc(djColor.toUpperCase())}</span>
      <span>•</span>
      <span class="font-semibold text-slate-700">Upcoming Duties: ${portalState.myDuties.length} (${confirmedCount} Confirmed)</span>
    </span>
  `;
}

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
          ${d.department_name ? `<p class="text-[11px] text-slate-500">Department: <strong class="text-slate-700">${esc(d.department_name)}</strong></p>` : ""}
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
    if (!discipleDoc) return;

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
    if (!discipleDoc) return;

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
