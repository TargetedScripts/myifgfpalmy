// js/ui-content.js
import {
  getMonthlyThemes,
  saveMonthlyTheme,
  deleteMonthlyTheme,
  parseMonthlyThemeRawText,
  getWeeklyInsights,
  saveWeeklyInsight,
  deleteWeeklyInsight,
  parseWeeklyInsightsRawText,
  buildCompassDraftFromCurriculum,
  buildEditorInsightDraftFromCurriculum,
  buildDailyReflectionDraftFromCurriculum,
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
  deleteSundayService,
  getSermonArchives,
  saveSermonArchive,
  deleteSermonArchive
} from "./db-content.js";
import { initPublicPortal } from "./ui-portal.js";

let contentState = {
  months: [],
  weeks: [],
  reflections: [],
  media: [],
  editorsInsights: [],
  sundayServices: [],
  sermonArchives: [],
  parsedDraft: null,
  parsedWeeklyDrafts: []
};

const ID_MONTHS = [
  "JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI",
  "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"
];

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function switchToSubtab(subtabName) {
  document.querySelectorAll(".content-subtab").forEach(b => {
    b.classList.remove("bg-slate-900", "text-white");
    b.classList.add("bg-slate-100", "text-slate-700");
    if (b.dataset.subtab === subtabName) {
      b.classList.remove("bg-slate-100", "text-slate-700");
      b.classList.add("bg-slate-900", "text-white");
    }
  });
  document.querySelectorAll(".content-subpanel").forEach(p => p.classList.add("hidden"));
  document.getElementById(`subpanel-${subtabName}`)?.classList.remove("hidden");
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
      <input type="text" id="wk-speaker" placeholder="Opsional" class="w-full px-3 py-2 border rounded-lg" />
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

  const modalHeading = form.parentElement?.querySelector("h3");
  if (modalHeading) modalHeading.id = "modal-weekly-title";
}

