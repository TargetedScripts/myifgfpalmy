// js/ui-content.js
import {
  getMonthlyThemes,
  saveMonthlyTheme,
  deleteMonthlyTheme,
  getWeeklyInsights,
  saveWeeklyInsight,
  deleteWeeklyInsight,
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
  parsedBundle: null,
  parsedWeeklyDrafts: []
};

const ID_MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
];

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeInsertBefore(parent, newNode, refNode) {
  if (!parent || !newNode) return;
  if (refNode && refNode.parentNode === parent) {
    parent.insertBefore(newNode, refNode);
  } else {
    parent.appendChild(newNode);
  }
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

function findRealSubtabBar() {
  const anySubtab = document.querySelector(
    ".content-subtab[data-subtab='weekly'], .content-subtab[data-subtab='monthly'], .content-subtab"
  );
  return anySubtab ? anySubtab.parentElement : null;
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
  const targetPanel = document.getElementById(`subpanel-${subtabName}`);
  if (targetPanel) {
    targetPanel.classList.remove("hidden");
  }
}

function ensureWeeklyPosterFields() {
  const form = document.getElementById("form-weekly");
  if (!form || document.getElementById("wk-speaker")) return;

  const focusField = document.getElementById("wk-focus")?.parentElement;
  const targetParent = focusField?.parentElement || form;

  const extraRow = document.createElement("div");
  extraRow.className = "grid grid-cols-1 sm:grid-cols-3 gap-2";
  extraRow.innerHTML = `
    <div>
      <label class="font-semibold text-slate-600">Preacher</label>
      <input type="text" id="wk-speaker" placeholder="Preacher name" class="w-full px-3 py-2 border rounded-lg" />
    </div>
    <div>
      <label class="font-semibold text-slate-600">Poster Image URL</label>
      <input type="url" id="wk-poster" placeholder="https://.../poster.jpg" class="w-full px-3 py-2 border rounded-lg" />
    </div>
    <div>
      <label class="font-semibold text-slate-600">YouTube URL</label>
      <input type="url" id="wk-youtube" placeholder="https://youtube.com/watch?v=..." class="w-full px-3 py-2 border rounded-lg" />
    </div>
  `;
  safeInsertBefore(targetParent, extraRow, focusField);

  const modalHeading = form.parentElement?.querySelector("h3");
  if (modalHeading && !modalHeading.id) modalHeading.id = "modal-weekly-title";
}

function ensureSermonArchivesTabUI() {
  const subtabBar = findRealSubtabBar();
  const mediaPanel = document.getElementById("subpanel-media");
  if (!subtabBar || !mediaPanel || document.getElementById("subpanel-sermons")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "sermons";
  tabBtn.textContent = "🎙️ Sermon Archives";
  const editorsPanel = document.getElementById("subpanel-editors");
  safeInsertBefore(
    subtabBar,
    tabBtn,
    editorsPanel && editorsPanel.parentNode === subtabBar
      ? editorsPanel
      : mediaPanel.parentNode === subtabBar
      ? mediaPanel
      : null
  );

  const panel = document.createElement("div");
  panel.id = "subpanel-sermons";
  panel.className = "content-subpanel hidden grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs";
  panel.innerHTML = `
    <div class="lg:col-span-7 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">🗂️ Sermon Archives</h3>
        <div class="flex flex-wrap items-center gap-2">
          <select id="sa-type-filter" class="px-2.5 py-1 border rounded-lg text-xs bg-white">
            <option value="ALL">All Tags</option>
            <option value="Sunday Service">Sunday Service</option>
            <option value="Worship Night">Worship Night</option>
            <option value="Prayer & Fasting">Prayer & Fasting</option>
            <option value="Special Service">Special Service</option>
            <option value="iCare / Fellowship">iCare / Fellowship</option>
          </select>
          <input type="text" id="sa-search-query" placeholder="Search date, title, preacher..." class="px-2.5 py-1 border rounded-lg text-xs bg-white" />
          <span id="sa-count-badge" class="text-xs text-slate-500"></span>
        </div>
      </div>
      <div id="list-sermon-archives" class="space-y-2.5"></div>
    </div>

    <div class="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5 h-fit">
      <div class="flex items-center justify-between gap-2">
        <h3 id="sa-form-title" class="font-bold text-sm text-slate-900">🎙️ Add / Edit Sermon Archive</h3>
        <button type="button" id="btn-reset-sermon-archive" class="text-[11px] text-slate-500 hover:underline">New</button>
      </div>

      <form id="form-sermon-archive" class="space-y-2.5">
        <input type="hidden" id="sa-edit-id" value="" />

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Date *</label>
            <input type="date" id="sa-date" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Service Tag *</label>
            <select id="sa-type" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 bg-white">
              <option value="Sunday Service">Sunday Service</option>
              <option value="Worship Night">Worship Night</option>
              <option value="Prayer & Fasting">Prayer & Fasting</option>
              <option value="Special Service">Special Service</option>
              <option value="iCare / Fellowship">iCare / Fellowship</option>
            </select>
          </div>
        </div>

        <div>
          <label class="font-semibold text-slate-600">Sermon Title *</label>
          <input type="text" id="sa-title" required placeholder="Sermon title" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 font-semibold" />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Preacher / Speaker *</label>
            <input type="text" id="sa-speaker" required placeholder="Preacher name" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Time (optional)</label>
            <input type="time" id="sa-time" value="10:30" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <div>
          <label class="font-semibold text-slate-600">YouTube URL (optional)</label>
          <input type="url" id="sa-youtube" placeholder="https://www.youtube.com/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Poster Image URL (optional)</label>
          <input type="url" id="sa-poster" placeholder="https://.../poster.jpg" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Post URL (optional)</label>
          <input type="url" id="sa-post" placeholder="https://ifgfpalmy.org/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>

        <div>
          <label class="font-semibold text-slate-600">Notes (optional)</label>
          <textarea id="sa-notes" rows="2" placeholder="Optional notes..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5"></textarea>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1">
          <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
            💾 Save Sermon Archive
          </button>
          <span id="sa-status-msg" class="text-[11px] font-semibold text-emerald-700"></span>
        </div>
      </form>
    </div>
  `;

  mediaPanel.parentElement?.appendChild(panel);
}

function ensureMonthlyCompassTabUI() {
  const monthlyPanel = document.getElementById("subpanel-monthly");
  if (!monthlyPanel || document.getElementById("form-monthly-theme")) return;

  monthlyPanel.className = "content-subpanel hidden space-y-4";
  monthlyPanel.innerHTML = `
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-sm text-slate-900">📚 The Monthly Compass</h3>
        <span id="mt-count-badge" class="text-xs text-slate-500"></span>
      </div>
      <div id="list-monthly-themes" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"></div>
    </div>

    <form id="form-monthly-theme" class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 id="mt-form-title" class="font-bold text-sm text-slate-900">🧭 Add / Edit Monthly Compass</h3>
        <div class="flex items-center gap-2">
          <button type="button" id="btn-gen-compass-from-curr" class="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px]">
            ✨ Pull from Curriculum
          </button>
          <button type="button" id="btn-reset-monthly-theme" class="text-[11px] text-slate-500 hover:underline">Reset</button>
        </div>
      </div>
      <p class="text-[11px] text-slate-500">Pulled from Curriculum or edited/inserted for preachers & web readers.</p>

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div>
          <label class="font-semibold text-slate-600">Month Key *</label>
          <input type="month" id="mt-key" value="2027-01" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Phase</label>
          <input type="text" id="mt-phase" placeholder="Optional" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Scripture</label>
          <input type="text" id="mt-scripture" placeholder="e.g., Exodus 1–2" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Pillar</label>
          <input type="text" id="mt-pillar" placeholder="Optional" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label class="font-semibold text-slate-600">Theme Title *</label>
          <input type="text" id="mt-title" required placeholder="e.g., Begin to See" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 font-semibold" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Subtitle</label>
          <input type="text" id="mt-subtitle" placeholder="Short summary" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
      </div>

      <div>
        <label class="font-semibold text-slate-600">Monthly Compass Narrative</label>
        <textarea id="mt-narrative" rows="4" placeholder="Monthly guide for preachers & internet readers..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5"></textarea>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label class="font-semibold text-slate-600">Monthly Reflection</label>
          <textarea id="mt-reflection" rows="2" placeholder="Monthly reflection..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5"></textarea>
        </div>
        <div>
          <label class="font-semibold text-slate-600">Closing</label>
          <input type="text" id="mt-closing" value="God bless you." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
        </div>
      </div>

      <div class="flex items-center justify-between gap-2 pt-1">
        <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
          💾 Save Monthly Compass
        </button>
        <span id="mt-status-msg" class="text-[11px] font-semibold text-emerald-700"></span>
      </div>
    </form>
  `;
}

function ensureEditorsInsightTabUI() {
  const subtabBar = findRealSubtabBar();
  const mediaPanel = document.getElementById("subpanel-media");
  if (!subtabBar || !mediaPanel || document.getElementById("subpanel-editors")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "editors";
  tabBtn.textContent = "✍️ Editor's Insight";
  safeInsertBefore(subtabBar, tabBtn, mediaPanel.parentNode === subtabBar ? mediaPanel : null);

  const panel = document.createElement("div");
  panel.id = "subpanel-editors";
  panel.className = "content-subpanel hidden space-y-4";
  panel.innerHTML = `
    <div class="space-y-2.5">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-sm text-slate-900">📚 Published Editor's Insights</h3>
        <span id="ei-count-badge" class="text-xs text-slate-500"></span>
      </div>
      <div id="list-editors-insights" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
    </div>

    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">✍️ Add / Edit Editor's Insight (Weekly)</h3>
        <div class="flex flex-wrap items-center gap-2">
          <select id="ei-source-week" class="px-2 py-1 border rounded-lg text-[11px] bg-slate-50 max-w-[240px]"></select>
          <button type="button" id="btn-gen-editor-from-week" class="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold rounded-lg text-[11px]">
            ✨ Pull from Weekly Curriculum
          </button>
          <button type="button" id="btn-reset-editor-insight" class="text-[11px] text-slate-500 hover:underline">Reset</button>
        </div>
      </div>
      <p class="text-[11px] text-slate-500">Add, insert, or edit weekly insights for preachers & web readers; pulls from Weekly Curriculum if no custom entry exists yet.</p>

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
          <input type="text" id="ei-date-label" value="3 – 9 JANUARY 2027" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
        <div>
          <label class="font-semibold text-slate-600">Header Date</label>
          <input type="text" id="ei-header-date" value="3 JANUARY 2027" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5 uppercase" />
        </div>
      </div>

      <div>
        <label class="font-semibold text-slate-600">Weekly Insight Content *</label>
        <textarea id="ei-raw-text" rows="10" placeholder="Write/paste weekly insight or click Pull from Weekly Curriculum..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-0.5 font-sans leading-relaxed"></textarea>
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
  `;

  mediaPanel.parentElement?.appendChild(panel);
}

function ensureDailyReflectionGeneratorUI() {
  const devForm = document.getElementById("form-devotion");
  if (!devForm || document.getElementById("dev-source-week")) return;

  const helperBar = document.createElement("div");
  helperBar.className = "p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-2 text-xs mb-2";
  helperBar.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2">
      <span class="font-bold text-amber-950">✨ Pull from Curriculum</span>
      <select id="dev-source-week" class="px-2 py-1 border rounded-lg text-[11px] bg-white max-w-[230px]"></select>
    </div>
    <button type="button" id="btn-gen-reflection-from-week" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px]">
      ⚡ Draft Daily Reflection from Curriculum
    </button>
  `;
  safeInsertBefore(devForm, helperBar, devForm.firstChild);
}

function ensureSundayServicesStudioUI() {
  const subtabBar = findRealSubtabBar();
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
  panel.className = "content-subpanel hidden space-y-4";
  panel.innerHTML = `
    <div class="space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">🎞️ Published Sunday Services (Cinema Gallery)</h3>
        <div class="flex items-center gap-2">
          <input type="text" id="ss-filter-query" placeholder="Search date, title, preacher..." class="px-2.5 py-1 border rounded-lg text-xs bg-white" />
          <span id="ss-count-badge" class="text-xs text-slate-500"></span>
        </div>
      </div>
      <div id="list-sunday-services" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
    </div>

    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
      <div class="flex items-center justify-between gap-2">
        <h3 class="font-bold text-sm text-slate-900">🎬 Sunday Service Poster & Cinema Data</h3>
        <button type="button" id="btn-reset-sunday-service" class="text-[11px] text-slate-500 hover:underline">New Entry</button>
      </div>
      <p class="text-[11px] text-slate-500">Manage <code class="font-mono">sunday_services</code> collection for cinema gallery on <code class="font-mono">ifgfpalmy.org</code>.</p>

      <form id="form-sunday-service" class="space-y-2.5">
        <input type="hidden" id="ss-edit-id" value="" />
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Service Date *</label>
            <input type="date" id="ss-date" required class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Preacher *</label>
            <input type="text" id="ss-speaker" required placeholder="e.g., Tikva Mooy" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Service / Series Title *</label>
            <input type="text" id="ss-title" required placeholder="e.g., From Prison To Palace" class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label class="font-semibold text-slate-600">Poster Image URL *</label>
            <input type="url" id="ss-poster" required placeholder="https://ifgfpalmy.org/wp-content/uploads/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">YouTube URL (optional)</label>
            <input type="url" id="ss-youtube" placeholder="https://www.youtube.com/live/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
          <div>
            <label class="font-semibold text-slate-600">Post URL (optional)</label>
            <input type="url" id="ss-post" placeholder="https://ifgfpalmy.org/2026/..." class="w-full px-2.5 py-1.5 border rounded-lg mt-0.5" />
          </div>
        </div>

        <label class="flex items-center gap-2 pt-1 cursor-pointer">
          <input type="checkbox" id="ss-published" checked class="rounded border-slate-300" />
          <span class="font-semibold text-slate-700">Published in Public Gallery</span>
        </label>

        <div class="flex flex-wrap items-center gap-2 pt-1">
          <button type="submit" id="btn-save-sunday-service" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
            💾 Save Sunday Service
          </button>
          <span id="ss-status-msg" class="text-[11px] font-medium text-slate-600"></span>
        </div>
      </form>
    </div>
  `;

  mediaPanel.parentElement?.appendChild(panel);
}

function ensureSundayServiceArchiveTabUI() {
  const subtabBar = findRealSubtabBar();
  if (!subtabBar || document.getElementById("subpanel-sunday-archive")) return;

  const tabBtn = document.createElement("button");
  tabBtn.type = "button";
  tabBtn.className = "content-subtab bg-slate-100 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold";
  tabBtn.dataset.subtab = "sunday-archive";
  tabBtn.textContent = "🎬 Sunday Service Archive";
  subtabBar.appendChild(tabBtn);

  const panel = document.createElement("div");
  panel.id = "subpanel-sunday-archive";
  panel.className = "content-subpanel hidden space-y-5 text-xs mt-4";
  panel.innerHTML = `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-bold text-sm text-slate-900">🗂️ Sunday Service Archive Inquiry</h3>
          <p class="text-[11px] text-slate-500">Inquiry, search, edit, or delete saved Sunday services in <code class="font-mono">sunday_services</code> (date, sermon title, preacher, YouTube link, post link, poster image link).</p>
        </div>
        <span id="ssa-count-badge" class="text-xs font-semibold text-slate-500"></span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <input
          type="text"
          id="ssa-search-input"
          placeholder="Search date, sermon title, preacher, link..."
          class="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
        />
        <select id="ssa-status-filter" class="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
          <option value="ALL">All Status</option>
          <option value="PUBLISHED">Published Only</option>
          <option value="DRAFT">Draft Only</option>
        </select>
      </div>

      <div id="ssa-archive-list" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1"></div>
    </div>

    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h3 id="ssa-form-heading" class="font-bold text-sm text-slate-900">➕ Add Sunday Service Archive</h3>
          <p class="text-[11px] text-slate-500">Create a new Sunday Service archive entry or click <strong>Edit</strong> above to update an existing record.</p>
        </div>
        <button type="button" id="ssa-btn-reset" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs">
          New Entry
        </button>
      </div>

      <form id="ssa-archive-form" class="space-y-3">
        <input type="hidden" id="ssa-edit-id" value="" />

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="font-semibold text-slate-700">Service Date *</label>
            <input type="date" id="ssa-date" required class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
          </div>
          <div>
            <label class="font-semibold text-slate-700">Sermon Title *</label>
            <input type="text" id="ssa-title" required placeholder="Sermon title" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 font-semibold" />
          </div>
          <div>
            <label class="font-semibold text-slate-700">Preacher / Speaker *</label>
            <input type="text" id="ssa-speaker" required placeholder="Preacher / speaker name" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="font-semibold text-slate-700">YouTube Link</label>
            <input type="url" id="ssa-youtube" placeholder="https://www.youtube.com/..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
          </div>
          <div>
            <label class="font-semibold text-slate-700">Post Link</label>
            <input type="url" id="ssa-post" placeholder="https://ifgfpalmy.org/..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
          </div>
          <div>
            <label class="font-semibold text-slate-700">Poster Image Link *</label>
            <input type="url" id="ssa-poster" required placeholder="https://ifgfpalmy.org/wp-content/uploads/..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="ssa-published" checked class="rounded border-slate-300" />
            <span class="font-semibold text-slate-700">Published</span>
          </label>

          <div class="flex items-center gap-3">
            <span id="ssa-status-msg" class="text-xs font-semibold text-emerald-700"></span>
            <button type="submit" id="ssa-btn-save" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
              💾 Save Archive
            </button>
          </div>
        </div>
      </form>
    </div>
  `;

  subtabBar.insertAdjacentElement("afterend", panel);
}

function setArchiveStatus(msg, isError = false) {
  const el = document.getElementById("ssa-status-msg");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-xs font-semibold text-red-600"
    : "text-xs font-semibold text-emerald-700";
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
  ensureSermonArchivesTabUI();
  ensureMonthlyCompassTabUI();
  ensureEditorsInsightTabUI();
  ensureDailyReflectionGeneratorUI();
  ensureSundayServicesStudioUI();
  ensureSundayServiceArchiveTabUI();
  bindContentEvents();
  await refreshContentData();
}

async function refreshContentData() {
  const [months, weeks, reflections, media, editorsInsights, sundayServices, sermonArchives] = await Promise.all([
    getMonthlyThemes().catch(err => {
      console.warn("Failed to load monthly_themes:", err);
      return [];
    }),
    getWeeklyInsights().catch(err => {
      console.warn("Failed to load weekly_insights:", err);
      return [];
    }),
    getDailyReflections().catch(err => {
      console.warn("Failed to load daily_reflections:", err);
      return [];
    }),
    getMediaGalleries().catch(err => {
      console.warn("Failed to load media_galleries:", err);
      return [];
    }),
    getEditorsInsights().catch(err => {
      console.warn("Failed to load editors_insights:", err);
      setEditorStatus("Failed to load editors_insights: " + (err.message || err), true);
      return [];
    }),
    getSundayServices().catch(err => {
      console.warn("Failed to load sunday_services:", err);
      setSundayServiceStatus("Failed to load sunday_services: " + (err.message || err), true);
      setArchiveStatus("Failed to load sunday_services: " + (err.message || err), true);
      return [];
    }),
    getSermonArchives().catch(err => {
      console.warn("Failed to load sermon_archives:", err);
      setSermonArchiveStatus("Failed to load sermon_archives: " + (err.message || err), true);
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

  populateWeekSourceDropdowns();
  renderMonthlyCompassList();
  renderReflections();
  renderMedia();
  renderSermonArchivesList();
  renderEditorsInsightsList();
  renderSundayServicesList();
  renderSundayServiceArchive();
}

function resetArchiveForm() {
  const heading = document.getElementById("ssa-form-heading");
  if (heading) heading.textContent = "➕ Add Sunday Service Archive";
  const editId = document.getElementById("ssa-edit-id");
  if (editId) editId.value = "";
  const dateEl = document.getElementById("ssa-date");
  if (dateEl) {
    dateEl.removeAttribute("readonly");
    dateEl.classList.remove("bg-slate-100");
    dateEl.value = "";
  }
  if (document.getElementById("ssa-title")) document.getElementById("ssa-title").value = "";
  if (document.getElementById("ssa-speaker")) document.getElementById("ssa-speaker").value = "";
  if (document.getElementById("ssa-youtube")) document.getElementById("ssa-youtube").value = "";
  if (document.getElementById("ssa-post")) document.getElementById("ssa-post").value = "";
  if (document.getElementById("ssa-poster")) document.getElementById("ssa-poster").value = "";
  if (document.getElementById("ssa-published")) document.getElementById("ssa-published").checked = true;
}

function renderSundayServiceArchive() {
  const listEl = document.getElementById("ssa-archive-list");
  const badgeEl = document.getElementById("ssa-count-badge");
  if (!listEl) return;

  const queryText = (document.getElementById("ssa-search-input")?.value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("ssa-status-filter")?.value || "ALL";

  const filtered = contentState.sundayServices.filter(item => {
    const isPub = item.published !== false;
    if (statusFilter === "PUBLISHED" && !isPub) return false;
    if (statusFilter === "DRAFT" && isPub) return false;
    if (!queryText) return true;
    return [item.service_date, item.title, item.speaker, item.youtube_url, item.post_url, item.poster_url]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(queryText));
  });

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} of ${contentState.sundayServices.length} archive(s)`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-slate-500 col-span-full">No Sunday Service archive records found. Add one using the form below.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map(item => {
    const isPub = item.published !== false;
    return `
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          ${item.poster_url
            ? `<img src="${esc(item.poster_url)}" alt="${esc(item.title || "")}" class="w-14 h-20 object-cover rounded-lg border border-slate-200 bg-white shrink-0" />`
            : `<div class="w-14 h-20 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 shrink-0 text-center px-1">No Poster</div>`
          }
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(item.service_date || item.id)}</span>
              <span class="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-semibold text-[10px]">🎙️ ${esc(item.speaker || "-")}</span>
              <span class="px-2 py-0.5 ${isPub ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-600"} rounded font-semibold text-[10px]">
                ${isPub ? "Published" : "Draft"}
              </span>
            </div>
            <h4 class="font-bold text-sm text-slate-900 break-words">${esc(item.title || "Sunday Service")}</h4>
            <div class="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
              ${item.youtube_url ? `<a href="${esc(item.youtube_url)}" target="_blank" rel="noopener" class="text-red-600 hover:underline font-medium">▶️ YouTube</a>` : `<span class="text-slate-400">YouTube: -</span>`}
              ${item.post_url ? `<a href="${esc(item.post_url)}" target="_blank" rel="noopener" class="text-emerald-700 hover:underline font-medium">🔗 Post</a>` : `<span class="text-slate-400">Post: -</span>`}
              ${item.poster_url ? `<a href="${esc(item.poster_url)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">🖼️ Poster</a>` : `<span class="text-slate-400">Poster: -</span>`}
            </div>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
          <button type="button" onclick="window.editSundayArchiveItem('${esc(item.id)}')" class="text-xs font-semibold text-blue-600 hover:underline">Edit</button>
          <button type="button" onclick="window.removeSundayArchiveItem('${esc(item.id)}')" class="text-xs font-semibold text-red-600 hover:underline">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function getYearlyThemeFromState() {
  return contentState.months.find(m => m.yearly_theme)?.yearly_theme || "ALIGN IN PURPOSE — Exodus";
}

function populateWeekSourceDropdowns() {
  const optionsHtml = contentState.weeks.length
    ? contentState.weeks
        .map(w => `<option value="${esc(w.service_date)}">${esc(w.service_date)} • ${esc(w.week_label || "")} — ${esc(w.title || "")}</option>`)
        .join("")
    : `<option value="">No weekly curriculum items</option>`;

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

function renderMonthlyCompassList() {
  const container = document.getElementById("list-monthly-themes");
  const badge = document.getElementById("mt-count-badge");
  if (!container) return;

  if (badge) badge.textContent = `${contentState.months.length} months`;

  if (contentState.months.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500 col-span-full">No Monthly Compass entries yet. Click "Pull from Curriculum" or fill the form below.</div>`;
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
      ${m.narrative ? `<p class="text-[11px] text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded">${esc(m.narrative)}</p>` : ""}
      <div class="flex justify-end gap-3 pt-1 border-t border-slate-100">
        <button type="button" onclick="window.editMonthlyThemeItem('${esc(m.month_key || m.id)}')" class="text-blue-600 hover:underline font-semibold">Edit</button>
        <button type="button" onclick="window.removeMonthlyThemeItem('${esc(m.month_key || m.id)}')" class="text-red-600 hover:underline font-semibold">Delete</button>
      </div>
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
    return [item.title, item.speaker, item.service_date, item.service_type, item.notes]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(queryText));
  });

  if (badge) {
    badge.textContent = queryText || typeFilter !== "ALL"
      ? `${filtered.length} / ${contentState.sermonArchives.length} archives`
      : `${contentState.sermonArchives.length} archives`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500">No sermon archives found. Add one using the form on the right.</div>`;
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
            <span class="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded font-semibold text-[10px]">${esc(item.service_type || "Sunday Service")}</span>
            ${item.speaker ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-[10px]">🎙️ ${esc(item.speaker)}</span>` : ""}
          </div>
          <h4 class="font-bold text-sm text-slate-900">${esc(item.title || "")}</h4>
          ${item.notes ? `<p class="text-[11px] text-slate-600">${esc(item.notes)}</p>` : ""}
          <div class="flex flex-wrap gap-3 pt-0.5 text-[11px]">
            ${item.youtube_url ? `<a href="${esc(item.youtube_url)}" target="_blank" rel="noopener" class="text-red-600 hover:underline font-medium">▶️ YouTube</a>` : `<span class="text-slate-400">YouTube: -</span>`}
            ${item.poster_url ? `<a href="${esc(item.poster_url)}" target="_blank" rel="noopener" class="text-blue-600 hover:underline font-medium">🖼️ Poster</a>` : `<span class="text-slate-400">Poster: -</span>`}
            ${item.post_url ? `<a href="${esc(item.post_url)}" target="_blank" rel="noopener" class="text-emerald-700 hover:underline font-medium">🔗 Post</a>` : `<span class="text-slate-400">Post: -</span>`}
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
  if (document.getElementById("sa-form-title")) document.getElementById("sa-form-title").textContent = "🎙️ Add / Edit Sermon Archive";
  if (document.getElementById("sa-edit-id")) document.getElementById("sa-edit-id").value = "";
  if (document.getElementById("sa-date")) document.getElementById("sa-date").value = "";
  if (document.getElementById("sa-type")) document.getElementById("sa-type").value = "Sunday Service";
  if (document.getElementById("sa-title")) document.getElementById("sa-title").value = "";
  if (document.getElementById("sa-speaker")) document.getElementById("sa-speaker").value = "";
  if (document.getElementById("sa-time")) document.getElementById("sa-time").value = "10:30";
  if (document.getElementById("sa-youtube")) document.getElementById("sa-youtube").value = "";
  if (document.getElementById("sa-poster")) document.getElementById("sa-poster").value = "";
  if (document.getElementById("sa-post")) document.getElementById("sa-post").value = "";
  if (document.getElementById("sa-notes")) document.getElementById("sa-notes").value = "";
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
      <span class="font-bold text-emerald-700">✅ Parsed Preview (${esc(parsed.start_date || "No Date")} • ${esc(parsed.edition_no || "-")})</span>
      <span class="text-slate-500">${parsed.paragraphs.length} paragraphs • ${parsed.takeaways.length} takeaways</span>
    </div>
    <div><strong>Title:</strong> ${esc(parsed.title || "-")}</div>
    <div><strong>Scripture:</strong> ${esc(parsed.scripture || "-")}</div>
    <div class="p-2 bg-amber-50 border border-amber-200 rounded text-amber-950">
      <strong>Sticky Hook:</strong> "${esc(parsed.sticky_hook || "-")}"
    </div>
    <div class="space-y-1">
      <strong>Paragraphs:</strong>
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
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500 col-span-full">No Editor's Insight editions yet. Click "Pull from Weekly Curriculum" or fill the form below.</div>`;
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
      <p class="text-[11px] text-slate-500">${(item.paragraphs || []).length} paragraphs • ${(item.takeaways || []).length} takeaways</p>
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
    container.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500 col-span-full">No entries in <code class="font-mono">sunday_services</code> yet. Add one using the form below.</div>`;
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
  if (document.getElementById("ss-edit-id")) document.getElementById("ss-edit-id").value = "";
  if (document.getElementById("ss-date")) document.getElementById("ss-date").value = "";
  if (document.getElementById("ss-speaker")) document.getElementById("ss-speaker").value = "";
  if (document.getElementById("ss-title")) document.getElementById("ss-title").value = "";
  if (document.getElementById("ss-poster")) document.getElementById("ss-poster").value = "";
  if (document.getElementById("ss-youtube")) document.getElementById("ss-youtube").value = "";
  if (document.getElementById("ss-post")) document.getElementById("ss-post").value = "";
  if (document.getElementById("ss-published")) document.getElementById("ss-published").checked = true;
}

function applyCompassDraftToForm(monthKey) {
  const mObj = contentState.months.find(m => m.month_key === monthKey || m.id === monthKey) || {
    month_key: monthKey,
    title: "",
    scripture: "",
    narrative: "",
    reflection: "",
    yearly_theme: getYearlyThemeFromState()
  };
  const weeksInMonth = contentState.weeks.filter(w => w.month_key === (mObj.month_key || monthKey));
  const draft = buildCompassDraftFromCurriculum(mObj, weeksInMonth);

  if (document.getElementById("mt-key")) document.getElementById("mt-key").value = draft.month_key;
  if (document.getElementById("mt-phase")) document.getElementById("mt-phase").value = draft.phase;
  if (document.getElementById("mt-title")) document.getElementById("mt-title").value = draft.title;
  if (document.getElementById("mt-subtitle")) document.getElementById("mt-subtitle").value = draft.subtitle;
  if (document.getElementById("mt-scripture")) document.getElementById("mt-scripture").value = draft.scripture;
  if (document.getElementById("mt-pillar")) document.getElementById("mt-pillar").value = draft.pillar;
  if (document.getElementById("mt-narrative")) document.getElementById("mt-narrative").value = draft.narrative;
  if (document.getElementById("mt-reflection")) document.getElementById("mt-reflection").value = draft.reflection;
  if (document.getElementById("mt-closing")) document.getElementById("mt-closing").value = draft.closing;
  setMonthlyStatus(`Monthly Compass draft pulled from curriculum ${draft.month_key}.`);
}

function applyEditorDraftToForm(weekDate) {
  const wObj = contentState.weeks.find(w => w.service_date === weekDate);
  if (!wObj) {
    setEditorStatus("Please select a weekly curriculum item first.", true);
    return;
  }
  const mObj = contentState.months.find(m => m.month_key === wObj.month_key) || {};
  const draft = buildEditorInsightDraftFromCurriculum(wObj, mObj);
  const labels = computeEditorDateLabels(wObj.service_date);

  if (document.getElementById("ei-edit-id")) document.getElementById("ei-edit-id").value = wObj.service_date;
  if (document.getElementById("ei-start-date")) document.getElementById("ei-start-date").value = wObj.service_date;
  if (document.getElementById("ei-edition-no")) document.getElementById("ei-edition-no").value = draft.edition_no;
  if (document.getElementById("ei-date-label")) document.getElementById("ei-date-label").value = labels.date_label || wObj.service_date;
  if (document.getElementById("ei-header-date")) document.getElementById("ei-header-date").value = labels.header_date || wObj.service_date;

  const paras = [...draft.paragraphs];
  if (paras.length > 0 && draft.sticky_hook) {
    paras[0] = `${paras[0]} **${draft.sticky_hook}**`;
  }
  const rawText = [
    `**${draft.title}**`,
    draft.scripture,
    "Shalom,",
    ...paras,
    "God Bless You."
  ].filter(Boolean).join("\n\n");

  if (document.getElementById("ei-raw-text")) document.getElementById("ei-raw-text").value = rawText;
  runEditorInsightParse();
  setEditorStatus(`Editor's Insight draft generated from week ${wObj.service_date}.`);
}

function applyReflectionDraftToForm(weekDate) {
  const wObj = contentState.weeks.find(w => w.service_date === weekDate);
  if (!wObj) return;
  const mObj = contentState.months.find(m => m.month_key === wObj.month_key) || {};
  const currentDateVal = document.getElementById("dev-date")?.value || wObj.service_date;
  const draft = buildDailyReflectionDraftFromCurriculum(wObj, mObj, currentDateVal);

  if (document.getElementById("dev-date")) document.getElementById("dev-date").value = draft.reflection_date;
  if (document.getElementById("dev-title")) document.getElementById("dev-title").value = draft.title;
  if (document.getElementById("dev-verse")) document.getElementById("dev-verse").value = draft.scripture;
  if (document.getElementById("dev-body")) document.getElementById("dev-body").value = draft.reflection;
  if (document.getElementById("dev-prayer")) document.getElementById("dev-prayer").value = draft.prayer;
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
  const subtabBar = findRealSubtabBar();
  if (subtabBar && !subtabBar.dataset.subtabBound) {
    subtabBar.dataset.subtabBound = "1";
    subtabBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".content-subtab");
      if (btn && btn.dataset.subtab) {
        switchToSubtab(btn.dataset.subtab);
      }
    });
  }

  document.querySelectorAll(".content-subtab").forEach(btn => {
    if (!btn.dataset.directBound) {
      btn.dataset.directBound = "1";
      btn.addEventListener("click", () => {
        switchToSubtab(btn.dataset.subtab);
      });
    }
  });

  document.getElementById("ssa-search-input")?.addEventListener("input", renderSundayServiceArchive);
  document.getElementById("ssa-status-filter")?.addEventListener("change", renderSundayServiceArchive);

  document.getElementById("ssa-btn-reset")?.addEventListener("click", () => {
    resetArchiveForm();
    setArchiveStatus("");
  });

  document.getElementById("ssa-archive-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("ssa-edit-id").value.trim();
    const serviceDate = document.getElementById("ssa-date").value.trim();
    const payload = {
      service_date: serviceDate,
      title: document.getElementById("ssa-title").value.trim(),
      speaker: document.getElementById("ssa-speaker").value.trim(),
      youtube_url: document.getElementById("ssa-youtube").value.trim(),
      post_url: document.getElementById("ssa-post").value.trim(),
      poster_url: document.getElementById("ssa-poster").value.trim(),
      published: document.getElementById("ssa-published").checked
    };

    try {
      setArchiveStatus("Saving...");
      await saveSundayService(editId || serviceDate, payload);
      resetArchiveForm();
      await refreshContentData();
      await initPublicPortal();
      setArchiveStatus(`Saved (${serviceDate} — ${payload.title})`);
    } catch (err) {
      console.error("Error saving sunday service archive:", err);
      const msg = err?.message || String(err);
      setArchiveStatus("Failed to save: " + msg, true);
      alert("Failed to save Sunday Service archive: " + msg);
    }
  });

  document.getElementById("btn-gen-compass-from-curr")?.addEventListener("click", () => {
    const mk = document.getElementById("mt-key")?.value || contentState.months[0]?.month_key || "2027-01";
    applyCompassDraftToForm(mk);
  });

  document.getElementById("btn-reset-monthly-theme")?.addEventListener("click", () => {
    if (document.getElementById("mt-key")) document.getElementById("mt-key").value = "2027-01";
    if (document.getElementById("mt-phase")) document.getElementById("mt-phase").value = "";
    if (document.getElementById("mt-title")) document.getElementById("mt-title").value = "";
    if (document.getElementById("mt-subtitle")) document.getElementById("mt-subtitle").value = "";
    if (document.getElementById("mt-scripture")) document.getElementById("mt-scripture").value = "";
    if (document.getElementById("mt-pillar")) document.getElementById("mt-pillar").value = "";
    if (document.getElementById("mt-narrative")) document.getElementById("mt-narrative").value = "";
    if (document.getElementById("mt-reflection")) document.getElementById("mt-reflection").value = "";
    if (document.getElementById("mt-closing")) document.getElementById("mt-closing").value = "God bless you.";
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
      yearly_theme: existing?.yearly_theme || getYearlyThemeFromState(),
      banner_url: existing?.banner_url || "",
      status: "Published"
    };

    try {
      setMonthlyStatus("Saving...");
      await saveMonthlyTheme(monthKey, payload);
      await refreshContentData();
      await initPublicPortal();
      setMonthlyStatus(`Saved (${monthKey} — ${payload.title})`);
    } catch (err) {
      setMonthlyStatus("Failed to save: " + (err?.message || err), true);
    }
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
      service_date: document.getElementById("sa-date").value.trim(),
      service_type: document.getElementById("sa-type").value,
      title: document.getElementById("sa-title").value.trim(),
      speaker: document.getElementById("sa-speaker").value.trim(),
      service_time: document.getElementById("sa-time").value.trim(),
      youtube_url: document.getElementById("sa-youtube").value.trim(),
      poster_url: document.getElementById("sa-poster").value.trim(),
      post_url: document.getElementById("sa-post").value.trim(),
      notes: document.getElementById("sa-notes").value.trim()
    };

    try {
      setSermonArchiveStatus("Saving sermon archive...");
      await saveSermonArchive(editId || null, payload);
      resetSermonArchiveForm();
      await refreshContentData();
      setSermonArchiveStatus(`Saved (${payload.service_date} • ${payload.title})`);
    } catch (err) {
      setSermonArchiveStatus("Failed to save archive: " + (err?.message || err), true);
    }
  });

  document.getElementById("sa-type-filter")?.addEventListener("change", renderSermonArchivesList);
  document.getElementById("sa-search-query")?.addEventListener("input", renderSermonArchivesList);
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
      setSundayServiceStatus("Saving...");
      await saveSundayService(editId || serviceDate, payload);
      resetSundayServiceForm();
      await refreshContentData();
      setSundayServiceStatus(`Saved (${serviceDate} — ${payload.title})`);
    } catch (err) {
      console.error("Error saving sunday service:", err);
      const msg = err?.message || String(err);
      setSundayServiceStatus("Failed to save: " + msg, true);
      alert("Failed to save Sunday Service: " + msg);
    }
  });

  document.getElementById("ei-start-date")?.addEventListener("change", (e) => {
    const labels = computeEditorDateLabels(e.target.value);
    if (labels.date_label && document.getElementById("ei-date-label")) {
      document.getElementById("ei-date-label").value = labels.date_label;
    }
    if (labels.header_date && document.getElementById("ei-header-date")) {
      document.getElementById("ei-header-date").value = labels.header_date;
    }
    if (document.getElementById("ei-raw-text")?.value.trim()) runEditorInsightParse();
  });

  document.getElementById("btn-parse-editor-insight")?.addEventListener("click", () => {
    const parsed = runEditorInsightParse();
    if (!parsed) {
      setEditorStatus("Please paste weekly insight text first.", true);
      alert("Please paste weekly insight text first.");
    } else {
      setEditorStatus("Preview generated. Click Save to Firestore to persist.");
    }
  });

  document.getElementById("btn-save-editor-insight")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const parsed = runEditorInsightParse();
    if (!parsed || !parsed.start_date || !parsed.title) {
      setEditorStatus("Please ensure Start Date and content are provided.", true);
      alert("Please ensure Start Date and content are provided.");
      return;
    }

    btn.disabled = true;
    const prevText = btn.textContent;
    btn.textContent = "Saving...";
    setEditorStatus("Saving to Firestore...");

    try {
      const editId = document.getElementById("ei-edit-id")?.value.trim() || parsed.start_date;
      await saveEditorsInsight(editId, parsed);
      await refreshContentData();
      setEditorStatus(`Saved (${parsed.start_date} • ${parsed.edition_no || ""})`);
      alert(`Saved Editor's Insight (${parsed.start_date} — ${parsed.title}) to Firestore!`);
    } catch (err) {
      console.error("Error saving editors_insights:", err);
      const errMsg = err?.message || String(err);
      setEditorStatus("Failed to save: " + errMsg, true);
      alert("Failed to save to Firestore: " + errMsg);
    } finally {
      btn.disabled = false;
      btn.textContent = prevText;
    }
  });

  document.getElementById("btn-reset-editor-insight")?.addEventListener("click", () => {
    if (document.getElementById("ei-edit-id")) document.getElementById("ei-edit-id").value = "";
    if (document.getElementById("ei-raw-text")) document.getElementById("ei-raw-text").value = "";
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
    document.getElementById("modal-weekly")?.classList.add("hidden");
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

window.editSundayArchiveItem = (id) => {
  const item = contentState.sundayServices.find(x => x.id === id);
  if (!item) return;
  if (document.getElementById("ssa-form-heading")) {
    document.getElementById("ssa-form-heading").textContent = `✏️ Edit Sunday Service Archive (${item.service_date || item.id})`;
  }
  if (document.getElementById("ssa-edit-id")) document.getElementById("ssa-edit-id").value = item.id;
  const dateEl = document.getElementById("ssa-date");
  if (dateEl) {
    dateEl.value = item.service_date || item.id || "";
    dateEl.setAttribute("readonly", "readonly");
    dateEl.classList.add("bg-slate-100");
  }
  if (document.getElementById("ssa-title")) document.getElementById("ssa-title").value = item.title || "";
  if (document.getElementById("ssa-speaker")) document.getElementById("ssa-speaker").value = item.speaker || "";
  if (document.getElementById("ssa-youtube")) document.getElementById("ssa-youtube").value = item.youtube_url || "";
  if (document.getElementById("ssa-post")) document.getElementById("ssa-post").value = item.post_url || "";
  if (document.getElementById("ssa-poster")) document.getElementById("ssa-poster").value = item.poster_url || "";
  if (document.getElementById("ssa-published")) document.getElementById("ssa-published").checked = item.published !== false;
  setArchiveStatus(`Editing ${item.service_date || item.id}`);
  document.getElementById("ssa-archive-form")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

window.removeSundayArchiveItem = async (id) => {
  if (!confirm("Delete this Sunday Service archive from Firestore?")) return;
  try {
    await deleteSundayService(id);
    await refreshContentData();
    await initPublicPortal();
    setArchiveStatus("Archive deleted.");
  } catch (err) {
    alert("Failed to delete archive: " + (err?.message || err));
  }
};

window.editSermonArchiveItem = (id) => {
  const item = contentState.sermonArchives.find(x => x.id === id);
  if (!item) return;
  if (document.getElementById("sa-form-title")) document.getElementById("sa-form-title").textContent = "✏️ Edit Sermon Archive";
  if (document.getElementById("sa-edit-id")) document.getElementById("sa-edit-id").value = item.id;
  if (document.getElementById("sa-date")) document.getElementById("sa-date").value = item.service_date || "";
  if (document.getElementById("sa-type")) document.getElementById("sa-type").value = item.service_type || "Sunday Service";
  if (document.getElementById("sa-title")) document.getElementById("sa-title").value = item.title || "";
  if (document.getElementById("sa-speaker")) document.getElementById("sa-speaker").value = item.speaker || "";
  if (document.getElementById("sa-time")) document.getElementById("sa-time").value = item.service_time || "10:30";
  if (document.getElementById("sa-youtube")) document.getElementById("sa-youtube").value = item.youtube_url || "";
  if (document.getElementById("sa-poster")) document.getElementById("sa-poster").value = item.poster_url || "";
  if (document.getElementById("sa-post")) document.getElementById("sa-post").value = item.post_url || "";
  if (document.getElementById("sa-notes")) document.getElementById("sa-notes").value = item.notes || "";
  setSermonArchiveStatus(`Editing: ${item.title || item.service_date}`);
};

window.removeSermonArchiveItem = async (id) => {
  if (!confirm("Delete this sermon archive?")) return;
  try {
    await deleteSermonArchive(id);
    await refreshContentData();
    setSermonArchiveStatus("Archive deleted.");
  } catch (err) {
    alert("Failed to delete archive: " + (err?.message || err));
  }
};

window.editMonthlyThemeItem = (monthKey) => {
  const m = contentState.months.find(x => x.month_key === monthKey || x.id === monthKey);
  if (!m) return;
  if (document.getElementById("mt-form-title")) document.getElementById("mt-form-title").textContent = `🧭 Edit Monthly Compass (${m.month_key})`;
  if (document.getElementById("mt-key")) document.getElementById("mt-key").value = m.month_key || m.id || "";
  if (document.getElementById("mt-phase")) document.getElementById("mt-phase").value = m.phase || "";
  if (document.getElementById("mt-title")) document.getElementById("mt-title").value = m.title || "";
  if (document.getElementById("mt-subtitle")) document.getElementById("mt-subtitle").value = m.subtitle || "";
  if (document.getElementById("mt-scripture")) document.getElementById("mt-scripture").value = m.scripture || "";
  if (document.getElementById("mt-pillar")) document.getElementById("mt-pillar").value = m.pillar || "";
  if (document.getElementById("mt-narrative")) document.getElementById("mt-narrative").value = m.narrative || "";
  if (document.getElementById("mt-reflection")) document.getElementById("mt-reflection").value = m.reflection || "";
  if (document.getElementById("mt-closing")) document.getElementById("mt-closing").value = m.closing || "God bless you.";
  setMonthlyStatus(`Editing ${m.month_key}`);
};

window.removeMonthlyThemeItem = async (monthKey) => {
  if (!confirm(`Delete Monthly Compass entry ${monthKey}?`)) return;
  await deleteMonthlyTheme(monthKey);
  await refreshContentData();
  await initPublicPortal();
};

window.openNewWeeklyModal = (defaultDate = "2027-01-03") => {
  const dateInput = document.getElementById("wk-date");
  if (dateInput) {
    dateInput.removeAttribute("readonly");
    dateInput.classList.remove("bg-slate-100");
    dateInput.value = defaultDate;
  }
  if (document.getElementById("wk-label")) document.getElementById("wk-label").value = "Week 1";
  if (document.getElementById("wk-title")) document.getElementById("wk-title").value = "";
  if (document.getElementById("wk-verse")) document.getElementById("wk-verse").value = "";
  if (document.getElementById("wk-reading")) document.getElementById("wk-reading").value = "";
  if (document.getElementById("wk-speaker")) document.getElementById("wk-speaker").value = "";
  if (document.getElementById("wk-poster")) document.getElementById("wk-poster").value = "";
  if (document.getElementById("wk-youtube")) document.getElementById("wk-youtube").value = "";
  if (document.getElementById("wk-focus")) document.getElementById("wk-focus").value = "";
  if (document.getElementById("wk-christ")) document.getElementById("wk-christ").value = "";
  if (document.getElementById("wk-mission")) document.getElementById("wk-mission").value = "";
  if (document.getElementById("wk-diaspora")) document.getElementById("wk-diaspora").value = "";
  if (document.getElementById("wk-summary")) document.getElementById("wk-summary").value = "";
  if (document.getElementById("wk-icare")) document.getElementById("wk-icare").value = "";
  if (document.getElementById("wk-status")) document.getElementById("wk-status").value = "Published";
  const heading = document.getElementById("modal-weekly-title");
  if (heading) heading.textContent = "Add Week & Preacher";
  document.getElementById("modal-weekly")?.classList.remove("hidden");
};

window.openWeeklyModal = (serviceDate) => {
  const w = contentState.weeks.find(x => x.service_date === serviceDate);
  if (!w) return;
  const dateInput = document.getElementById("wk-date");
  if (dateInput) {
    dateInput.setAttribute("readonly", "readonly");
    dateInput.classList.add("bg-slate-100");
    dateInput.value = w.service_date;
  }
  if (document.getElementById("wk-label")) document.getElementById("wk-label").value = w.week_label || "";
  if (document.getElementById("wk-title")) document.getElementById("wk-title").value = w.title || "";
  if (document.getElementById("wk-verse")) document.getElementById("wk-verse").value = w.key_verse || "";
  if (document.getElementById("wk-reading")) document.getElementById("wk-reading").value = w.scripture_reading || "";
  if (document.getElementById("wk-speaker")) document.getElementById("wk-speaker").value = w.speaker || "";
  if (document.getElementById("wk-poster")) document.getElementById("wk-poster").value = w.poster_url || "";
  if (document.getElementById("wk-youtube")) document.getElementById("wk-youtube").value = w.youtube_url || "";
  if (document.getElementById("wk-focus")) document.getElementById("wk-focus").value = w.weekly_focus || "";
  if (document.getElementById("wk-christ")) document.getElementById("wk-christ").value = w.christ_connection || "";
  if (document.getElementById("wk-mission")) document.getElementById("wk-mission").value = w.mission_application || "";
  if (document.getElementById("wk-diaspora")) document.getElementById("wk-diaspora").value = w.diaspora_lens || "";
  if (document.getElementById("wk-summary")) document.getElementById("wk-summary").value = w.sermon_summary || "";
  if (document.getElementById("wk-icare")) document.getElementById("wk-icare").value = w.icare_questions || "";
  if (document.getElementById("wk-status")) document.getElementById("wk-status").value = w.status || "Scheduled";
  const heading = document.getElementById("modal-weekly-title");
  if (heading) heading.textContent = "Edit Week & Preacher";
  document.getElementById("modal-weekly")?.classList.remove("hidden");
};

window.removeWeeklyInsightItem = async (serviceDate) => {
  if (!confirm(`Delete weekly entry on ${serviceDate}?`)) return;
  await deleteWeeklyInsight(serviceDate);
  await refreshContentData();
  await initPublicPortal();
};

window.editSundayServiceItem = (id) => {
  const item = contentState.sundayServices.find(x => x.id === id);
  if (!item) return;
  if (document.getElementById("ss-edit-id")) document.getElementById("ss-edit-id").value = item.id;
  if (document.getElementById("ss-date")) document.getElementById("ss-date").value = item.service_date || item.id || "";
  if (document.getElementById("ss-speaker")) document.getElementById("ss-speaker").value = item.speaker || "";
  if (document.getElementById("ss-title")) document.getElementById("ss-title").value = item.title || "";
  if (document.getElementById("ss-poster")) document.getElementById("ss-poster").value = item.poster_url || "";
  if (document.getElementById("ss-youtube")) document.getElementById("ss-youtube").value = item.youtube_url || "";
  if (document.getElementById("ss-post")) document.getElementById("ss-post").value = item.post_url || "";
  if (document.getElementById("ss-published")) document.getElementById("ss-published").checked = item.published !== false;
  setSundayServiceStatus(`Editing ${item.service_date || item.id}`);
};

window.removeSundayServiceItem = async (id) => {
  if (!confirm("Delete this Sunday Service entry from Firestore?")) return;
  try {
    await deleteSundayService(id);
    await refreshContentData();
    setSundayServiceStatus("Entry deleted.");
  } catch (err) {
    alert("Failed to delete: " + (err?.message || err));
  }
};

window.editEditorInsightItem = (id) => {
  const item = contentState.editorsInsights.find(x => x.id === id);
  if (!item) return;

  if (document.getElementById("ei-edit-id")) document.getElementById("ei-edit-id").value = item.id;
  if (document.getElementById("ei-start-date")) document.getElementById("ei-start-date").value = item.start_date || "";
  if (document.getElementById("ei-edition-no")) document.getElementById("ei-edition-no").value = item.edition_no || "";
  if (document.getElementById("ei-date-label")) document.getElementById("ei-date-label").value = item.date_label || "";
  if (document.getElementById("ei-header-date")) document.getElementById("ei-header-date").value = item.header_date || "";

  const paras = [...(item.paragraphs || [])];
  if (paras.length > 0 && item.sticky_hook) {
    paras[0] = `${paras[0]} **${item.sticky_hook}**`;
  }
  const reconstructed = [
    `**${item.title || ""}**`,
    item.scripture || "",
    "Shalom,",
    ...paras,
    "God Bless You."
  ].filter(Boolean).join("\n\n");

  if (document.getElementById("ei-raw-text")) document.getElementById("ei-raw-text").value = reconstructed;
  runEditorInsightParse();
};

window.removeEditorInsightItem = async (id) => {
  if (!confirm("Delete this Editor's Insight edition?")) return;
  try {
    await deleteEditorsInsight(id);
    await refreshContentData();
    setEditorStatus("Edition deleted.");
  } catch (err) {
    alert("Failed to delete: " + (err?.message || err));
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
