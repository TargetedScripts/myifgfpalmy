// js/ui-content.js
import {
  getMonthlyThemes,
  getWeeklyInsights,
  saveWeeklyInsight,
  getDailyReflections,
  saveDailyReflection,
  getMediaGalleries,
  saveMediaGallery,
  deleteContentItem,
  getEditorsInsights,
  saveEditorsInsight,
  deleteEditorsInsight,
  parseEditorInsightRawText,
  getSundayServices,
  saveSundayService,
  deleteSundayService
} from "./db-content.js";
import { initPublicPortal } from "./ui-portal.js";

let contentState = {
  months: [],
  weeks: [],
  reflections: [],
  media: [],
  editorsInsights: [],
  sundayServices: [],
  parsedDraft: null
};

const ID_MONTHS = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

function computeEditorDateLabels(startDateStr) {
  if (!startDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(startDateStr)) {
    return { date_label: "", header_date: "" };
  }
  const [y, m, d] = startDateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const end = new Date(Date.UTC(y, m - 1, d + 6));

  const sDay = start.getUTCDate();
  const sMonth = ID_MONTHS[start.getUTCMonth()];
  const sYear = start.getUTCFullYear();

  const eDay = end.getUTCDate();
  const eMonth = ID_MONTHS[end.getUTCMonth()];
  const eYear = end.getUTCFullYear();

  const header_date = `${sDay} ${sMonth} ${sYear}`;
  let date_label = "";
  if (sYear !== eYear) {
    date_label = `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
  } else if (sMonth !== eMonth) {
    date_label = `${sDay} ${sMonth} – ${eDay} ${eMonth} ${eYear}`;
  } else {
    date_label = `${sDay} – ${eDay} ${sMonth} ${sYear}`;
  }

  return { date_label, header_date };
}

function ensureWeeklyPosterFields() {
  const form = document.getElementById("form-weekly");
  if (!form || document.getElementById("wk-speaker")) return;

  const focusField = document.getElementById("wk-focus")?.parentElement;
  if (!focusField) return;

  const extraRow = document.createElement("div");
  extraRow.className = "grid grid-cols-1 sm:grid-cols-3 gap-2";
  extraRow.innerHTML = `
    <div>
      <label class="font-semibold text-slate-600">Speaker / Pembicara</label>
      <input type="text" id="wk-speaker" placeholder="e.g., Ps. Jack Christi Nussi" class="w-full px-3 py-2 border rounded-lg" />
    </div>
    <div>
      <label class="font-semibold text-slate-600">Sunday Poster Image URL</label>
      <input type="url" id="wk-poster" placeholder="https://.../poster.jpg" class="w-full px-3 py-2 border rounded-lg" />
    </div>
    <div>
      <label class="font-semibold text-slate-600">YouTube Sermon / Live URL</label>
      <input type="url" id="wk-youtube" placeholder="https://youtube.com/watch?v=..." class="w-full px-3 py-2 border rounded-lg" />
    </div>
  `;
  focusField.parentElement.insertBefore(extraRow, focusField);
}

function ensureEditorsInsightStudioUI() {
  const subtabBar = document.querySelector(".content-subtab")?.parentElement;
  const mediaPanel = document.getElementById("subpanel-media");
  if (!subtabBar || !mediaPanel || document.getElementById("subpanel-editors")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "editors";
  tabBtn.textContent = "✍️ The Editor's Insight";
  subtabBar.appendChild(tabBtn);

  const panel = document.createElement("div");
  panel.id = "subpanel-editors";
  panel.className = "content-subpanel hidden grid grid-cols-1 lg:grid-cols-12 gap-4";
  panel.innerHTML = `
    <div class="lg:col-span-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-sm text-slate-900">✍️ Smart Paste — The Editor's Insight</h3>
        <button type="button" id="btn-reset-editor-insight" class="text-[11px] text-slate-500 hover:underline">Reset Form</button>
      </div>
      <p class="text-[11px] text-slate-500">Tempel teks renungan utuh di bawah. Sistem otomatis memisahkan Judul, Ayat, Sticky Hook Inggris, 3 Paragraf (tanpa Shalom / Tuhan Yesus Memberkati), dan Takeaways 1–4.</p>

      <input type="hidden" id="ei-edit-id" value="" />
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label class="font-semibold text-slate-600">Start Date (Senin) *</label>
          <input type="date" id="ei-start-date" value="2026-11-23" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Edition No *</label>
          <input type="text" id="ei-edition-no" value="NO. II.45" placeholder="NO. II.45" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Date Label</label>
          <input type="text" id="ei-date-label" value="23 – 29 NOVEMBER 2026" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Header Date</label>
          <input type="text" id="ei-header-date" value="23 NOVEMBER 2026" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
      </div>

      <div>
        <label class="font-semibold text-slate-600">Paste Materi Utuh di Sini *</label>
        <textarea id="ei-raw-text" rows="11" placeholder="Tempel teks lengkap beserta **Judul**, *Ayat*, Shalom, isi paragraf dengan **English Hook**, dan Tuhan Yesus Memberkati." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-0.5 font-sans leading-relaxed"></textarea>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button type="button" id="btn-parse-editor-insight" class="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg">
          ⚡ Auto-Parse & Preview
        </button>
        <button type="button" id="btn-save-editor-insight" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
          💾 Save to Firestore
        </button>
        <span id="ei-status-msg" class="text-[11px] font-medium text-slate-600"></span>
      </div>

      <div id="ei-parsed-preview" class="hidden p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px]"></div>
    </div>

    <div class="lg:col-span-6 space-y-2.5">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-sm text-slate-900">📚 Published Editor's Insights</h3>
        <span id="ei-count-badge" class="text-xs text-slate-500"></span>
      </div>
      <div id="list-editors-insights" class="space-y-2.5"></div>
    </div>
  `;

  mediaPanel.parentElement.appendChild(panel);
}

function ensureSundayServicesStudioUI() {
  const subtabBar = document.querySelector(".content-subtab")?.parentElement;
  const mediaPanel = document.getElementById("subpanel-media");
  if (!subtabBar || !mediaPanel || document.getElementById("subpanel-sunday")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "sunday";
  tabBtn.textContent = "🎬 Sunday Services";
  subtabBar.appendChild(tabBtn);

  const panel = document.createElement("div");
  panel.id = "subpanel-sunday";
  panel.className = "content-subpanel hidden grid grid-cols-1 lg:grid-cols-12 gap-4";
  panel.innerHTML = `
    <div class="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">🎬 Sunday Service Poster & Cinema Data</h3>
        <button type="button" id="btn-reset-sunday-service" class="text-[11px] text-slate-500 hover:underline">New Entry</button>
      </div>
      <p class="text-[11px] text-slate-500">Kelola koleksi <code class="font-mono">sunday_services</code> untuk galeri model bioskop di <code class="font-mono">ifgfpalmy.org</code>.</p>

      <form id="form-sunday-service" class="space-y-2.5">
        <input type="hidden" id="ss-edit-id" value="" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Tanggal Ibadah *</label>
            <input type="date" id="ss-date" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Pembicara *</label>
            <input type="text" id="ss-speaker" required placeholder="e.g., Tikva Mooy" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Judul Ibadah / Seri *</label>
          <input type="text" id="ss-title" required placeholder="e.g., From Prison To Palace" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Poster Image URL *</label>
          <input type="url" id="ss-poster" required placeholder="https://ifgfpalmy.org/wp-content/uploads/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">YouTube URL (opsional)</label>
          <input type="url" id="ss-youtube" placeholder="https://www.youtube.com/live/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Post / Artikel URL (opsional)</label>
          <input type="url" id="ss-post" placeholder="https://ifgfpalmy.org/2026/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <label class="flex items-center gap-2 pt-1 cursor-pointer">
          <input type="checkbox" id="ss-published" checked class="rounded border-slate-300" />
          <span class="font-semibold text-slate-700">Published di Galeri Publik</span>
        </label>

        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" id="btn-save-sunday-service" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
            💾 Save Sunday Service
          </button>
          <span id="ss-status-msg" class="text-[11px] font-medium text-slate-600"></span>
        </div>
      </form>
    </div>

    <div class="lg:col-span-7 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">🎞️ Published Sunday Services (Cinema Gallery)</h3>
        <div class="flex items-center gap-2">
          <input type="text" id="ss-filter-query" placeholder="Cari tanggal, judul, pembicara..." class="px-2.5 py-1 border rounded-lg text-xs bg-white" />
          <span id="ss-count-badge" class="text-xs text-slate-500"></span>
        </div>
      </div>
      <div id="list-sunday-services" class="space-y-2.5"></div>
    </div>
  `;

  mediaPanel.parentElement.appendChild(panel);
}

function setEditorStatus(msg, isError = false) {
  const el = document.getElementById("ei-status-msg");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

function setSundayServiceStatus(msg, isError = false) {
  const el = document.getElementById("ss-status-msg");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

export async function initContentStudio() {
  ensureWeeklyPosterFields();
  ensureEditorsInsightStudioUI();
  ensureSundayServicesStudioUI();
  bindContentEvents();
  await refreshContentData();
}

async function refreshContentData() {
  const [months, weeks, reflections, media, editorsInsights, sundayServices] = await Promise.all([
    getMonthlyThemes(),
    getWeeklyInsights(),
    getDailyReflections(),
    getMediaGalleries(),
    getEditorsInsights().catch(err => {
      console.error("Failed to load editors_insights:", err);
      setEditorStatus("Gagal memuat editors_insights: " + (err.message || err), true);
      return [];
    }),
    getSundayServices().catch(err => {
      console.error("Failed to load sunday_services:", err);
      setSundayServiceStatus("Gagal memuat sunday_services: " + (err.message || err), true);
      return [];
    })
  ]);

  contentState.months = months;
  contentState.weeks = weeks;
  contentState.reflections = reflections;
  contentState.media = media;
  contentState.editorsInsights = editorsInsights;
  contentState.sundayServices = sundayServices;

  populateMonthFilter();
  renderMonthlyThemes();
  renderWeeklyInsights();
  renderReflections();
  renderMedia();
  renderEditorsInsightsList();
  renderSundayServicesList();
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
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500 col-span-full">No monthly themes found.</div>`;
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
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">${w.service_date}</span>
          <span class="text-xs font-semibold text-amber-700">${w.week_label}</span>
          ${w.speaker ? `<span class="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">🎙️ ${w.speaker}</span>` : ""}
          ${w.poster_url ? `<span class="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded font-semibold">🖼️ Poster</span>` : ""}
          ${w.youtube_url ? `<span class="text-[11px] px-2 py-0.5 bg-red-50 text-red-700 rounded font-semibold">▶️ YouTube</span>` : ""}
        </div>
        <button onclick="window.openWeeklyModal('${w.service_date}')" class="text-xs font-semibold text-blue-600 hover:underline">
          Edit Sermon, Poster & YouTube
        </button>
      </div>
      <h4 class="font-bold text-slate-900">${w.title}</h4>
      <p class="text-xs text-slate-600">🔑 <strong>${w.key_verse}</strong> • Bacaan: ${w.scripture_reading}</p>
      <p class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">${w.weekly_focus}</p>
      ${w.diaspora_lens ? `<p class="text-[11px] text-blue-800">🌏 <strong>Diaspora Lens:</strong> ${w.diaspora_lens}</p>` : ""}
    </div>
  `).join("");
}

function renderReflections() {
  const container = document.getElementById("list-devotions");
  if (!container) return;

  if (contentState.reflections.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500">No daily reflections published yet.</div>`;
    return;
  }

  container.innerHTML = contentState.reflections.map(d => {
    const dateLabel = d.reflection_date || d.devotion_date || d.id;
    return `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
        <div class="flex justify-between items-start">
          <div>
            <span class="text-xs font-mono text-slate-500">${dateLabel} • ${d.scripture}</span>
            <h4 class="font-bold text-slate-900">${d.title}</h4>
          </div>
          <button onclick="window.removeReflection('${d.id}')" class="text-xs text-red-600 hover:underline">Delete</button>
        </div>
        <p class="text-xs text-slate-700 whitespace-pre-line">${d.reflection}</p>
        ${d.prayer ? `<p class="text-xs italic text-slate-600 pt-1 border-t border-slate-100">🙏 ${d.prayer}</p>` : ""}
      </div>
    `;
  }).join("");
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

function renderParsedPreview(parsed) {
  const box = document.getElementById("ei-parsed-preview");
  if (!box || !parsed) return;

  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
      <span class="font-bold text-emerald-700">✅ Hasil Pemisahan Otomatis (${parsed.start_date || "No Date"} • ${parsed.edition_no || "-"})</span>
      <span class="text-slate-500">${parsed.paragraphs.length} paragraf • ${parsed.takeaways.length} takeaways</span>
    </div>
    <div><strong>Title:</strong> ${parsed.title || "-"}</div>
    <div><strong>Scripture:</strong> ${parsed.scripture || "-"}</div>
    <div class="p-2 bg-amber-50 border border-amber-200 rounded text-amber-950">
      <strong>Sticky Hook:</strong> "${parsed.sticky_hook || "-"}"
    </div>
    <div class="space-y-1">
      <strong>Paragraphs (bersih):</strong>
      ${parsed.paragraphs.map((p, idx) => `<p class="p-1.5 bg-white rounded border border-slate-200"><strong>P${idx + 1}:</strong> ${p}</p>`).join("")}
    </div>
    <div class="space-y-1">
      <strong>Takeaways:</strong>
      ${parsed.takeaways.map(t => `<p class="p-1.5 bg-white rounded border border-slate-200"><strong>${t.title}:</strong> ${t.desc}</p>`).join("")}
    </div>
  `;
}

function renderEditorsInsightsList() {
  const container = document.getElementById("list-editors-insights");
  const badge = document.getElementById("ei-count-badge");
  if (!container) return;

  if (badge) badge.textContent = `${contentState.editorsInsights.length} editions`;

  if (contentState.editorsInsights.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">Belum ada edisi The Editor's Insight. Tempel teks utuh di formulir kiri lalu klik Save.</div>`;
    return;
  }

  container.innerHTML = contentState.editorsInsights.map(item => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div class="flex items-start justify-between gap-2">
        <div>
          <span class="px-2 py-0.5 bg-slate-900 text-amber-400 font-bold rounded text-[10px]">${item.edition_no || "EDITION"}</span>
          <span class="font-mono text-slate-500 ml-1.5">${item.start_date} • ${item.date_label || ""}</span>
          <h4 class="font-bold text-sm text-slate-900 mt-1">${item.title}</h4>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="window.editEditorInsightItem('${item.id}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
          <button type="button" onclick="window.removeEditorInsightItem('${item.id}')" class="text-red-600 hover:underline font-semibold">Delete</button>
        </div>
      </div>
      <p class="text-[11px] italic text-slate-600">${item.scripture || ""}</p>
      ${item.sticky_hook ? `<p class="p-2 bg-amber-50 border-l-2 border-amber-500 font-semibold text-slate-800">"${item.sticky_hook}"</p>` : ""}
      <p class="text-[11px] text-slate-500">${(item.paragraphs || []).length} paragraf • ${(item.takeaways || []).length} takeaways</p>
    </div>
  `).join("");
}

function renderSundayServicesList() {
  const container = document.getElementById("list-sunday-services");
  const badge = document.getElementById("ss-count-badge");
  if (!container) return;

  const queryText = (document.getElementById("ss-filter-query")?.value || "").trim().toLowerCase();
  const list = queryText
    ? contentState.sundayServices.filter(item =>
        [item.service_date, item.title, item.speaker]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(queryText))
      )
    : contentState.sundayServices;

  if (badge) {
    badge.textContent = queryText
      ? `${list.length} / ${contentState.sundayServices.length} items`
      : `${contentState.sundayServices.length} items`;
  }

  if (list.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">Belum ada data di <code class="font-mono">sunday_services</code>. Tambahkan data baru melalui formulir di sebelah kiri.</div>`;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-3 text-xs">
      <div class="flex items-start gap-3 min-w-0">
        ${item.poster_url
          ? `<img src="${item.poster_url}" alt="${item.title}" class="w-14 h-20 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100" />`
          : `<div class="w-14 h-20 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 shrink-0">No Poster</div>`
        }
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${item.service_date || item.id}</span>
            ${item.speaker ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px]">🎙️ ${item.speaker}</span>` : ""}
            <span class="px-2 py-0.5 ${item.published !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"} rounded font-semibold text-[10px]">
              ${item.published !== false ? "Published" : "Draft"}
            </span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 truncate">${item.title || "Sunday Service"}</h4>
          <div class="flex flex-wrap gap-2 text-[11px]">
            ${item.poster_url ? `<a href="${item.poster_url}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Poster</a>` : ""}
            ${item.youtube_url ? `<a href="${item.youtube_url}" target="_blank" rel="noopener" class="text-red-600 hover:underline">YouTube</a>` : `<span class="text-slate-400">No YouTube</span>`}
            ${item.post_url ? `<a href="${item.post_url}" target="_blank" rel="noopener" class="text-emerald-700 hover:underline">Post</a>` : `<span class="text-slate-400">No Post</span>`}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="window.editSundayServiceItem('${item.id}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
        <button type="button" onclick="window.removeSundayServiceItem('${item.id}')" class="text-red-600 hover:underline font-semibold">Delete</button>
      </div>
    </div>
  `).join("");
}

function resetSundayServiceForm() {
  document.getElementById("ss-edit-id").value = "";
  document.getElementById("ss-date").value = "";
  document.getElementById("ss-speaker").value = "";
  document.getElementById("ss-title").value = "";
  document.getElementById("ss-poster").value = "";
  document.getElementById("ss-youtube").value = "";
  document.getElementById("ss-post").value = "";
  document.getElementById("ss-published").checked = true;
}

function runEditorInsightParse() {
  const rawText = document.getElementById("ei-raw-text")?.value || "";
  const start_date = document.getElementById("ei-start-date")?.value || "";
  const edition_no = document.getElementById("ei-edition-no")?.value || "";
  const date_label = document.getElementById("ei-date-label")?.value || "";
  const header_date = document.getElementById("ei-header-date")?.value || "";

  if (!rawText.trim()) return null;

  const parsed = parseEditorInsightRawText(rawText, {
    start_date,
    edition_no,
    date_label,
    header_date
  });
  contentState.parsedDraft = parsed;
  renderParsedPreview(parsed);
  return parsed;
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
  document.getElementById("ss-filter-query")?.addEventListener("input", renderSundayServicesList);

  document.getElementById("btn-reset-sunday-service")?.addEventListener("click", () => {
    resetSundayServiceForm();
    setSundayServiceStatus("");
  });

  document.getElementById("form-sunday-service")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("ss-edit-id").value.trim();
    const serviceDate = document.getElementById("ss-date").value.trim();
    const payload = {
      service_date: serviceDate,
      title: document.getElementById("ss-title").value.trim(),
      speaker: document.getElementById("ss-speaker").value.trim(),
      poster_url: document.getElementById("ss-poster").value.trim(),
      youtube_url: document.getElementById("ss-youtube").value.trim(),
      post_url: document.getElementById("ss-post").value.trim(),
      published: document.getElementById("ss-published").checked
    };

    try {
      setSundayServiceStatus("Menyimpan...");
      await saveSundayService(editId || serviceDate, payload);
      resetSundayServiceForm();
      await refreshContentData();
      setSundayServiceStatus(`Tersimpan (${serviceDate} — ${payload.title})`);
    } catch (err) {
      console.error("Error saving sunday service:", err);
      const msg = err?.message || String(err);
      setSundayServiceStatus("Gagal menyimpan: " + msg, true);
      alert("Gagal menyimpan Sunday Service: " + msg);
    }
  });

  document.getElementById("ei-start-date")?.addEventListener("change", (e) => {
    const labels = computeEditorDateLabels(e.target.value);
    if (labels.date_label) document.getElementById("ei-date-label").value = labels.date_label;
    if (labels.header_date) document.getElementById("ei-header-date").value = labels.header_date;
    if (document.getElementById("ei-raw-text")?.value.trim()) runEditorInsightParse();
  });

  document.getElementById("btn-parse-editor-insight")?.addEventListener("click", () => {
    const parsed = runEditorInsightParse();
    if (!parsed) {
      setEditorStatus("Tempel teks materi lengkap terlebih dahulu.", true);
      alert("Tempel teks materi lengkap terlebih dahulu.");
    } else {
      setEditorStatus("Preview berhasil dibuat. Klik Save to Firestore untuk menyimpan.");
    }
  });

  document.getElementById("btn-save-editor-insight")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const parsed = runEditorInsightParse();
    if (!parsed || !parsed.start_date || !parsed.title) {
      setEditorStatus("Pastikan Start Date terisi dan teks materi sudah ditempel.", true);
      alert("Pastikan Start Date terisi dan teks materi sudah ditempel.");
      return;
    }

    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = "Saving...";
    setEditorStatus("Menyimpan ke Firestore...");

    try {
      const editId = document.getElementById("ei-edit-id")?.value.trim() || parsed.start_date;
      await saveEditorsInsight(editId, parsed);
      await refreshContentData();
      setEditorStatus(`Tersimpan (${parsed.start_date} • ${parsed.edition_no || ""})`);
      alert(`Berhasil menyimpan Editor's Insight (${parsed.start_date} — ${parsed.title}) ke Firestore!`);
    } catch (err) {
      console.error("Error saving editors_insights:", err);
      const errMsg = err?.message || String(err);
      setEditorStatus("Gagal menyimpan: " + errMsg, true);
      alert("Gagal menyimpan ke Firestore: " + errMsg);
    } finally {
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });

  document.getElementById("btn-reset-editor-insight")?.addEventListener("click", () => {
    document.getElementById("ei-edit-id").value = "";
    document.getElementById("ei-raw-text").value = "";
    document.getElementById("ei-parsed-preview")?.classList.add("hidden");
    setEditorStatus("");
    contentState.parsedDraft = null;
  });

  document.getElementById("form-weekly")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const dateKey = document.getElementById("wk-date").value;
    await saveWeeklyInsight(dateKey, {
      week_label: document.getElementById("wk-label").value.trim(),
      title: document.getElementById("wk-title").value.trim(),
      key_verse: document.getElementById("wk-verse").value.trim(),
      scripture_reading: document.getElementById("wk-reading").value.trim(),
      speaker: document.getElementById("wk-speaker")?.value.trim() || "",
      poster_url: document.getElementById("wk-poster")?.value.trim() || "",
      youtube_url: document.getElementById("wk-youtube")?.value.trim() || "",
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
    const refDate = document.getElementById("dev-date").value;
    await saveDailyReflection(refDate || null, {
      reflection_date: refDate,
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

window.editSundayServiceItem = (id) => {
  const item = contentState.sundayServices.find(x => x.id === id);
  if (!item) return;
  document.getElementById("ss-edit-id").value = item.id;
  document.getElementById("ss-date").value = item.service_date || item.id || "";
  document.getElementById("ss-speaker").value = item.speaker || "";
  document.getElementById("ss-title").value = item.title || "";
  document.getElementById("ss-poster").value = item.poster_url || "";
  document.getElementById("ss-youtube").value = item.youtube_url || "";
  document.getElementById("ss-post").value = item.post_url || "";
  document.getElementById("ss-published").checked = item.published !== false;
  setSundayServiceStatus(`Editing ${item.service_date || item.id}`);
};

window.removeSundayServiceItem = async (id) => {
  if (!confirm("Hapus data Sunday Service ini dari Firestore?")) return;
  try {
    await deleteSundayService(id);
    await refreshContentData();
    setSundayServiceStatus("Data dihapus.");
  } catch (err) {
    alert("Gagal menghapus: " + (err.message || err));
  }
};

window.editEditorInsightItem = (id) => {
  const item = contentState.editorsInsights.find(x => x.id === id);
  if (!item) return;

  document.getElementById("ei-edit-id").value = item.id;
  document.getElementById("ei-start-date").value = item.start_date || "";
  document.getElementById("ei-edition-no").value = item.edition_no || "";
  document.getElementById("ei-date-label").value = item.date_label || "";
  document.getElementById("ei-header-date").value = item.header_date || "";

  const paras = [...(item.paragraphs || [])];
  if (paras.length > 0 && item.sticky_hook) {
    paras[0] = `${paras[0]} **${item.sticky_hook}**`;
  }
  const reconstructed = [
    `**${item.title || ""}**`,
    item.scripture || "",
    "Shalom,",
    ...paras,
    "Tuhan Yesus Memberkati."
  ].filter(Boolean).join("\n\n");

  document.getElementById("ei-raw-text").value = reconstructed;
  runEditorInsightParse();
};

window.removeEditorInsightItem = async (id) => {
  if (!confirm("Hapus edisi The Editor's Insight ini?")) return;
  try {
    await deleteEditorsInsight(id);
    await refreshContentData();
    setEditorStatus("Edisi dihapus.");
  } catch (err) {
    alert("Gagal menghapus: " + (err.message || err));
  }
};

window.openWeeklyModal = (serviceDate) => {
  const w = contentState.weeks.find(x => x.service_date === serviceDate);
  if (!w) return;
  document.getElementById("wk-date").value = w.service_date;
  document.getElementById("wk-label").value = w.week_label || "";
  document.getElementById("wk-title").value = w.title || "";
  document.getElementById("wk-verse").value = w.key_verse || "";
  document.getElementById("wk-reading").value = w.scripture_reading || "";
  if (document.getElementById("wk-speaker")) document.getElementById("wk-speaker").value = w.speaker || "";
  if (document.getElementById("wk-poster")) document.getElementById("wk-poster").value = w.poster_url || "";
  if (document.getElementById("wk-youtube")) document.getElementById("wk-youtube").value = w.youtube_url || "";
  document.getElementById("wk-focus").value = w.weekly_focus || "";
  document.getElementById("wk-christ").value = w.christ_connection || "";
  document.getElementById("wk-mission").value = w.mission_application || "";
  document.getElementById("wk-diaspora").value = w.diaspora_lens || "";
  document.getElementById("wk-summary").value = w.sermon_summary || "";
  document.getElementById("wk-icare").value = w.icare_questions || "";
  document.getElementById("wk-status").value = w.status || "Scheduled";
  document.getElementById("modal-weekly").classList.remove("hidden");
};

window.removeReflection = async (id) => {
  if (!confirm("Delete this daily reflection?")) return;
  await deleteContentItem("daily_reflections", id).catch(() => {});
  await deleteContentItem("daily_devotions", id).catch(() => {});
  await refreshContentData();
};

window.removeDevotion = window.removeReflection;

window.removeMedia = async (id) => {
  if (!confirm("Delete this media entry?")) return;
  await deleteContentItem("media_galleries", id);
  await refreshContentData();
};