function ensureWeeklyStudioUI() {
  const weeklyPanel = document.getElementById("subpanel-weekly");
  if (!weeklyPanel || document.getElementById("wk-smart-paste")) return;

  const filterBar = weeklyPanel.firstElementChild;
  if (filterBar) {
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = "wk-search-query";
    searchInput.placeholder = "Cari tanggal, judul, ayat, pembicara...";
    searchInput.className = "px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 w-full sm:w-72";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.id = "btn-new-weekly-insight";
    addBtn.className = "px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold whitespace-nowrap";
    addBtn.textContent = "+ Add Weekly Theme";

    const rightBox = document.createElement("div");
    rightBox.className = "flex flex-wrap items-center gap-2";
    rightBox.appendChild(searchInput);
    rightBox.appendChild(addBtn);
    filterBar.appendChild(rightBox);
  }

  const pasteBox = document.createElement("div");
  pasteBox.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs";
  pasteBox.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 class="font-bold text-sm text-slate-900">⚡ Smart Paste — Tema Mingguan (1 Minggu atau 1 Bulan Penuh)</h3>
        <p class="text-[11px] text-slate-500">Tempel teks panduan tema mingguan (seperti format MINGGU 1–5 Januari 2027), sistem otomatis memisahkan tanggal, label minggu, tema, ayat emas, bacaan, koneksi tema, dan catatan.</p>
      </div>
      <button type="button" id="btn-clear-wk-paste" class="text-[11px] text-slate-500 hover:underline">Bersihkan</button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div>
        <label class="font-semibold text-slate-600">Default Bulan (jika tanggal hanya angka)</label>
        <input type="month" id="wk-paste-month" value="2027-01" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
      </div>
      <div>
        <label class="font-semibold text-slate-600">Catatan / Pembicara Bawaan (opsional)</label>
        <input type="text" id="wk-paste-speaker" placeholder="Opsional" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
      </div>
      <div class="flex items-end gap-2">
        <button type="button" id="btn-parse-weekly-paste" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg">
          🔍 Parse Teks
        </button>
        <button type="button" id="btn-save-weekly-paste" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">
          💾 Simpan Semua ke Firestore
        </button>
      </div>
    </div>

    <textarea id="wk-smart-paste" rows="6" placeholder="Tempel rincian MINGGU 1 ... MINGGU 5 di sini..." class="w-full px-3 py-2 border border-slate-300 rounded-lg font-sans leading-relaxed"></textarea>
    <div id="wk-paste-status" class="text-[11px] font-semibold text-slate-600"></div>
    <div id="wk-paste-preview" class="hidden space-y-2 pt-1"></div>
  `;

  if (filterBar && filterBar.nextSibling) {
    weeklyPanel.insertBefore(pasteBox, filterBar.nextSibling);
  } else {
    weeklyPanel.appendChild(pasteBox);
  }
}

function ensureMonthlyStudioUI() {
  const monthlyPanel = document.getElementById("subpanel-monthly");
  if (!monthlyPanel || document.getElementById("form-monthly-theme")) return;

  monthlyPanel.className = "content-subpanel hidden space-y-4";
  monthlyPanel.innerHTML = `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <form id="form-monthly-theme" class="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5 text-xs h-fit">
        <div class="flex items-center justify-between gap-2">
          <h3 id="mt-form-title" class="font-bold text-sm text-slate-900">🗓️ Monthly Compass Theme</h3>
          <div class="flex items-center gap-2">
            <button type="button" id="btn-gen-compass-from-curr" class="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px]">
              ✨ Ambil dari Tema Kurikulum
            </button>
            <button type="button" id="btn-reset-monthly-theme" class="text-[11px] text-slate-500 hover:underline">Reset</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Month Key *</label>
            <input type="month" id="mt-key" value="2027-01" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Fase</label>
            <input type="text" id="mt-phase" placeholder="FASE 1: SEE (Jan–Apr 2027)" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Judul Tema Bulanan *</label>
          <input type="text" id="mt-title" required placeholder="e.g., Begin to See" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 font-semibold" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Subjudul / Tagline</label>
          <input type="text" id="mt-subtitle" placeholder="e.g., Membuka mata rohani untuk melihat tujuan Tuhan" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Kitab / Ayat</label>
            <input type="text" id="mt-scripture" placeholder="e.g., Keluaran 1–2" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Pilar</label>
            <input type="text" id="mt-pillar" placeholder="e.g., Vision" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Narasi Pembuka Compass</label>
          <textarea id="mt-narrative" rows="3" placeholder="Narasi pengantar tema bulan ini..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5"></textarea>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Refleksi Bulan Ini</label>
          <textarea id="mt-reflection" rows="3" placeholder="Kutipan / refleksi bulanan..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5"></textarea>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Penutup</label>
          <input type="text" id="mt-closing" value="Kiranya Tuhan Yesus memberkati." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div class="pt-1 space-y-2 border-t border-slate-100">
          <label class="font-semibold text-slate-600 block">Smart Paste Teks Tema Bulanan (Opsional)</label>
          <textarea id="mt-raw-paste" rows="3" placeholder="Bulan: 2027-01&#10;Fase: FASE 1: SEE&#10;Tema: Begin to See&#10;Ayat: Keluaran 1–2&#10;Pilar: Vision&#10;Narasi: ...&#10;Refleksi: ..." class="w-full px-2.5 py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px]"></textarea>
          <button type="button" id="btn-parse-monthly-paste" class="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px]">
            ⚡ Isi Field dari Teks
          </button>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1">
          <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
            💾 Save Monthly Theme
          </button>
          <span id="mt-status-msg" class="text-[11px] font-semibold text-emerald-700"></span>
        </div>
      </form>

      <div class="lg:col-span-7 space-y-2.5">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-sm text-slate-900">📚 Monthly Compass Themes</h3>
          <span id="mt-count-badge" class="text-xs text-slate-500"></span>
        </div>
        <div id="list-monthly-themes" class="grid grid-cols-1 sm:grid-cols-2 gap-3"></div>
      </div>
    </div>
  `;
}

function ensureCurriculumScreenUI() {
  const subtabBar = document.querySelector(".content-subtab")?.parentElement;
  const mediaPanel = document.getElementById("subpanel-media");
  if (!subtabBar || !mediaPanel || document.getElementById("subpanel-curriculum")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "curriculum";
  tabBtn.textContent = "🧭 Tema Tahunan, Bulanan & Mingguan";
  subtabBar.insertBefore(tabBtn, subtabBar.firstChild);

  const panel = document.createElement("div");
  panel.id = "subpanel-curriculum";
  panel.className = "content-subpanel hidden space-y-4 text-xs";
  panel.innerHTML = `
    <div class="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div class="space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-slate-950 rounded">Kurikulum & Panduan</span>
        <h3 class="font-bold text-base">Tema Tahunan, Tema Bulanan & Tema Mingguan</h3>
        <p class="text-[11px] text-slate-300">Sumber kurikulum utama untuk Monthly Compass, Editor's Insight, dan Daily Reflection—terpisah dari arsip khotbah & kebaktian aktual.</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <select id="curr-month-filter" class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"></select>
        <input type="text" id="curr-search-query" placeholder="Cari tema, ayat, penjelasan..." class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white w-56" />
      </div>
    </div>

    <div id="curr-yearly-card" class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5"></div>
    <div id="curr-monthly-card" class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2"></div>
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-sm text-slate-900">📌 Penjelasan Tema Mingguan & Generator Materi Turunan</h4>
        <span id="curr-weeks-count" class="text-xs text-slate-500"></span>
      </div>
      <div id="curr-weekly-list" class="space-y-3"></div>
    </div>
  `;

  mediaPanel.parentElement.insertBefore(panel, mediaPanel.parentElement.firstChild);
}

function ensureSermonArchivesScreenUI() {
  const subtabBar = document.querySelector(".content-subtab")?.parentElement;
  const mediaPanel = document.getElementById("subpanel-media");
  if (!subtabBar || !mediaPanel || document.getElementById("subpanel-sermons")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "sermons";
  tabBtn.textContent = "🎙️ Arsip Khotbah & Kebaktian";
  subtabBar.appendChild(tabBtn);

  const panel = document.createElement("div");
  panel.id = "subpanel-sermons";
  panel.className = "content-subpanel hidden grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs";
  panel.innerHTML = `
    <div class="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5 h-fit">
      <div class="flex items-center justify-between gap-2">
        <h3 id="sa-form-title" class="font-bold text-sm text-slate-900">🎙️ Rekam / Arsip Khotbah & Kebaktian</h3>
        <button type="button" id="btn-reset-sermon-archive" class="text-[11px] text-slate-500 hover:underline">Baru</button>
      </div>
      <p class="text-[11px] text-slate-500">Catat judul khotbah aktual, pembicara, tanggal, jam, link YouTube, link post, dan poster image—baik ibadah Minggu maupun kebaktian khusus di hari biasa.</p>

      <form id="form-sermon-archive" class="space-y-2.5">
        <input type="hidden" id="sa-edit-id" value="" />

        <div>
          <label class="font-semibold text-slate-600">Judul Khotbah / Ibadah *</label>
          <input type="text" id="sa-title" required placeholder="Judul khotbah aktual pembicara" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 font-semibold" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Pembicara *</label>
            <input type="text" id="sa-speaker" required placeholder="Nama pembicara / pembicara khusus" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Jenis Kebaktian</label>
            <select id="sa-type" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 bg-white">
              <option value="Sunday Service">Sunday Service</option>
              <option value="Kebaktian Khusus (Hari Biasa)">Kebaktian Khusus (Hari Biasa)</option>
              <option value="Doa / Ibadah Malam">Doa / Ibadah Malam</option>
              <option value="iCare / Komunitas">iCare / Komunitas</option>
              <option value="Guest Speaker">Guest Speaker</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Tanggal *</label>
            <input type="date" id="sa-date" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Jam *</label>
            <input type="time" id="sa-time" required value="10:30" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Link YouTube (opsional)</label>
          <input type="url" id="sa-youtube" placeholder="https://www.youtube.com/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Link Post / Artikel (opsional)</label>
          <input type="url" id="sa-post" placeholder="https://ifgfpalmy.org/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Poster Image URL (opsional)</label>
          <input type="url" id="sa-poster" placeholder="https://.../poster.jpg" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Acuan Tema Mingguan (opsional)</label>
          <input type="text" id="sa-linked-week" placeholder="e.g., 2027-01-03 (opsional)" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Catatan Tambahan (opsional)</label>
          <textarea id="sa-notes" rows="2" placeholder="Catatan singkat pelaksanaan ibadah..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5"></textarea>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1">
          <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
            💾 Simpan Arsip Khotbah
          </button>
          <span id="sa-status-msg" class="text-[11px] font-semibold text-emerald-700"></span>
        </div>
      </form>
    </div>

    <div class="lg:col-span-7 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">🗂️ Arsip Khotbah & Kebaktian</h3>
        <div class="flex flex-wrap items-center gap-2">
          <select id="sa-type-filter" class="px-2.5 py-1 border rounded-lg text-xs bg-white">
            <option value="ALL">Semua Jenis</option>
            <option value="Sunday Service">Sunday Service</option>
            <option value="Kebaktian Khusus (Hari Biasa)">Kebaktian Khusus (Hari Biasa)</option>
            <option value="Doa / Ibadah Malam">Doa / Ibadah Malam</option>
            <option value="iCare / Komunitas">iCare / Komunitas</option>
            <option value="Guest Speaker">Guest Speaker</option>
          </select>
          <input type="text" id="sa-search-query" placeholder="Cari judul, pembicara, tanggal..." class="px-2.5 py-1 border rounded-lg text-xs bg-white" />
          <span id="sa-count-badge" class="text-xs text-slate-500"></span>
        </div>
      </div>
      <div id="list-sermon-archives" class="space-y-2.5"></div>
    </div>
  `;

  mediaPanel.parentElement.appendChild(panel);
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
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">✍️ The Editor's Insight (dari Tema Kurikulum / Smart Paste)</h3>
        <div class="flex items-center gap-2">
          <select id="ei-source-week" class="px-2 py-1 border rounded-lg text-[11px] bg-slate-50 max-w-[200px]"></select>
          <button type="button" id="btn-gen-editor-from-week" class="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px]">
            ✨ Ambil Tema Minggu
          </button>
          <button type="button" id="btn-reset-editor-insight" class="text-[11px] text-slate-500 hover:underline">Reset</button>
        </div>
      </div>
      <p class="text-[11px] text-slate-500">Ambil otomatis dari tema mingguan/bulanan yang ditetapkan atau tempel teks utuh di bawah. Sistem otomatis memisahkan Judul, Ayat, Sticky Hook, Paragraf, dan Takeaways.</p>

      <input type="hidden" id="ei-edit-id" value="" />
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label class="font-semibold text-slate-600">Start Date *</label>
          <input type="date" id="ei-start-date" value="2027-01-03" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Edition No *</label>
          <input type="text" id="ei-edition-no" value="NO. II.45" placeholder="NO. II.45" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Date Label</label>
          <input type="text" id="ei-date-label" value="3 – 9 JANUARI 2027" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Header Date</label>
          <input type="text" id="ei-header-date" value="3 JANUARI 2027" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
      </div>

      <div>
        <label class="font-semibold text-slate-600">Materi / Teks Renungan *</label>
        <textarea id="ei-raw-text" rows="11" placeholder="Tempel teks lengkap atau klik Ambil Tema Minggu untuk menyusun draf dari tema yang ditetapkan." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-0.5 font-sans leading-relaxed"></textarea>
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

function ensureDailyReflectionGeneratorUI() {
  const devForm = document.getElementById("form-devotion");
  if (!devForm || document.getElementById("dev-source-week")) return;

  const helperBar = document.createElement("div");
  helperBar.className = "p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2 text-xs mb-2";
  helperBar.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-bold text-amber-950">✨ Ambil dari Tema Kurikulum</span>
      <select id="dev-source-week" class="px-2 py-1 border rounded-lg text-[11px] bg-white max-w-[230px]"></select>
    </div>
    <button type="button" id="btn-gen-reflection-from-week" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px]">
      ⚡ Susun Daily Reflection dari Tema Mingguan & Bulanan
    </button>
  `;
  devForm.insertBefore(helperBar, devForm.firstChild);
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

function setMonthlyStatus(msg, isError = false) {
  const el = document.getElementById("mt-status-msg");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

function setWeeklyPasteStatus(msg, isError = false) {
  const el = document.getElementById("wk-paste-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

function setSermonArchiveStatus(msg, isError = false) {
  const el = document.getElementById("sa-status-msg");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

export async function initContentStudio() {
  ensureWeeklyPosterFields();
  ensureWeeklyStudioUI();
  ensureMonthlyStudioUI();
  ensureCurriculumScreenUI();
  ensureSermonArchivesScreenUI();
  ensureEditorsInsightStudioUI();
  ensureDailyReflectionGeneratorUI();
  ensureSundayServicesStudioUI();
  bindContentEvents();
  await refreshContentData();
}

async function refreshContentData() {
  const [months, weeks, reflections, media, editorsInsights, sundayServices, sermonArchives] = await Promise.all([
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
    }),
    getSermonArchives().catch(err => {
      console.error("Failed to load sermon_archives:", err);
      setSermonArchiveStatus("Gagal memuat sermon_archives: " + (err.message || err), true);
      return [];
    })
  ]);

  contentState.months = months;
  contentState.weeks = weeks;
  contentState.reflections = reflections;
  contentState.media = media;
  contentState.editorsInsights = editorsInsights;
  contentState.sundayServices = sundayServices;
  contentState.sermonArchives = sermonArchives;

  populateMonthFilter();
  populateCurriculumMonthFilter();
  populateWeekSourceDropdowns();
  renderCurriculumScreen();
  renderMonthlyThemes();
  renderWeeklyInsights();
  renderReflections();
  renderMedia();
  renderSermonArchivesList();
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
      .map(m => `<option value="${esc(m.month_key)}">${esc(m.month_key)} — ${esc(m.title)}</option>`)
      .join("");
  select.value = current;
}

function populateCurriculumMonthFilter() {
  const select = document.getElementById("curr-month-filter");
  if (!select || !contentState.months.length) return;
  const current = select.value || contentState.months[0]?.month_key || "2027-01";
  select.innerHTML = contentState.months
    .map(m => `<option value="${esc(m.month_key)}">${esc(m.month_key)} — ${esc(m.title)}</option>`)
    .join("");
  select.value = contentState.months.some(m => m.month_key === current)
    ? current
    : contentState.months[0].month_key;
}

function populateWeekSourceDropdowns() {
  const optionsHtml = contentState.weeks.length
    ? contentState.weeks
        .map(w => `<option value="${esc(w.service_date)}">${esc(w.service_date)} • ${esc(w.week_label || "")} — ${esc(w.title || "")}</option>`)
        .join("")
    : `<option value="">Belum ada tema mingguan</option>`;

  ["ei-source-week", "dev-source-week"].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = optionsHtml;
    if (prev && contentState.weeks.some(w => w.service_date === prev)) {
      sel.value = prev;
    }
  });
}

function renderCurriculumScreen() {
  const yearlyBox = document.getElementById("curr-yearly-card");
  const monthlyBox = document.getElementById("curr-monthly-card");
  const weeksList = document.getElementById("curr-weekly-list");
  const weeksCount = document.getElementById("curr-weeks-count");
  if (!yearlyBox || !monthlyBox || !weeksList) return;

  const selectedMonthKey = document.getElementById("curr-month-filter")?.value || contentState.months[0]?.month_key || "2027-01";
  const queryText = (document.getElementById("curr-search-query")?.value || "").trim().toLowerCase();

  const monthObj = contentState.months.find(m => m.month_key === selectedMonthKey) || contentState.months[0] || {};
  const yearlyTheme = monthObj.yearly_theme || "ALIGN IN PURPOSE — Kitab Keluaran";

  yearlyBox.innerHTML = `
    <div class="flex items-center justify-between gap-2">
      <span class="text-[10px] font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-900 rounded">Tema Tahunan</span>
      <span class="text-[11px] font-semibold text-slate-500">${esc(monthObj.phase || "")}</span>
    </div>
    <h4 class="font-bold text-base text-slate-900">${esc(yearlyTheme)}</h4>
    <p class="text-[11px] text-slate-600">Panduan induk kurikulum sepanjang tahun yang menjadi dasar Monthly Compass, Editor's Insight, dan Daily Reflection.</p>
  `;

  monthlyBox.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-900 text-amber-400 rounded">Tema Bulanan • ${esc(monthObj.month_key || selectedMonthKey)}</span>
      <div class="flex items-center gap-2">
        <span class="text-[11px] text-slate-500">Pilar: <strong>${esc(monthObj.pillar || "-")}</strong> • Ayat: <strong>${esc(monthObj.scripture || "-")}</strong></span>
        <button type="button" onclick="window.prepareCompassFromMonth('${esc(monthObj.month_key || selectedMonthKey)}')" class="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px]">
          ✨ Buat Monthly Compass
        </button>
      </div>
    </div>
    <h4 class="font-bold text-base text-slate-900">${esc(monthObj.title || "-")}</h4>
    ${monthObj.subtitle ? `<p class="text-xs font-medium text-slate-700">${esc(monthObj.subtitle)}</p>` : ""}
    ${monthObj.narrative ? `<div class="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 whitespace-pre-line"><strong>Penjelasan & Narasi Bulanan:</strong>\n${esc(monthObj.narrative)}</div>` : ""}
    ${monthObj.reflection ? `<div class="p-3 bg-amber-50/70 rounded-lg border border-amber-200/80 text-xs text-slate-800 whitespace-pre-line"><strong>Refleksi Bulan Ini:</strong>\n${esc(monthObj.reflection)}</div>` : ""}
    ${monthObj.closing ? `<p class="text-[11px] italic text-slate-600">${esc(monthObj.closing)}</p>` : ""}
  `;

  const monthWeeks = contentState.weeks.filter(w => {
    const matchMonth = w.month_key === selectedMonthKey;
    if (!matchMonth) return false;
    if (!queryText) return true;
    return [
      w.service_date, w.week_label, w.title, w.key_verse, w.scripture_reading,
      w.weekly_focus, w.christ_connection, w.mission_application, w.diaspora_lens,
      w.pastoral_need, w.cross_references, w.guardrail_notes, w.icare_questions
    ]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(queryText));
  });

  if (weeksCount) weeksCount.textContent = `${monthWeeks.length} minggu kurikulum`;

  if (!monthWeeks.length) {
    weeksList.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">Belum ada penjelasan tema mingguan untuk bulan ini.</div>`;
    return;
  }

  weeksList.innerHTML = monthWeeks.map(w => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded">${esc(w.service_date)}</span>
          <span class="font-bold text-slate-800">${esc(w.week_label || "")}</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" onclick="window.prepareEditorFromWeek('${esc(w.service_date)}')" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[11px]">
            ✍️ Buat Editor's Insight
          </button>
          <button type="button" onclick="window.prepareReflectionFromWeek('${esc(w.service_date)}')" class="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold rounded text-[11px]">
            🌟 Buat Daily Reflection
          </button>
          <button type="button" onclick="window.openWeeklyModal('${esc(w.service_date)}')" class="text-xs font-semibold text-blue-600 hover:underline">
            Edit Tema
          </button>
        </div>
      </div>
      <h5 class="font-bold text-sm text-slate-900">${esc(w.title || "")}</h5>
      <p class="text-[11px] text-slate-600">🔑 Ayat Kunci: <strong>${esc(w.key_verse || "-")}</strong> • Bacaan: <strong>${esc(w.scripture_reading || "-")}</strong></p>
      ${w.weekly_focus ? `<p class="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100"><strong>Fokus / Penjelasan Tema:</strong> ${esc(w.weekly_focus)}</p>` : ""}
      ${w.christ_connection ? `<p class="text-slate-700"><strong>Koneksi Kristus / Tema:</strong> ${esc(w.christ_connection)}</p>` : ""}
      ${w.mission_application ? `<p class="text-slate-700"><strong>Aplikasi Misi / Alur:</strong> ${esc(w.mission_application)}</p>` : ""}
      ${w.diaspora_lens ? `<p class="text-blue-900 bg-blue-50/70 p-2 rounded-lg"><strong>Lensa Diaspora:</strong> ${esc(w.diaspora_lens)}</p>` : ""}
      ${w.pastoral_need ? `<p class="text-slate-600"><strong>Kebutuhan Pastoral:</strong> ${esc(w.pastoral_need)}</p>` : ""}
      ${w.cross_references ? `<p class="text-[11px] text-slate-500"><strong>Referensi Silang:</strong> ${esc(w.cross_references)}</p>` : ""}
      ${w.guardrail_notes ? `<p class="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200"><strong>Catatan / Guardrail:</strong> ${esc(w.guardrail_notes)}</p>` : ""}
      ${w.icare_questions ? `<p class="text-[11px] text-slate-700 whitespace-pre-line"><strong>Pertanyaan iCare:</strong>\n${esc(w.icare_questions)}</p>` : ""}
    </div>
  `).join("");
}

function renderMonthlyThemes() {
  const container = document.getElementById("list-monthly-themes");
  const badge = document.getElementById("mt-count-badge");
  if (!container) return;

  if (badge) badge.textContent = `${contentState.months.length} months`;

  if (contentState.months.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500 col-span-full">No monthly themes found.</div>`;
    return;
  }

  container.innerHTML = contentState.months.map(m => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">${esc(m.month_key)}</span>
        <span class="text-[11px] font-semibold text-amber-700">${esc(m.phase || "")}</span>
      </div>
      <h3 class="font-bold text-slate-900 text-base">${esc(m.title || "")}</h3>
      ${m.subtitle ? `<p class="text-[11px] text-slate-600">${esc(m.subtitle)}</p>` : ""}
      <p class="text-xs text-slate-600">📖 <strong>${esc(m.scripture || "-")}</strong></p>
      <p class="text-xs text-slate-500">Pillar: <span class="font-medium text-slate-800">${esc(m.pillar || "-")}</span></p>
      ${m.narrative ? `<p class="text-[11px] text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded">${esc(m.narrative)}</p>` : ""}
      <div class="flex justify-end gap-3 pt-1 border-t border-slate-100">
        <button type="button" onclick="window.editMonthlyThemeItem('${esc(m.month_key || m.id)}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
        <button type="button" onclick="window.removeMonthlyThemeItem('${esc(m.month_key || m.id)}')" class="text-red-600 hover:underline font-semibold">Delete</button>
      </div>
    </div>
  `).join("");
}

function renderWeeklyInsights() {
  const container = document.getElementById("list-weekly-insights");
  if (!container) return;

  const filterMonth = document.getElementById("filter-content-month")?.value || "ALL";
  const queryText = (document.getElementById("wk-search-query")?.value || "").trim().toLowerCase();

  const filtered = contentState.weeks.filter(w => {
    const matchMonth = filterMonth === "ALL" || w.month_key === filterMonth;
    if (!matchMonth) return false;
    if (!queryText) return true;
    return [w.service_date, w.week_label, w.title, w.key_verse, w.scripture_reading, w.weekly_focus]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(queryText));
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">No weekly insights found for this filter.</div>`;
    return;
  }

  container.innerHTML = filtered.map(w => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">${esc(w.service_date)}</span>
          <span class="text-xs font-semibold text-amber-700">${esc(w.week_label || "")}</span>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" onclick="window.openWeeklyModal('${esc(w.service_date)}')" class="text-xs font-semibold text-blue-600 hover:underline">
            Edit Tema Mingguan
          </button>
          <button type="button" onclick="window.removeWeeklyInsightItem('${esc(w.service_date)}')" class="text-xs font-semibold text-red-600 hover:underline">
            Delete
          </button>
        </div>
      </div>
      <h4 class="font-bold text-slate-900">${esc(w.title || "")}</h4>
      <p class="text-xs text-slate-600">🔑 <strong>${esc(w.key_verse || "-")}</strong> • Bacaan: ${esc(w.scripture_reading || "-")}</p>
      ${w.weekly_focus ? `<p class="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg">${esc(w.weekly_focus)}</p>` : ""}
      ${w.diaspora_lens ? `<p class="text-[11px] text-blue-800">🌏 <strong>Diaspora Lens:</strong> ${esc(w.diaspora_lens)}</p>` : ""}
    </div>
  `).join("");
}

function renderSermonArchivesList() {
  const container = document.getElementById("list-sermon-archives");
  const badge = document.getElementById("sa-count-badge");
  if (!container) return;

  const typeFilter = document.getElementById("sa-type-filter")?.value || "ALL";
  const queryText = (document.getElementById("sa-search-query")?.value || "").trim().toLowerCase();

  const filtered = contentState.sermonArchives.filter(item => {
    const matchType = typeFilter === "ALL" || (item.service_type || "Sunday Service") === typeFilter;
    if (!matchType) return false;
    if (!queryText) return true;
    return [item.title, item.speaker, item.service_date, item.service_time, item.service_type, item.notes]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(queryText));
  });

  if (badge) {
    badge.textContent = queryText || typeFilter !== "ALL"
      ? `${filtered.length} / ${contentState.sermonArchives.length} arsip`
      : `${contentState.sermonArchives.length} arsip`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">Belum ada arsip khotbah atau kebaktian yang tercatat. Gunakan formulir di sebelah kiri untuk menambahkan.</div>`;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between gap-3 text-xs">
      <div class="flex items-start gap-3 min-w-0">
        ${item.poster_url
          ? `<img src="${esc(item.poster_url)}" alt="${esc(item.title || "")}" class="w-14 h-20 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100" />`
          : `<div class="w-14 h-20 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 shrink-0 text-center px-1">No Poster</div>`
        }
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(item.service_date || "-")}</span>
            ${item.service_time ? `<span class="font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px]">🕒 ${esc(item.service_time)}</span>` : ""}
            <span class="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-[10px]">${esc(item.service_type || "Sunday Service")}</span>
            ${item.speaker ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px]">🎙️ ${esc(item.speaker)}</span>` : ""}
          </div>
          <h4 class="font-bold text-sm text-slate-900">${esc(item.title || "")}</h4>
          ${item.linked_week_date ? `<p class="text-[10px] text-slate-500">Acuan Tema Mingguan: <span class="font-mono">${esc(item.linked_week_date)}</span></p>` : ""}
          ${item.notes ? `<p class="text-[11px] text-slate-600">${esc(item.notes)}</p>` : ""}
          <div class="flex flex-wrap gap-3 pt-0.5 text-[11px]">
            ${item.youtube_url ? `<a href="${esc(item.youtube_url)}" target="_blank" rel="noopener" class="text-red-600 hover:underline font-medium">▶️ YouTube</a>` : `<span class="text-slate-400">YouTube: -</span>`}
            ${item.post_url ? `<a href="${esc(item.post_url)}" target="_blank" rel="noopener" class="text-emerald-700 hover:underline font-medium">🔗 Post</a>` : `<span class="text-slate-400">Post: -</span>`}
            ${item.poster_url ? `<a href="${esc(item.poster_url)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">🖼️ Poster</a>` : `<span class="text-slate-400">Poster: -</span>`}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="window.editSermonArchiveItem('${esc(item.id)}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
        <button type="button" onclick="window.removeSermonArchiveItem('${esc(item.id)}')" class="text-red-600 hover:underline font-semibold">Delete</button>
      </div>
    </div>
  `).join("");
}

function resetSermonArchiveForm() {
  document.getElementById("sa-form-title").textContent = "🎙️ Rekam / Arsip Khotbah & Kebaktian";
  document.getElementById("sa-edit-id").value = "";
  document.getElementById("sa-title").value = "";
  document.getElementById("sa-speaker").value = "";
  document.getElementById("sa-type").value = "Sunday Service";
  document.getElementById("sa-date").value = "";
  document.getElementById("sa-time").value = "10:30";
  document.getElementById("sa-youtube").value = "";
  document.getElementById("sa-post").value = "";
  document.getElementById("sa-poster").value = "";
  document.getElementById("sa-linked-week").value = "";
  document.getElementById("sa-notes").value = "";
}

function renderWeeklyPastePreview(items = []) {
  const box = document.getElementById("wk-paste-preview");
  if (!box) return;
  if (!items.length) {
    box.classList.add("hidden");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("hidden");
  box.innerHTML = items.map(it => `
    <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-[11px]">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded">${esc(it.service_date || "NO-DATE")}</span>
        <span class="font-bold text-slate-700">${esc(it.week_label)}</span>
        <span class="font-bold text-slate-900">${esc(it.title)}</span>
      </div>
      <p class="text-slate-600">🔑 <strong>${esc(it.key_verse)}</strong> • Bacaan: <strong>${esc(it.scripture_reading)}</strong></p>
      ${it.weekly_focus ? `<p class="text-slate-700">🎯 ${esc(it.weekly_focus)}</p>` : ""}
      ${it.sermon_summary ? `<p class="text-slate-600 line-clamp-2">📝 ${esc(it.sermon_summary)}</p>` : ""}
    </div>
  `).join("");
}

function resetMonthlyThemeForm() {
  document.getElementById("mt-form-title").textContent = "🗓️ Monthly Compass Theme";
  document.getElementById("mt-key").value = "2027-01";
  document.getElementById("mt-phase").value = "";
  document.getElementById("mt-title").value = "";
  document.getElementById("mt-subtitle").value = "";
  document.getElementById("mt-scripture").value = "";
  document.getElementById("mt-pillar").value = "";
  document.getElementById("mt-narrative").value = "";
  document.getElementById("mt-reflection").value = "";
  document.getElementById("mt-closing").value = "Kiranya Tuhan Yesus memberkati.";
  document.getElementById("mt-raw-paste").value = "";
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
            <span class="text-xs font-mono text-slate-500">${esc(dateLabel)} • ${esc(d.scripture || "")}</span>
            <h4 class="font-bold text-slate-900">${esc(d.title || "")}</h4>
          </div>
          <button onclick="window.removeReflection('${esc(d.id)}')" class="text-xs text-red-600 hover:underline">Delete</button>
        </div>
        <p class="text-xs text-slate-700 whitespace-pre-line">${esc(d.reflection || "")}</p>
        ${d.prayer ? `<p class="text-xs italic text-slate-600 pt-1 border-t border-slate-100">🙏 ${esc(d.prayer)}</p>` : ""}
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
        <span class="text-[11px] px-2 py-0.5 bg-purple-50 text-purple-700 rounded font-semibold">${esc(m.category || "")}</span>
        <span class="text-xs text-slate-500 ml-1">${esc(m.event_date || "")}</span>
        <h4 class="font-bold text-slate-900 mt-1">${esc(m.title || "")}</h4>
        <a href="${esc(m.media_url || "#")}" target="_blank" rel="noopener" class="text-xs text-blue-600 hover:underline break-all">${esc(m.media_url || "")}</a>
      </div>
      <button onclick="window.removeMedia('${esc(m.id)}')" class="text-xs text-red-600 hover:underline shrink-0">Delete</button>
    </div>
  `).join("");
}

