// js/ui-content.js
import {
  getMonthlyThemes,
  saveMonthlyTheme,
  getWeeklyInsights,
  saveWeeklyInsight,
  getDailyDevotions,
  saveDailyDevotion,
  getMediaGalleries,
  saveMediaGallery,
  deleteContentItem,
  seedCurriculum2027
} from "./db-content.js";

let contentState = {
  months: [],
  weeks: [],
  devotions: [],
  media: [],
  subTab: "weekly",
  selectedMonthFilter: "ALL"
};

export async function initContentStudio() {
  bindContentEvents();
  await refreshContentData();
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

      contentState.subTab = btn.dataset.subtab;
      document.querySelectorAll(".content-subpanel").forEach(p => p.classList.add("hidden"));
      document.getElementById(`subpanel-${contentState.subTab}`)?.classList.remove("hidden");
    });
  });

  document.getElementById("filter-content-month")?.addEventListener("change", (e) => {
    contentState.selectedMonthFilter = e.target.value;
    renderWeeklyList();
  });

  document.getElementById("btn-seed-2027")?.addEventListener("click", async () => {
    if (!confirm("Seed complete 2027 Curriculum (12 Monthly Themes & 53 Sunday/Special Insights for Align in Purpose — Exodus)?")) return;
    const btn = document.getElementById("btn-seed-2027");
    btn.disabled = true;
    btn.textContent = "Seeding 2027...";
    try {
      await seedCurriculum2027();
      await refreshContentData();
      alert("2027 Curriculum seeded successfully (12 Months + 53 Services)!");
    } catch (err) {
      alert("Error seeding curriculum: " + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "📖 Seed 2027 Curriculum";
    }
  });

  // Save Weekly Insight Modal Form
  document.getElementById("form-weekly")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const serviceDate = document.getElementById("wk-date").value;
    const payload = {
      service_date: serviceDate,
      month_key: serviceDate.slice(0, 7),
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
    };
    await saveWeeklyInsight(serviceDate, payload);
    document.getElementById("modal-weekly").classList.add("hidden");
    await refreshContentData();
  });

  // Save Devotion Form
  document.getElementById("form-devotion")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateVal = document.getElementById("dev-date").value;
    await saveDailyDevotion(dateVal, {
      devotion_date: dateVal,
      title: document.getElementById("dev-title").value.trim(),
      scripture: document.getElementById("dev-verse").value.trim(),
      reflection: document.getElementById("dev-body").value.trim(),
      prayer: document.getElementById("dev-prayer").value.trim()
    });
    e.target.reset();
    await refreshContentData();
  });

  // Save Media Form
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
  });
}

export async function refreshContentData() {
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
  renderWeeklyList();
  renderDevotionsList();
  renderMediaList();
}

function populateMonthFilter() {
  const sel = document.getElementById("filter-content-month");
  if (!sel) return;
  const current = contentState.selectedMonthFilter;
  sel.innerHTML = `<option value="ALL">All Months (${contentState.weeks.length} Services)</option>` +
    contentState.months.map(m => `<option value="${m.month_key}">${m.month_key} — ${m.title} (${m.scripture})</option>`).join("");
  sel.value = current;
}

