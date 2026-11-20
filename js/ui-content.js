// js/ui-content.js
import { seed2027Curriculum } from "./seed-2027.js";
import { seedNovDec2026Compass } from "./seed-2026-compass.js";
import { seedNov20toDec31Devotions } from "./seed-devotions-nov2026.js";
import {
  getMonthlyThemes,
  getWeeklyInsights,
  saveWeeklyInsight,
  getDailyDevotions,
  saveDailyDevotion,
  getMediaGalleries,
  saveMediaGallery,
  deleteContentItem
} from "./db-content.js";
import { initPublicPortal } from "./ui-portal.js";

let contentState = {
  months: [],
  weeks: [],
  devotions: [],
  media: []
};

export async function initContentStudio() {
  bindContentEvents();
  await refreshContentData();
}

async function refreshContentData() {
  const [months, weeks, devotions, media] = await Promise.all([
    getMonthlyThemes(),
    getWeeklyInsights(),
    getDailyDevotions(),
    getMediaGalleries()
  ]);

  contentState.months = months;
  contentState.weeks = weeks;
  contentState.devotions = devotions;
  contentState.media = media;

  populateMonthFilter();
  renderMonthlyThemes();
  renderWeeklyInsights();
  renderDevotions();
  renderMedia();
}

function populateMonthFilter() {
  const select = document.getElementById("filter-content-month");
  if (!select) return;
  const current = select.value || "ALL";
  select.innerHTML =
    `<option value="ALL">All Scheduled Weeks (${contentState.weeks.length})</option>` +
    contentState.months
      .map(m => `<option value="${m.month_key}">${m.month_key} — ${m.title}</option>`)
      .join("");
  select.value = current;
}