function renderParsedPreview(parsed) {
  const box = document.getElementById("ei-parsed-preview");
  if (!box || !parsed) return;

  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="flex items-center justify-between border-b border-slate-200 pb-1.5">
      <span class="font-bold text-emerald-700">✅ Hasil Pemisahan Otomatis (${esc(parsed.start_date || "No Date")} • ${esc(parsed.edition_no || "-")})</span>
      <span class="text-slate-500">${parsed.paragraphs.length} paragraf • ${parsed.takeaways.length} takeaways</span>
    </div>
    <div><strong>Title:</strong> ${esc(parsed.title || "-")}</div>
    <div><strong>Scripture:</strong> ${esc(parsed.scripture || "-")}</div>
    <div class="p-2 bg-amber-50 border border-amber-200 rounded text-amber-950">
      <strong>Sticky Hook:</strong> "${esc(parsed.sticky_hook || "-")}"
    </div>
    <div class="space-y-1">
      <strong>Paragraphs (bersih):</strong>
      ${parsed.paragraphs.map((p, idx) => `<p class="p-1.5 bg-white rounded border border-slate-200"><strong>P${idx + 1}:</strong> ${esc(p)}</p>`).join("")}
    </div>
    <div class="space-y-1">
      <strong>Takeaways:</strong>
      ${parsed.takeaways.map(t => `<p class="p-1.5 bg-white rounded border border-slate-200"><strong>${esc(t.title)}:</strong> ${esc(t.desc)}</p>`).join("")}
    </div>
  `;
}

function renderEditorsInsightsList() {
  const container = document.getElementById("list-editors-insights");
  const badge = document.getElementById("ei-count-badge");
  if (!container) return;

  if (badge) badge.textContent = `${contentState.editorsInsights.length} editions`;

  if (contentState.editorsInsights.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">Belum ada edisi The Editor's Insight. Ambil dari tema kurikulum atau tempel teks utuh di formulir kiri lalu klik Save.</div>`;
    return;
  }

  container.innerHTML = contentState.editorsInsights.map(item => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
      <div class="flex items-start justify-between gap-2">
        <div>
          <span class="px-2 py-0.5 bg-slate-900 text-amber-400 font-bold rounded text-[10px]">${esc(item.edition_no || "EDITION")}</span>
          <span class="font-mono text-slate-500 ml-1.5">${esc(item.start_date || "")} • ${esc(item.date_label || "")}</span>
          <h4 class="font-bold text-sm text-slate-900 mt-1">${esc(item.title || "")}</h4>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="window.editEditorInsightItem('${esc(item.id)}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
          <button type="button" onclick="window.removeEditorInsightItem('${esc(item.id)}')" class="text-red-600 hover:underline font-semibold">Delete</button>
        </div>
      </div>
      <p class="text-[11px] italic text-slate-600">${esc(item.scripture || "")}</p>
      ${item.sticky_hook ? `<p class="p-2 bg-amber-50 border-l-2 border-amber-500 font-semibold text-slate-800">"${esc(item.sticky_hook)}"</p>` : ""}
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
          ? `<img src="${esc(item.poster_url)}" alt="${esc(item.title || "")}" class="w-14 h-20 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100" />`
          : `<div class="w-14 h-20 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 shrink-0">No Poster</div>`
        }
        <div class="min-w-0 space-y-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(item.service_date || item.id)}</span>
            ${item.speaker ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px]">🎙️ ${esc(item.speaker)}</span>` : ""}
            <span class="px-2 py-0.5 ${item.published !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"} rounded font-semibold text-[10px]">
              ${item.published !== false ? "Published" : "Draft"}
            </span>
          </div>
          <h4 class="font-bold text-sm text-slate-900 truncate">${esc(item.title || "Sunday Service")}</h4>
          <div class="flex flex-wrap gap-2 text-[11px]">
            ${item.poster_url ? `<a href="${esc(item.poster_url)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Poster</a>` : ""}
            ${item.youtube_url ? `<a href="${esc(item.youtube_url)}" target="_blank" rel="noopener" class="text-red-600 hover:underline">YouTube</a>` : `<span class="text-slate-400">No YouTube</span>`}
            ${item.post_url ? `<a href="${esc(item.post_url)}" target="_blank" rel="noopener" class="text-emerald-700 hover:underline">Post</a>` : `<span class="text-slate-400">No Post</span>`}
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" onclick="window.editSundayServiceItem('${esc(item.id)}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
        <button type="button" onclick="window.removeSundayServiceItem('${esc(item.id)}')" class="text-red-600 hover:underline font-semibold">Delete</button>
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

function applyCompassDraftToForm(monthKey) {
  const mObj = contentState.months.find(m => m.month_key === monthKey || m.id === monthKey);
  if (!mObj) {
    setMonthlyStatus(`Tema bulanan ${monthKey} belum ada di kurikulum.`, true);
    return;
  }
  const weeksInMonth = contentState.weeks.filter(w => w.month_key === mObj.month_key);
  const draft = buildCompassDraftFromCurriculum(mObj, weeksInMonth);

  document.getElementById("mt-key").value = draft.month_key;
  document.getElementById("mt-phase").value = draft.phase;
  document.getElementById("mt-title").value = draft.title;
  document.getElementById("mt-subtitle").value = draft.subtitle;
  document.getElementById("mt-scripture").value = draft.scripture;
  document.getElementById("mt-pillar").value = draft.pillar;
  document.getElementById("mt-narrative").value = draft.narrative;
  document.getElementById("mt-reflection").value = draft.reflection;
  document.getElementById("mt-closing").value = draft.closing;
  setMonthlyStatus(`Draf Monthly Compass disusun dari kurikulum ${draft.month_key}.`);
}

function applyEditorDraftToForm(weekDate) {
  const wObj = contentState.weeks.find(w => w.service_date === weekDate);
  if (!wObj) {
    setEditorStatus("Pilih tema mingguan terlebih dahulu.", true);
    return;
  }
  const mObj = contentState.months.find(m => m.month_key === wObj.month_key) || {};
  const draft = buildEditorInsightDraftFromCurriculum(wObj, mObj);
  const labels = computeEditorDateLabels(wObj.service_date);

  document.getElementById("ei-edit-id").value = wObj.service_date;
  document.getElementById("ei-start-date").value = wObj.service_date;
  document.getElementById("ei-edition-no").value = draft.edition_no;
  document.getElementById("ei-date-label").value = labels.date_label || wObj.service_date;
  document.getElementById("ei-header-date").value = labels.header_date || wObj.service_date;

  const paras = [...draft.paragraphs];
  if (paras.length > 0 && draft.sticky_hook) {
    paras[0] = `${paras[0]} **${draft.sticky_hook}**`;
  }
  const rawText = [
    `**${draft.title}**`,
    draft.scripture,
    "Shalom,",
    ...paras,
    "Tuhan Yesus Memberkati."
  ].filter(Boolean).join("\n\n");

  document.getElementById("ei-raw-text").value = rawText;
  runEditorInsightParse();
  setEditorStatus(`Draf Editor's Insight disusun dari tema mingguan ${wObj.service_date}.`);
}

function applyReflectionDraftToForm(weekDate) {
  const wObj = contentState.weeks.find(w => w.service_date === weekDate);
  if (!wObj) return;
  const mObj = contentState.months.find(m => m.month_key === wObj.month_key) || {};
  const currentDateVal = document.getElementById("dev-date")?.value || wObj.service_date;
  const draft = buildDailyReflectionDraftFromCurriculum(wObj, mObj, currentDateVal);

  document.getElementById("dev-date").value = draft.reflection_date;
  document.getElementById("dev-title").value = draft.title;
  document.getElementById("dev-verse").value = draft.scripture;
  document.getElementById("dev-body").value = draft.reflection;
  document.getElementById("dev-prayer").value = draft.prayer;
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

function runWeeklyPasteParse() {
  const rawText = document.getElementById("wk-smart-paste")?.value || "";
  const monthKey = document.getElementById("wk-paste-month")?.value || "";
  const speaker = document.getElementById("wk-paste-speaker")?.value.trim() || "";
  if (!rawText.trim()) {
    setWeeklyPasteStatus("Tempel teks tema mingguan terlebih dahulu.", true);
    return [];
  }
  const items = parseWeeklyInsightsRawText(rawText, { month_key: monthKey, speaker });
  contentState.parsedWeeklyDrafts = items;
  renderWeeklyPastePreview(items);
  if (items.length === 0) {
    setWeeklyPasteStatus("Tidak ada blok minggu yang terdeteksi. Pastikan ada tanggal atau label MINGGU 1 / Tema:.", true);
  } else {
    setWeeklyPasteStatus(`Berhasil memilah ${items.length} data mingguan. Periksa preview lalu klik Simpan Semua ke Firestore.`);
  }
  return items;
}

function bindContentEvents() {
  document.querySelectorAll(".content-subtab").forEach(btn => {
    btn.addEventListener("click", () => {
      switchToSubtab(btn.dataset.subtab);
    });
  });

  document.getElementById("curr-month-filter")?.addEventListener("change", renderCurriculumScreen);
  document.getElementById("curr-search-query")?.addEventListener("input", renderCurriculumScreen);

  document.getElementById("filter-content-month")?.addEventListener("change", renderWeeklyInsights);
  document.getElementById("wk-search-query")?.addEventListener("input", renderWeeklyInsights);
  document.getElementById("sa-type-filter")?.addEventListener("change", renderSermonArchivesList);
  document.getElementById("sa-search-query")?.addEventListener("input", renderSermonArchivesList);
  document.getElementById("ss-filter-query")?.addEventListener("input", renderSundayServicesList);

  document.getElementById("btn-gen-compass-from-curr")?.addEventListener("click", () => {
    const mk = document.getElementById("mt-key")?.value || "2027-01";
    applyCompassDraftToForm(mk);
  });

  document.getElementById("btn-gen-editor-from-week")?.addEventListener("click", () => {
    const wkDate = document.getElementById("ei-source-week")?.value || "";
    applyEditorDraftToForm(wkDate);
  });

  document.getElementById("btn-gen-reflection-from-week")?.addEventListener("click", () => {
    const wkDate = document.getElementById("dev-source-week")?.value || "";
    applyReflectionDraftToForm(wkDate);
  });

  document.getElementById("btn-reset-sermon-archive")?.addEventListener("click", () => {
    resetSermonArchiveForm();
    setSermonArchiveStatus("");
  });

  document.getElementById("form-sermon-archive")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("sa-edit-id").value.trim();
    const payload = {
      title: document.getElementById("sa-title").value.trim(),
      speaker: document.getElementById("sa-speaker").value.trim(),
      service_type: document.getElementById("sa-type").value,
      service_date: document.getElementById("sa-date").value.trim(),
      service_time: document.getElementById("sa-time").value.trim(),
      youtube_url: document.getElementById("sa-youtube").value.trim(),
      post_url: document.getElementById("sa-post").value.trim(),
      poster_url: document.getElementById("sa-poster").value.trim(),
      linked_week_date: document.getElementById("sa-linked-week").value.trim(),
      notes: document.getElementById("sa-notes").value.trim()
    };

    try {
      setSermonArchiveStatus("Menyimpan arsip...");
      await saveSermonArchive(editId || null, payload);
      resetSermonArchiveForm();
      await refreshContentData();
      setSermonArchiveStatus(`Arsip tersimpan (${payload.service_date} • ${payload.title})`);
    } catch (err) {
      setSermonArchiveStatus("Gagal menyimpan arsip: " + (err?.message || err), true);
    }
  });

  document.getElementById("btn-new-weekly-insight")?.addEventListener("click", () => {
    window.openNewWeeklyModal();
  });

  document.getElementById("btn-parse-weekly-paste")?.addEventListener("click", () => {
    runWeeklyPasteParse();
  });

  document.getElementById("btn-save-weekly-paste")?.addEventListener("click", async () => {
    const items = contentState.parsedWeeklyDrafts.length
      ? contentState.parsedWeeklyDrafts
      : runWeeklyPasteParse();

    const validItems = items.filter(it => it.service_date);
    if (!validItems.length) {
      setWeeklyPasteStatus("Pastikan setiap item memiliki tanggal valid (YYYY-MM-DD atau format tanggal Indonesia).", true);
      return;
    }

    setWeeklyPasteStatus(`Menyimpan ${validItems.length} data mingguan ke Firestore...`);
    try {
      for (const it of validItems) {
        await saveWeeklyInsight(it.service_date, it);
      }
      await refreshContentData();
      await initPublicPortal();
      setWeeklyPasteStatus(`Berhasil menyimpan ${validItems.length} tema mingguan (${validItems.map(i => i.service_date).join(", ")}).`);
    } catch (err) {
      setWeeklyPasteStatus("Gagal menyimpan: " + (err?.message || err), true);
    }
  });

  document.getElementById("btn-clear-wk-paste")?.addEventListener("click", () => {
    document.getElementById("wk-smart-paste").value = "";
    contentState.parsedWeeklyDrafts = [];
    renderWeeklyPastePreview([]);
    setWeeklyPasteStatus("");
  });

  document.getElementById("btn-parse-monthly-paste")?.addEventListener("click", () => {
    const raw = document.getElementById("mt-raw-paste")?.value || "";
    if (!raw.trim()) {
      setMonthlyStatus("Tempel teks tema bulanan terlebih dahulu.", true);
      return;
    }
    const parsed = parseMonthlyThemeRawText(raw, {
      month_key: document.getElementById("mt-key")?.value || "2027-01"
    });
    if (parsed.month_key) document.getElementById("mt-key").value = parsed.month_key;
    if (parsed.phase) document.getElementById("mt-phase").value = parsed.phase;
    if (parsed.title) document.getElementById("mt-title").value = parsed.title;
    if (parsed.subtitle) document.getElementById("mt-subtitle").value = parsed.subtitle;
    if (parsed.scripture) document.getElementById("mt-scripture").value = parsed.scripture;
    if (parsed.pillar) document.getElementById("mt-pillar").value = parsed.pillar;
    if (parsed.narrative) document.getElementById("mt-narrative").value = parsed.narrative;
    if (parsed.reflection) document.getElementById("mt-reflection").value = parsed.reflection;
    if (parsed.closing) document.getElementById("mt-closing").value = parsed.closing;
    setMonthlyStatus("Field tema bulanan terisi dari teks. Klik Save Monthly Theme untuk menyimpan.");
  });

  document.getElementById("btn-reset-monthly-theme")?.addEventListener("click", () => {
    resetMonthlyThemeForm();
    setMonthlyStatus("");
  });

  document.getElementById("form-monthly-theme")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const monthKey = document.getElementById("mt-key").value.trim();
    if (!monthKey) return;

    const existing = contentState.months.find(m => m.month_key === monthKey || m.id === monthKey);
    const payload = {
      month_key: monthKey,
      phase: document.getElementById("mt-phase").value.trim(),
      title: document.getElementById("mt-title").value.trim(),
      subtitle: document.getElementById("mt-subtitle").value.trim(),
      scripture: document.getElementById("mt-scripture").value.trim(),
      pillar: document.getElementById("mt-pillar").value.trim(),
      narrative: document.getElementById("mt-narrative").value.trim(),
      reflection: document.getElementById("mt-reflection").value.trim(),
      closing: document.getElementById("mt-closing").value.trim(),
      yearly_theme: existing?.yearly_theme || "ALIGN IN PURPOSE — Kitab Keluaran",
      banner_url: existing?.banner_url || "",
      status: "Published"
    };

    try {
      setMonthlyStatus("Menyimpan...");
      await saveMonthlyTheme(monthKey, payload);
      await refreshContentData();
      await initPublicPortal();
      setMonthlyStatus(`Tersimpan (${monthKey} — ${payload.title})`);
    } catch (err) {
      setMonthlyStatus("Gagal menyimpan: " + (err?.message || err), true);
    }
  });

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
    const dateKey = document.getElementById("wk-date").value.trim();
    if (!dateKey) return;
    await saveWeeklyInsight(dateKey, {
      service_date: dateKey,
      month_key: dateKey.slice(0, 7),
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

window.prepareCompassFromMonth = (monthKey) => {
  switchToSubtab("monthly");
  applyCompassDraftToForm(monthKey);
};

window.prepareEditorFromWeek = (weekDate) => {
  switchToSubtab("editors");
  const sel = document.getElementById("ei-source-week");
  if (sel) sel.value = weekDate;
  applyEditorDraftToForm(weekDate);
};

window.prepareReflectionFromWeek = (weekDate) => {
  switchToSubtab("devotions");
  const sel = document.getElementById("dev-source-week");
  if (sel) sel.value = weekDate;
  applyReflectionDraftToForm(weekDate);
};

window.editSermonArchiveItem = (id) => {
  const item = contentState.sermonArchives.find(x => x.id === id);
  if (!item) return;
  document.getElementById("sa-form-title").textContent = "✏️ Edit Arsip Khotbah & Kebaktian";
  document.getElementById("sa-edit-id").value = item.id;
  document.getElementById("sa-title").value = item.title || "";
  document.getElementById("sa-speaker").value = item.speaker || "";
  document.getElementById("sa-type").value = item.service_type || "Sunday Service";
  document.getElementById("sa-date").value = item.service_date || "";
  document.getElementById("sa-time").value = item.service_time || "10:30";
  document.getElementById("sa-youtube").value = item.youtube_url || "";
  document.getElementById("sa-post").value = item.post_url || "";
  document.getElementById("sa-poster").value = item.poster_url || "";
  document.getElementById("sa-linked-week").value = item.linked_week_date || "";
  document.getElementById("sa-notes").value = item.notes || "";
  setSermonArchiveStatus(`Editing: ${item.title || item.service_date}`);
};

window.removeSermonArchiveItem = async (id) => {
  if (!confirm("Hapus arsip khotbah/kebaktian ini?")) return;
  try {
    await deleteSermonArchive(id);
    await refreshContentData();
    setSermonArchiveStatus("Arsip dihapus.");
  } catch (err) {
    alert("Gagal menghapus arsip: " + (err?.message || err));
  }
};

window.editMonthlyThemeItem = (monthKey) => {
  const m = contentState.months.find(x => x.month_key === monthKey || x.id === monthKey);
  if (!m) return;
  document.getElementById("mt-form-title").textContent = `🗓️ Edit Monthly Theme (${m.month_key})`;
  document.getElementById("mt-key").value = m.month_key || m.id || "";
  document.getElementById("mt-phase").value = m.phase || "";
  document.getElementById("mt-title").value = m.title || "";
  document.getElementById("mt-subtitle").value = m.subtitle || "";
  document.getElementById("mt-scripture").value = m.scripture || "";
  document.getElementById("mt-pillar").value = m.pillar || "";
  document.getElementById("mt-narrative").value = m.narrative || "";
  document.getElementById("mt-reflection").value = m.reflection || "";
  document.getElementById("mt-closing").value = m.closing || "Kiranya Tuhan Yesus memberkati.";
  setMonthlyStatus(`Editing ${m.month_key}`);
};

window.removeMonthlyThemeItem = async (monthKey) => {
  if (!confirm(`Hapus tema bulanan ${monthKey}?`)) return;
  await deleteMonthlyTheme(monthKey);
  await refreshContentData();
  await initPublicPortal();
};

window.openNewWeeklyModal = () => {
  const dateInput = document.getElementById("wk-date");
  dateInput.removeAttribute("readonly");
  dateInput.classList.remove("bg-slate-100");
  dateInput.value = "2027-01-03";
  document.getElementById("wk-label").value = "Minggu 1";
  document.getElementById("wk-title").value = "";
  document.getElementById("wk-verse").value = "";
  document.getElementById("wk-reading").value = "";
  if (document.getElementById("wk-speaker")) document.getElementById("wk-speaker").value = "";
  if (document.getElementById("wk-poster")) document.getElementById("wk-poster").value = "";
  if (document.getElementById("wk-youtube")) document.getElementById("wk-youtube").value = "";
  document.getElementById("wk-focus").value = "";
  document.getElementById("wk-christ").value = "";
  document.getElementById("wk-mission").value = "";
  document.getElementById("wk-diaspora").value = "";
  document.getElementById("wk-summary").value = "";
  document.getElementById("wk-icare").value = "";
  document.getElementById("wk-status").value = "Published";
  const heading = document.getElementById("modal-weekly-title");
  if (heading) heading.textContent = "Add Weekly Theme Guideline";
  document.getElementById("modal-weekly").classList.remove("hidden");
};

window.openWeeklyModal = (serviceDate) => {
  const w = contentState.weeks.find(x => x.service_date === serviceDate);
  if (!w) return;
  const dateInput = document.getElementById("wk-date");
  dateInput.setAttribute("readonly", "readonly");
  dateInput.classList.add("bg-slate-100");
  dateInput.value = w.service_date;
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
  const heading = document.getElementById("modal-weekly-title");
  if (heading) heading.textContent = "Edit Weekly Theme Guideline";
  document.getElementById("modal-weekly").classList.remove("hidden");
};

window.removeWeeklyInsightItem = async (serviceDate) => {
  if (!confirm(`Hapus tema mingguan tanggal ${serviceDate}?`)) return;
  await deleteWeeklyInsight(serviceDate);
  await refreshContentData();
  await initPublicPortal();
};

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
