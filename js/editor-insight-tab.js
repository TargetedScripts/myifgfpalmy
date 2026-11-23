// js/editor-insight-tab.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { parseEditorInsightRawText } from "./editor-insight-parser.js";

const EDITORS_COLLECTION = "editors_insights";

let insightState = {
  items: [],
  bound: false
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logStatus(msg, isError = false) {
  const el = document.getElementById("ei-tab-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-xs font-bold text-red-600"
    : "text-xs font-bold text-emerald-700";
}

function normalizeParagraphs(raw) {
  if (Array.isArray(raw)) {
    return raw.map(p => String(p || "").trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTakeaways(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(t => {
      if (typeof t === "string") {
        const [title, ...rest] = t.split("|");
        return { title: (title || "").trim(), desc: rest.join("|").trim() };
      }
      return {
        title: String(t?.title || "").trim(),
        desc: String(t?.desc || t?.description || "").trim()
      };
    })
    .filter(t => t.title || t.desc);
}

function resetForm() {
  const heading = document.getElementById("ei-tab-form-title");
  if (heading) heading.textContent = "➕ Add Editor's Insight";

  const idInput = document.getElementById("ei-tab-edit-id");
  if (idInput) idInput.value = "";

  [
    "ei-tab-start-date",
    "ei-tab-edition-no",
    "ei-tab-date-label",
    "ei-tab-header-date",
    "ei-tab-title",
    "ei-tab-scripture",
    "ei-tab-sticky-hook",
    "ei-tab-paragraphs",
    "ei-tab-takeaways",
    "ei-tab-raw-paste"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function fillFormFromData(data = {}, preserveEditId = false) {
  if (!preserveEditId) {
    const idEl = document.getElementById("ei-tab-edit-id");
    if (idEl) idEl.value = data.id ?? "";
  }

  if (data.start_date !== undefined) {
    const el = document.getElementById("ei-tab-start-date");
    if (el) el.value = data.start_date || "";
  }
  if (data.edition_no !== undefined) {
    const el = document.getElementById("ei-tab-edition-no");
    if (el) el.value = data.edition_no || "";
  }
  if (data.date_label !== undefined) {
    const el = document.getElementById("ei-tab-date-label");
    if (el) el.value = data.date_label || "";
  }
  if (data.header_date !== undefined) {
    const el = document.getElementById("ei-tab-header-date");
    if (el) el.value = data.header_date || "";
  }
  if (data.title !== undefined) {
    const el = document.getElementById("ei-tab-title");
    if (el) el.value = data.title || "";
  }
  if (data.scripture !== undefined) {
    const el = document.getElementById("ei-tab-scripture");
    if (el) el.value = data.scripture || "";
  }
  if (data.sticky_hook !== undefined) {
    const el = document.getElementById("ei-tab-sticky-hook");
    if (el) el.value = data.sticky_hook || "";
  }
  if (data.paragraphs !== undefined) {
    const el = document.getElementById("ei-tab-paragraphs");
    if (el) el.value = normalizeParagraphs(data.paragraphs).join("\n\n");
  }
  if (data.takeaways !== undefined) {
    const el = document.getElementById("ei-tab-takeaways");
    if (el) {
      el.value = normalizeTakeaways(data.takeaways)
        .map(t => (t.desc ? `${t.title} | ${t.desc}` : t.title))
        .join("\n");
    }
  }
}

function ensureDom() {
  const panel = document.getElementById("panel-archives");
  if (!panel) return;

  const firstSubtabBtn = panel.querySelector('.archive-subtab[data-archive-subtab="sunday-archive"]');
  const subtabBar = firstSubtabBtn?.parentElement;
  if (subtabBar && !subtabBar.querySelector('[data-archive-subtab="editors-insight"]')) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "archive-subtab bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold";
    btn.dataset.archiveSubtab = "editors-insight";
    btn.textContent = "✍️ The Editor's Insight";
    subtabBar.appendChild(btn);
  }

  if (!document.getElementById("archive-subpanel-editors-insight")) {
    const subpanel = document.createElement("div");
    subpanel.id = "archive-subpanel-editors-insight";
    subpanel.className = "archive-subpanel hidden space-y-5 text-xs";
    subpanel.innerHTML = `
      <!-- LIST FROM FIRESTORE -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-sm text-slate-900">📋 The Editor's Insight (<code class="font-mono text-amber-700">editors_insights</code>)</h3>
            <p class="text-[11px] text-slate-500">Materi Editor's Insight di Firebase yang digunakan oleh website.</p>
          </div>
          <div class="flex items-center gap-2">
            <span id="ei-tab-count" class="text-xs font-semibold text-slate-500"></span>
            <button type="button" id="ei-tab-refresh" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs">
              ↻ Reload
            </button>
          </div>
        </div>

        <input
          type="text"
          id="ei-tab-search"
          placeholder="Search edition no, title, scripture, date, hook, content..."
          class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
        />

        <div id="ei-tab-list" class="space-y-3 pt-1"></div>
      </div>

      <!-- ADD / EDIT FORM -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 id="ei-tab-form-title" class="font-bold text-sm text-slate-900">➕ Add Editor's Insight</h3>
            <p class="text-[11px] text-slate-500">Paste teks mentah lalu klik <strong>Parse Raw Text</strong>, atau isi/edit field secara langsung.</p>
          </div>
          <button type="button" id="ei-tab-reset" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs">
            New Entry
          </button>
        </div>

        <!-- SMART PARSER FROM editor-insight-parser.js -->
        <div class="p-3 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <label for="ei-tab-raw-paste" class="font-bold text-amber-950">⚡ Smart Paste Raw Text (Auto-Parse Title, Scripture, Hook, Paragraphs & Takeaways)</label>
            <button type="button" id="ei-tab-parse-btn" class="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shrink-0">
              🔍 Parse Raw Text
            </button>
          </div>
          <textarea
            id="ei-tab-raw-paste"
            rows="4"
            placeholder="Paste teks lengkap Editor's Insight di sini (termasuk **Judul**, ayat kunci, paragraf, atau **English Hook**), lalu klik Parse Raw Text..."
            class="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white text-xs"
          ></textarea>
        </div>

        <form id="ei-tab-form" class="space-y-3">
          <input type="hidden" id="ei-tab-edit-id" value="" />

          <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label class="font-semibold text-slate-700">Start Date *</label>
              <input type="date" id="ei-tab-start-date" required class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Edition No</label>
              <input type="text" id="ei-tab-edition-no" placeholder="e.g., NO. II.45" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Date Label</label>
              <input type="text" id="ei-tab-date-label" placeholder="e.g., 23 – 29 Nov 2026" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Header Date</label>
              <input type="text" id="ei-tab-header-date" placeholder="e.g., November 2026" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="font-semibold text-slate-700">Title *</label>
              <input type="text" id="ei-tab-title" required placeholder="Editor's Insight Title" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 font-semibold" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Scripture</label>
              <input type="text" id="ei-tab-scripture" placeholder="e.g., Kejadian 41:14 — ..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
          </div>

          <div>
            <label class="font-semibold text-slate-700">Sticky Hook</label>
            <input type="text" id="ei-tab-sticky-hook" placeholder="Short hook / highlight..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
          </div>

          <div>
            <label class="font-semibold text-slate-700">Paragraphs (pisahkan tiap paragraf dengan baris kosong)</label>
            <textarea id="ei-tab-paragraphs" rows="6" placeholder="Paragraf 1...&#10;&#10;Paragraf 2..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 font-mono text-xs"></textarea>
          </div>

          <div>
            <label class="font-semibold text-slate-700">Takeaways (1 baris = 1 poin, format: <code class="font-mono">Judul | Deskripsi</code>)</label>
            <textarea id="ei-tab-takeaways" rows="4" placeholder="1. Poin Utama | Penjelasan singkat" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 font-mono text-xs"></textarea>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3 pt-1">
            <span id="ei-tab-status" class="text-xs font-semibold text-emerald-700"></span>
            <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
              💾 Save Editor's Insight
            </button>
          </div>
        </form>
      </div>
    `;
    panel.appendChild(subpanel);
  }
}

function renderList() {
  const listEl = document.getElementById("ei-tab-list");
  const badgeEl = document.getElementById("ei-tab-count");
  if (!listEl) return;

  const q = (document.getElementById("ei-tab-search")?.value || "").trim().toLowerCase();

  const filtered = insightState.items.filter(item => {
    if (!q) return true;
    const paras = normalizeParagraphs(item.paragraphs).join(" ");
    const takes = normalizeTakeaways(item.takeaways).map(t => `${t.title} ${t.desc}`).join(" ");
    return [
      item.id,
      item.start_date,
      item.edition_no,
      item.date_label,
      item.header_date,
      item.title,
      item.scripture,
      item.sticky_hook,
      paras,
      takes
    ]
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(q));
  });

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} of ${insightState.items.length} edition(s)`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
        No Editor's Insight records found in <code class="font-mono">editors_insights</code>.
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map((item, idx) => {
    const rawKey = String(item.id ?? item.start_date ?? idx);
    const paras = normalizeParagraphs(item.paragraphs);
    const takes = normalizeTakeaways(item.takeaways);
    return `
      <div class="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5 text-xs">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div class="space-y-1 min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              ${item.edition_no ? `<span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(item.edition_no)}</span>` : ""}
              ${item.start_date ? `<span class="font-mono font-semibold px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px]">📅 ${esc(item.start_date)}</span>` : ""}
              ${item.date_label ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-semibold text-[10px]">${esc(item.date_label)}</span>` : ""}
              ${item.header_date ? `<span class="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded font-semibold text-[10px]">${esc(item.header_date)}</span>` : ""}
            </div>
            <h4 class="font-bold text-sm text-slate-900">${esc(item.title || "Untitled Insight")}</h4>
            ${item.scripture ? `<p class="text-[11px] font-semibold text-amber-800">📖 ${esc(item.scripture)}</p>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" data-ei-action="edit" data-ei-key="${esc(rawKey)}" class="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold cursor-pointer">Edit</button>
            <button type="button" data-ei-action="delete" data-ei-key="${esc(rawKey)}" class="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 font-semibold cursor-pointer">Delete</button>
          </div>
        </div>

        ${item.sticky_hook ? `<p class="text-xs italic text-slate-700 bg-amber-50/80 border-l-2 border-amber-500 px-3 py-1.5 rounded-r">“${esc(item.sticky_hook)}”</p>` : ""}

        ${paras.length > 0 ? `
          <div class="space-y-1.5 text-slate-700 leading-relaxed">
            ${paras.slice(0, 2).map(p => `<p>${esc(p)}</p>`).join("")}
            ${paras.length > 2 ? `<p class="text-[11px] text-slate-500 font-medium">+ ${paras.length - 2} more paragraph(s)</p>` : ""}
          </div>
        ` : ""}

        ${takes.length > 0 ? `
          <div class="pt-1 border-t border-slate-200/80 flex flex-wrap gap-1.5">
            ${takes.map(t => `<span class="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700"><strong>${esc(t.title)}</strong>${t.desc ? `: ${esc(t.desc)}` : ""}</span>`).join("")}
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

export async function refreshEditorsInsights() {
  ensureDom();
  try {
    logStatus("Loading from Firestore...");
    const snap = await getDocs(collection(db, EDITORS_COLLECTION));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(b.start_date || b.id || "").localeCompare(String(a.start_date || a.id || "")));
    insightState.items = list;
    renderList();
    logStatus("");
  } catch (err) {
    console.error("Failed to load editors_insights:", err);
    logStatus("Failed to load editors_insights: " + (err?.message || err), true);
  }
}

function openEditByKey(rawKey) {
  const item =
    insightState.items.find(x => String(x.id) === rawKey) ||
    insightState.items.find(x => String(x.start_date) === rawKey);
  if (!item) return;

  const heading = document.getElementById("ei-tab-form-title");
  if (heading) heading.textContent = `✏️ Edit Editor's Insight (${item.edition_no || item.start_date || item.id})`;

  fillFormFromData(item, false);
  logStatus(`Editing ${item.edition_no || item.start_date || item.id}`);

  const formCard = document.getElementById("ei-tab-form")?.closest("div");
  if (formCard) {
    formCard.classList.add("ring-2", "ring-amber-400");
    formCard.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => formCard.classList.remove("ring-2", "ring-amber-400"), 2500);
  }
}

async function handleDeleteByKey(rawKey) {
  const item =
    insightState.items.find(x => String(x.id) === rawKey) ||
    insightState.items.find(x => String(x.start_date) === rawKey);
  const targetId = item?.id ?? rawKey;
  if (!targetId) return;
  if (!confirm(`Delete Editor's Insight "${item?.title || targetId}" from Firestore?`)) return;

  try {
    await deleteDoc(doc(db, EDITORS_COLLECTION, String(targetId)));
    await refreshEditorsInsights();
    logStatus(`Deleted "${item?.title || targetId}".`);
  } catch (err) {
    logStatus("Failed to delete: " + (err?.message || err), true);
  }
}

export function initEditorInsightTab() {
  ensureDom();
  if (insightState.bound) {
    refreshEditorsInsights();
    return;
  }
  insightState.bound = true;

  document.getElementById("ei-tab-refresh")?.addEventListener("click", refreshEditorsInsights);
  document.getElementById("ei-tab-search")?.addEventListener("input", renderList);

  document.getElementById("ei-tab-reset")?.addEventListener("click", () => {
    resetForm();
    logStatus("Form siap untuk entri baru.");
  });

  document.getElementById("ei-tab-parse-btn")?.addEventListener("click", () => {
    const raw = document.getElementById("ei-tab-raw-paste")?.value || "";
    if (!raw.trim()) {
      logStatus("Tempel teks mentah terlebih dahulu sebelum Parse.", true);
      return;
    }
    const parsed = parseEditorInsightRawText(raw, {
      start_date: document.getElementById("ei-tab-start-date")?.value.trim() || "",
      edition_no: document.getElementById("ei-tab-edition-no")?.value.trim() || "",
      date_label: document.getElementById("ei-tab-date-label")?.value.trim() || "",
      header_date: document.getElementById("ei-tab-header-date")?.value.trim() || ""
    });
    fillFormFromData(parsed, true);
    logStatus("Raw text berhasil di-parse ke form!");
  });

  document.getElementById("ei-tab-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-ei-action]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const action = btn.dataset.eiAction;
    const key = btn.dataset.eiKey || "";
    if (action === "edit") openEditByKey(key);
    if (action === "delete") handleDeleteByKey(key);
  });

  document.getElementById("ei-tab-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("ei-tab-edit-id")?.value.trim() || "";
    const startDate = document.getElementById("ei-tab-start-date")?.value.trim() || "";
    const editionNo = document.getElementById("ei-tab-edition-no")?.value.trim() || "";
    const dateLabel = document.getElementById("ei-tab-date-label")?.value.trim() || "";
    const headerDate = document.getElementById("ei-tab-header-date")?.value.trim() || "";
    const title = document.getElementById("ei-tab-title")?.value.trim() || "";
    const scripture = document.getElementById("ei-tab-scripture")?.value.trim() || "";
    const stickyHook = document.getElementById("ei-tab-sticky-hook")?.value.trim() || "";

    const paragraphs = normalizeParagraphs(
      document.getElementById("ei-tab-paragraphs")?.value || ""
    );

    const takeaways = (document.getElementById("ei-tab-takeaways")?.value || "")
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [tTitle, ...rest] = line.split("|");
        return {
          title: (tTitle || "").trim(),
          desc: rest.join("|").trim()
        };
      });

    const docId =
      editId ||
      [startDate, editionNo].filter(Boolean).join("_").replace(/[^a-zA-Z0-9_-]/g, "-") ||
      `insight-${Date.now()}`;

    const payload = {
      start_date: startDate,
      edition_no: editionNo,
      date_label: dateLabel,
      header_date: headerDate,
      title,
      scripture,
      sticky_hook: stickyHook,
      paragraphs,
      takeaways
    };

    try {
      logStatus("Saving to Firestore...");
      await setDoc(doc(db, EDITORS_COLLECTION, docId), payload, { merge: true });
      resetForm();
      await refreshEditorsInsights();
      logStatus(`Saved Editor's Insight (${docId} — ${title})`);
    } catch (err) {
      console.error("Failed to save editors_insights:", err);
      logStatus("Failed to save: " + (err?.message || err), true);
    }
  });

  refreshEditorsInsights();
}