function renderMonthlyThemes() {
  const container = document.getElementById("list-monthly-themes");
  if (!container) return;

  if (contentState.months.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500 col-span-full">Click "✨ Seed Nov–Dec 2026" or "📖 Seed 2027 Curriculum" to populate monthly themes.</div>`;
    return;
  }

  container.innerHTML = contentState.months.map(m => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">${m.month_key}</span>
        <span class="text-[11px] font-semibold text-amber-700">${m.phase}</span>
      </div>
      <h3 class="font-bold text-slate-900 text-base">${m.title}</h3>
      ${m.subtitle ? `<p class="text-[11px] text-slate-600">${m.subtitle}</p>` : ""}
      <p class="text-xs text-slate-600">📖 <strong>${m.scripture}</strong></p>
      <p class="text-xs text-slate-500">Pillar: <span class="font-medium text-slate-800">${m.pillar}</span></p>
    </div>
  `).join("");
}

function renderWeeklyInsights() {
  const container = document.getElementById("list-weekly-insights");
  if (!container) return;

  const filterMonth = document.getElementById("filter-content-month")?.value || "ALL";
  const filtered =
    filterMonth === "ALL"
      ? contentState.weeks
      : contentState.weeks.filter(w => w.month_key === filterMonth);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500">No weekly insights found for this filter.</div>`;
    return;
  }

  container.innerHTML = filtered.map(w => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">${w.service_date}</span>
          <span class="text-xs font-semibold text-amber-700">${w.week_label}</span>
          ${w.speaker ? `<span class="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">🎙️ ${w.speaker}</span>` : ""}
        </div>
        <button onclick="window.openWeeklyModal('${w.service_date}')" class="text-xs font-semibold text-blue-600 hover:underline">
          Edit Sermon & iCare
        </button>
      </div>
      <h4 class="font-bold text-slate-900">${w.title}</h4>
      <p class="text-xs text-slate-600">🔑 <strong>${w.key_verse}</strong> • Bacaan: ${w.scripture_reading}</p>
      <p class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">${w.weekly_focus}</p>
      ${w.diaspora_lens ? `<p class="text-[11px] text-blue-800">🌏 <strong>Diaspora Lens:</strong> ${w.diaspora_lens}</p>` : ""}
    </div>
  `).join("");
}

function renderDevotions() {
  const container = document.getElementById("list-devotions");
  if (!container) return;

  if (contentState.devotions.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500">No daily devotions published yet.</div>`;
    return;
  }

  container.innerHTML = contentState.devotions.map(d => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
      <div class="flex justify-between items-start">
        <div>
          <span class="text-xs font-mono text-slate-500">${d.devotion_date} • ${d.scripture}</span>
          <h4 class="font-bold text-slate-900">${d.title}</h4>
        </div>
        <button onclick="window.removeDevotion('${d.id}')" class="text-xs text-red-600 hover:underline">Delete</button>
      </div>
      <p class="text-xs text-slate-700 whitespace-pre-line">${d.reflection}</p>
      ${d.prayer ? `<p class="text-xs italic text-slate-600 pt-1 border-t border-slate-100">🙏 ${d.prayer}</p>` : ""}
    </div>
  `).join("");
}

function renderMedia() {
  const container = document.getElementById("list-media");
  if (!container) return;

  if (contentState.media.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500">No media galleries added yet.</div>`;
    return;
  }

  container.innerHTML = contentState.media.map(m => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
      <div>
        <span class="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-semibold">${m.category}</span>
        <span class="text-xs text-slate-500 ml-1">${m.event_date}</span>
        <h4 class="font-bold text-slate-900 mt-1">${m.title}</h4>
        <a href="${m.media_url}" target="_blank" rel="noopener" class="text-xs text-blue-600 hover:underline break-all">${m.media_url}</a>
      </div>
      <button onclick="window.removeMedia('${m.id}')" class="text-xs text-red-600 hover:underline shrink-0">Delete</button>
    </div>
  `).join("");
}

function bindContentEvents() {
  document.querySelectorAll(".content-subtab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".content-subtab").forEach(b => {
        b.classList.remove("bg-slate-900", "text-white");
        b.classList.add("bg-slate-100", "text-slate-700");
      });
      btn.classList.remove("bg-slate-100", "text-slate-700");
      btn.classList.add("bg-slate-900", "text-white");

      document.querySelectorAll(".content-subpanel").forEach(p => p.classList.add("hidden"));
      document.getElementById(`subpanel-${btn.dataset.subtab}`)?.classList.remove("hidden");
    });
  });

  document.getElementById("filter-content-month")?.addEventListener("change", renderWeeklyInsights);

  document.getElementById("btn-seed-2026-compass")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Seeding Nov–Dec 2026...";
    try {
      const res = await seedNovDec2026Compass();
      alert(`Success! Seeded ${res.months} Monthly Compass themes (Oct–Dec 2026) and ${res.weeks} Nov–Dec 2026 services.`);
      await refreshContentData();
      await initPublicPortal();
    } catch (err) {
      alert("Error seeding 2026 Compass: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "✨ Seed Nov–Dec 2026";
    }
  });

  document.getElementById("btn-seed-devotions-nov26")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Seeding 42 Devotions...";
    try {
      const count = await seedNov20toDec31Devotions();
      alert(`Success! Seeded ${count} Daily Devotions (20 Nov – 31 Dec 2026).`);
      await refreshContentData();
      await initPublicPortal();
    } catch (err) {
      alert("Error seeding devotions: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "🙏 Seed Devotions (Nov–Dec)";
    }
  });

  document.getElementById("btn-seed-2027")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Seeding 2027...";
    try {
      const res = await seed2027Curriculum();
      alert(`Success! Seeded ${res.months} Monthly Themes and ${res.weeks} Weekly Insights for 2027.`);
      await refreshContentData();
      await initPublicPortal();
    } catch (err) {
      alert("Error seeding 2027 curriculum: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "📖 Seed 2027 Curriculum";
    }
  });

  document.getElementById("form-weekly")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateKey = document.getElementById("wk-date").value;
    await saveWeeklyInsight(dateKey, {
      week_label: document.getElementById("wk-label").value.trim(),
      title: document.getElementById("wk-title").value.trim(),
      key_verse: document.getElementById("wk-verse").value.trim(),
      scripture_reading: document.getElementById("wk-reading").value.trim(),
      weekly_focus: document.getElementById("wk-focus").value.trim(),
      christ_connection: document.getElementById("wk-christ").value.trim(),
      mission_application: document.getElementById("wk-mission").value.trim(),
      diaspora_lens: document.getElementById("wk-diaspora").value.trim(),
      sermon_summary: document.getElementById("wk-summary").value.trim(),
      icare_questions: document.getElementById("wk-icare").value.trim(),
      status: document.getElementById("wk-status").value
    });
    document.getElementById("modal-weekly").classList.add("hidden");
    await refreshContentData();
    await initPublicPortal();
  });

  document.getElementById("form-devotion")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const devDate = document.getElementById("dev-date").value;
    await saveDailyDevotion(devDate || null, {
      devotion_date: devDate,
      title: document.getElementById("dev-title").value.trim(),
      scripture: document.getElementById("dev-verse").value.trim(),
      reflection: document.getElementById("dev-body").value.trim(),
      prayer: document.getElementById("dev-prayer").value.trim()
    });
    e.target.reset();
    await refreshContentData();
    await initPublicPortal();
  });

  document.getElementById("form-media")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveMediaGallery(null, {
      event_date: document.getElementById("med-date").value,
      title: document.getElementById("med-title").value.trim(),
      category: document.getElementById("med-cat").value,
      media_url: document.getElementById("med-url").value.trim(),
      cover_url: document.getElementById("med-cover").value.trim()
    });
    e.target.reset();
    await refreshContentData();
    await initPublicPortal();
  });
}

window.openWeeklyModal = (serviceDate) => {
  const w = contentState.weeks.find(x => x.service_date === serviceDate);
  if (!w) return;
  document.getElementById("wk-date").value = w.service_date;
  document.getElementById("wk-label").value = w.week_label || "";
  document.getElementById("wk-title").value = w.title || "";
  document.getElementById("wk-verse").value = w.key_verse || "";
  document.getElementById("wk-reading").value = w.scripture_reading || "";
  document.getElementById("wk-focus").value = w.weekly_focus || "";
  document.getElementById("wk-christ").value = w.christ_connection || "";
  document.getElementById("wk-mission").value = w.mission_application || "";
  document.getElementById("wk-diaspora").value = w.diaspora_lens || "";
  document.getElementById("wk-summary").value = w.sermon_summary || "";
  document.getElementById("wk-icare").value = w.icare_questions || "";
  document.getElementById("wk-status").value = w.status || "Scheduled";
  document.getElementById("modal-weekly").classList.remove("hidden");
};

window.removeDevotion = async (id) => {
  if (!confirm("Delete this devotion?")) return;
  await deleteContentItem("daily_devotions", id);
  await refreshContentData();
};

window.removeMedia = async (id) => {
  if (!confirm("Delete this media entry?")) return;
  await deleteContentItem("media_galleries", id);
  await refreshContentData();
};
