// js/ui-portal.js
import {
  getPublicMonthlyThemes,
  getPublicWeeklyInsights,
  getPublicDailyDevotions,
  getPublicMediaGalleries,
  getMyAssignments,
  respondToAssignment,
  getMyUnavailability,
  updateMyContactProfile
} from "./db-portal.js";
import { addUnavailability, deleteUnavailability } from "./db-roster.js";

let portalState = {
  profile: null,
  months: [],
  weeks: [],
  devotions: [],
  media: [],
  myDuties: [],
  myBlockouts: []
};

// --- 1. PUBLIC PORTAL INITIALIZER (GUEST & LOGGED-IN) ---
export async function initPublicPortal() {
  try {
    const [months, weeks, devotions, media] = await Promise.all([
      getPublicMonthlyThemes(),
      getPublicWeeklyInsights(),
      getPublicDailyDevotions(),
      getPublicMediaGalleries()
    ]);
    portalState.months = months;
    portalState.weeks = weeks;
    portalState.devotions = devotions;
    portalState.media = media;

    renderPublicFeed();
  } catch (err) {
    console.error("Public portal load error:", err);
  }
}

function getAucklandTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function renderPublicFeed() {
  const todayISO = getAucklandTodayISO();
  const currentMonthKey = todayISO.slice(0, 7);

  const activeMonth =
    portalState.months.find(m => m.month_key === currentMonthKey) ||
    portalState.months[0];

  const monthBox = document.getElementById("public-monthly-banner");
  if (monthBox && activeMonth) {
    monthBox.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 mb-1">
        <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300">${activeMonth.phase}</span>
        <span class="text-xs font-mono text-slate-300">${activeMonth.month_key}</span>
      </div>
      <h3 class="text-xl font-bold text-white">${activeMonth.title}</h3>
      <p class="text-xs text-slate-300 mt-1">📖 <strong>${activeMonth.scripture}</strong> • Pillar: <span class="text-amber-300 font-semibold">${activeMonth.pillar}</span></p>
    `;
  }

  const upcomingWeeks = portalState.weeks
    .filter(w => w.service_date >= todayISO)
    .slice(0, 4);

  const weeklyContainer = document.getElementById("public-upcoming-services");
  if (weeklyContainer) {
    if (upcomingWeeks.length === 0) {
      weeklyContainer.innerHTML = `<p class="text-xs text-slate-500">No upcoming service themes scheduled yet.</p>`;
    } else {
      weeklyContainer.innerHTML = upcomingWeeks.map((w, idx) => `
        <div class="bg-white p-4 rounded-xl border ${idx === 0 ? "border-amber-400 ring-1 ring-amber-200" : "border-slate-200"} shadow-sm space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded">${w.service_date}</span>
            <span class="text-[11px] font-semibold text-amber-700">${idx === 0 ? "NEXT SERVICE • " : ""}${w.week_label}</span>
          </div>
          <h4 class="font-bold text-slate-900 text-base">${w.title}</h4>
          <p class="text-xs text-slate-600">🔑 <strong>${w.key_verse}</strong> • Bacaan: ${w.scripture_reading}</p>
          <p class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">${w.weekly_focus}</p>
          ${w.diaspora_lens ? `<p class="text-[11px] text-blue-800">🌏 <strong>Lensa Diaspora:</strong> ${w.diaspora_lens}</p>` : ""}
        </div>
      `).join("");
    }
  }

  const devContainer = document.getElementById("public-devotions-list");
  if (devContainer) {
    if (portalState.devotions.length === 0) {
      devContainer.innerHTML = `<div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">Daily devotions will be published soon. Check back shortly!</div>`;
    } else {
      devContainer.innerHTML = portalState.devotions.slice(0, 3).map(d => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
          <span class="text-[11px] font-mono text-slate-500">${d.devotion_date} • ${d.scripture}</span>
          <h4 class="font-bold text-sm text-slate-900">${d.title}</h4>
          <p class="text-xs text-slate-700 whitespace-pre-line">${d.reflection}</p>
          ${d.prayer ? `<p class="text-xs italic text-slate-600 pt-1 border-t border-slate-100">🙏 ${d.prayer}</p>` : ""}
        </div>
      `).join("");
    }
  }

  const mediaContainer = document.getElementById("public-media-list");
  if (mediaContainer) {
    if (portalState.media.length === 0) {
      mediaContainer.innerHTML = `<div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">No media albums posted yet.</div>`;
    } else {
      mediaContainer.innerHTML = portalState.media.slice(0, 4).map(m => `
        <a href="${m.media_url}" target="_blank" rel="noopener" class="block bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 transition">
          <span class="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-bold">${m.category}</span>
          <h4 class="font-bold text-sm text-slate-900 mt-1.5">${m.title}</h4>
          <p class="text-[11px] text-slate-500 mt-0.5">${m.event_date} • Open Link ↗</p>
        </a>
      `).join("");
    }
  }
}