function renderMonthlyThemes() {
  const container = document.getElementById("list-monthly-themes");
  if (!container) return;
  if (contentState.months.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-500 bg-white rounded-xl border">No monthly themes yet. Click "📖 Seed 2027 Curriculum" above.</div>`;
    return;
  }
  container.innerHTML = contentState.months.map(m => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">${m.phase || "2027"}</span>
        <span class="text-xs font-mono text-slate-500">${m.month_key}</span>
      </div>
      <h3 class="font-bold text-slate-900 text-base">${m.title}</h3>
      <p class="text-xs text-slate-600">📖 <strong>${m.scripture}</strong> • Pillar: <span class="text-blue-700 font-semibold">${m.pillar}</span></p>
      <div class="pt-2 flex justify-end">
        <button onclick="window.editMonthlyBanner('${m.month_key}')" class="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium">Set Banner URL</button>
      </div>
    </div>
  `).join("");
}

function renderWeeklyList() {
  const container = document.getElementById("list-weekly-insights");
  if (!container) return;

  const list = contentState.selectedMonthFilter === "ALL"
    ? contentState.weeks
    : contentState.weeks.filter(w => w.month_key === contentState.selectedMonthFilter);

  if (list.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-500 bg-white rounded-xl border">No weekly insights found. Click "📖 Seed 2027 Curriculum" to load all 53 services.</div>`;
    return;
  }

  container.innerHTML = list.map(w => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-mono font-bold px-2 py-0.5 bg-slate-900 text-white rounded">${w.service_date}</span>
          <span class="text-xs font-semibold text-amber-700">${w.week_label}</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${w.status === "Published" ? "badge-green" : "bg-slate-100 text-slate-600"}">${w.status || "Scheduled"}</span>
        </div>
        <button onclick="window.openEditWeekly('${w.service_date}')" class="text-xs px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white font-semibold rounded-lg">
          Edit Sermon & iCare
        </button>
      </div>
      <div>
        <h3 class="font-bold text-slate-900 text-base">${w.title}</h3>
        <p class="text-xs text-slate-600 mt-0.5">🔑 <strong>${w.key_verse}</strong> • Bacaan: ${w.scripture_reading}</p>
      </div>
      <p class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        <strong>Fokus:</strong> ${w.weekly_focus}<br/>
        <span class="text-blue-800"><strong>Christ Connection:</strong> ${w.christ_connection}</span>
      </p>
      ${w.sermon_summary ? `<p class="text-xs text-emerald-800 font-medium">✅ Sermon Summary & iCare Guide filled</p>` : ""}
    </div>
  `).join("");
}

function renderDevotionsList() {
  const container = document.getElementById("list-devotions");
  if (!container) return;
  if (contentState.devotions.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500">No daily devotions published yet.</p>`;
    return;
  }
  container.innerHTML = contentState.devotions.map(d => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex justify-between items-start gap-3">
      <div>
        <span class="text-[11px] font-mono text-slate-500">${d.devotion_date} • ${d.scripture}</span>
        <h4 class="font-bold text-sm text-slate-900">${d.title}</h4>
        <p class="text-xs text-slate-600 mt-1 line-clamp-2">${d.reflection}</p>
      </div>
      <button onclick="window.removeContent('daily_devotions', '${d.id}')" class="text-xs text-red-600 hover:underline">Delete</button>
    </div>
  `).join("");
}

function renderMediaList() {
  const container = document.getElementById("list-media");
  if (!container) return;
  if (contentState.media.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500">No media galleries added yet.</p>`;
    return;
  }
  container.innerHTML = contentState.media.map(m => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex justify-between items-center gap-3">
      <div>
        <span class="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-semibold">${m.category}</span>
        <span class="text-[11px] font-mono text-slate-500 ml-1">${m.event_date}</span>
        <h4 class="font-bold text-sm text-slate-900 mt-1">${m.title}</h4>
        <a href="${m.media_url}" target="_blank" class="text-xs text-blue-600 underline break-all">${m.media_url}</a>
      </div>
      <button onclick="window.removeContent('media_galleries', '${m.id}')" class="text-xs text-red-600 hover:underline">Delete</button>
    </div>
  `).join("");
}

window.openEditWeekly = (serviceDate) => {
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

window.editMonthlyBanner = async (monthKey) => {
  const m = contentState.months.find(x => x.month_key === monthKey);
  if (!m) return;
  const url = prompt(`Banner Image URL for ${m.title} (${monthKey}):`, m.banner_url || "");
  if (url !== null) {
    await saveMonthlyTheme(monthKey, { banner_url: url.trim() });
    await refreshContentData();
  }
};

window.removeContent = async (colName, id) => {
  if (!confirm("Delete this item?")) return;
  await deleteContentItem(colName, id);
  await refreshContentData();
};