// --- 2. MEMBER SELF-SERVICE PORTAL (LOGGED-IN USER) ---
export async function initMemberSelfService(profile) {
  portalState.profile = profile;
  bindMemberPortalEvents();
  await refreshMemberSelfService();
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

  document.getElementById("my-profile-name").textContent = discipleDoc.full_name || "";
  document.getElementById("my-profile-meta").textContent =
    `${discipleDoc.member_id || "Member"} • ${discipleDoc.email} • DJ Status: ${(discipleDoc.dj_traffic_light || "red").toUpperCase()}`;
  document.getElementById("my-phone-input").value = discipleDoc.phone || "";
  document.getElementById("my-address-input").value = discipleDoc.address || "";
  document.getElementById("my-interests-input").value = (discipleDoc.ministry_interests || []).join(", ");

  const [duties, blockouts] = await Promise.all([
    getMyAssignments(discipleDoc.id),
    getMyUnavailability(discipleDoc.id)
  ]);
  portalState.myDuties = duties;
  portalState.myBlockouts = blockouts;

  renderMyDuties();
  renderMyBlockouts();
}

function renderMyDuties() {
  const container = document.getElementById("my-duties-list");
  if (!container) return;

  if (portalState.myDuties.length === 0) {
    container.innerHTML = `<div class="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">You have no upcoming ministry roster assignments yet.</div>`;
    return;
  }

  container.innerHTML = portalState.myDuties.map(d => {
    const insight = portalState.weeks.find(w => w.service_date === d.service_date);
    const statusStyle =
      d.status === "Confirmed"
        ? "badge-green"
        : d.status === "Declined"
        ? "badge-red"
        : "badge-amber";

    return `
      <div class="p-3.5 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded">${d.service_date}</span>
            <span class="text-xs font-bold text-slate-900">${d.role_name}</span>
            <span class="text-[11px] px-2 py-0.5 rounded-full font-semibold ${statusStyle}">${d.status}</span>
          </div>
          ${insight ? `<p class="text-xs text-slate-500 mt-1">📖 Tema: ${insight.title}</p>` : ""}
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center">
          <button onclick="window.respondMyDuty('${d.id}', 'Confirmed')" class="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
            ✅ Confirm
          </button>
          <button onclick="window.respondMyDuty('${d.id}', 'Declined')" class="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 rounded-lg">
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
    container.innerHTML = `<p class="text-xs text-slate-500">No unavailable dates set.</p>`;
    return;
  }

  container.innerHTML = portalState.myBlockouts.map(b => `
    <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs">
      <div>
        <span class="font-mono font-bold text-red-700">${formatDateRangeLabel(b.start_date, b.end_date)}</span>
        ${b.reason ? `<span class="text-slate-600 ml-1.5">— ${b.reason}</span>` : ""}
      </div>
      <button onclick="window.deleteMyBlockout('${b.id}')" class="text-red-600 hover:underline font-medium shrink-0">Remove</button>
    </div>
  `).join("");
}

function bindMemberPortalEvents() {
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

    await addUnavailability({
      disciple_id: discipleDoc.id,
      disciple_name: discipleDoc.full_name,
      start_date: fromDate,
      end_date: toDate,
      reason
    });
    e.target.reset();
    await refreshMemberSelfService();
  });

  document.getElementById("form-my-profile")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const discipleDoc = portalState.profile?.discipleDoc;
    if (!discipleDoc) return;

    const phone = document.getElementById("my-phone-input").value.trim();
    const address = document.getElementById("my-address-input").value.trim();
    const interests = document
      .getElementById("my-interests-input")
      .value.split(",")
      .map(s => s.trim())
      .filter(Boolean);

    await updateMyContactProfile(discipleDoc.id, {
      phone,
      address,
      ministry_interests: interests
    });
    portalState.profile.discipleDoc.phone = phone;
    portalState.profile.discipleDoc.address = address;
    portalState.profile.discipleDoc.ministry_interests = interests;
    alert("Your profile has been updated!");
  });
}

window.respondMyDuty = async (assignmentId, status) => {
  await respondToAssignment(assignmentId, status);
  await refreshMemberSelfService();
};

window.deleteMyBlockout = async (id) => {
  await deleteUnavailability(id);
  await refreshMemberSelfService();
};
