// js/service-archives-tab.js
import {
  getSundayServices,
  saveSundayService,
  deleteSundayService
} from "./db-content.js";
import { initPublicPortal } from "./ui-portal.js";

let archiveState = {
  items: [],
  activeSubtab: "sunday-archive",
  bound: false
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logDiag(msg, isError = false) {
  const el = document.getElementById("sa-tab-status");
  if (el) {
    el.textContent = msg;
    el.className = isError
      ? "text-xs font-bold text-red-600"
      : "text-xs font-bold text-emerald-700";
  }
  const topBanner = document.getElementById("sa-tab-banner-msg");
  if (topBanner) {
    topBanner.textContent = msg;
    topBanner.className = isError
      ? "text-[11px] font-semibold text-red-600"
      : "text-[11px] font-semibold text-blue-700";
  }
}

function resetForm() {
  const heading = document.getElementById("sa-tab-form-title");
  if (heading) heading.textContent = "➕ Add Sunday Service Archive";

  const idInput = document.getElementById("sa-tab-edit-id");
  if (idInput) idInput.value = "";

  const dateInput = document.getElementById("sa-tab-date");
  if (dateInput) {
    dateInput.removeAttribute("readonly");
    dateInput.classList.remove("bg-slate-100");
    dateInput.value = "";
  }

  const titleInput = document.getElementById("sa-tab-title");
  if (titleInput) titleInput.value = "";

  const speakerInput = document.getElementById("sa-tab-speaker");
  if (speakerInput) speakerInput.value = "";

  const ytInput = document.getElementById("sa-tab-youtube");
  if (ytInput) ytInput.value = "";

  const postInput = document.getElementById("sa-tab-post");
  if (postInput) postInput.value = "";

  const posterInput = document.getElementById("sa-tab-poster");
  if (posterInput) posterInput.value = "";

  const pubInput = document.getElementById("sa-tab-published");
  if (pubInput) pubInput.checked = true;
}

function switchArchiveSubtab(subtabKey) {
  archiveState.activeSubtab = subtabKey;
  document.querySelectorAll(".archive-subtab").forEach(btn => {
    const active = btn.dataset.archiveSubtab === subtabKey;
    btn.className = active
      ? "archive-subtab bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold"
      : "archive-subtab bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold";
  });

  document.querySelectorAll(".archive-subpanel").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== `archive-subpanel-${subtabKey}`);
  });
}

function renderArchiveList() {
  const listEl = document.getElementById("sa-tab-list");
  const badgeEl = document.getElementById("sa-tab-count");
  if (!listEl) return;

  const q = (document.getElementById("sa-tab-search")?.value || "").trim().toLowerCase();
  const statusFilter = document.getElementById("sa-tab-filter")?.value || "ALL";

  const filtered = archiveState.items.filter(item => {
    const isPub = item.published !== false;
    if (statusFilter === "PUBLISHED" && !isPub) return false;
    if (statusFilter === "DRAFT" && isPub) return false;
    if (!q) return true;
    return [item.service_date, item.title, item.speaker, item.youtube_url, item.post_url, item.poster_url]
      .filter(Boolean)
      .some(val => String(val).toLowerCase().includes(q));
  });

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} of ${archiveState.items.length} archive(s)`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 col-span-full">No Sunday Service archive records found.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map((item, idx) => {
    const isPub = item.published !== false;
    const rawKey = String(item.id ?? item.service_date ?? idx);
    return `
      <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3 text-xs">
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
          <button type="button" data-sa-action="edit" data-sa-key="${esc(rawKey)}" class="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold cursor-pointer">Edit</button>
          <button type="button" data-sa-action="delete" data-sa-key="${esc(rawKey)}" class="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 font-semibold cursor-pointer">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function openEditFormByKey(rawKey) {
  const item =
    archiveState.items.find(x => String(x.id) === rawKey) ||
    archiveState.items.find(x => String(x.service_date) === rawKey);

  if (!item) {
    logDiag(`Record "${rawKey}" not found in memory (${archiveState.items.length} loaded).`, true);
    return;
  }

  switchArchiveSubtab("sunday-archive");

  const heading = document.getElementById("sa-tab-form-title");
  if (heading) heading.textContent = `✏️ Edit Sunday Service Archive (${item.service_date || item.id})`;

  const idEl = document.getElementById("sa-tab-edit-id");
  if (idEl) idEl.value = item.id ?? item.service_date ?? "";

  const dateInput = document.getElementById("sa-tab-date");
  if (dateInput) {
    dateInput.value = item.service_date || item.id || "";
    dateInput.setAttribute("readonly", "readonly");
    dateInput.classList.add("bg-slate-100");
  }

  const titleInput = document.getElementById("sa-tab-title");
  if (titleInput) titleInput.value = item.title || "";

  const speakerInput = document.getElementById("sa-tab-speaker");
  if (speakerInput) speakerInput.value = item.speaker || "";

  const ytInput = document.getElementById("sa-tab-youtube");
  if (ytInput) ytInput.value = item.youtube_url || "";

  const postInput = document.getElementById("sa-tab-post");
  if (postInput) postInput.value = item.post_url || "";

  const posterInput = document.getElementById("sa-tab-poster");
  if (posterInput) posterInput.value = item.poster_url || "";

  const pubInput = document.getElementById("sa-tab-published");
  if (pubInput) pubInput.checked = item.published !== false;

  logDiag(`Editing ${item.service_date || item.id} — silakan ubah data di form bawah lalu klik Save Archive.`);

  const formCard = document.getElementById("sa-tab-form")?.closest("div");
  if (formCard) {
    formCard.classList.add("ring-2", "ring-amber-400");
    formCard.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => formCard.classList.remove("ring-2", "ring-amber-400"), 2500);
  }
  setTimeout(() => titleInput?.focus(), 200);
}

async function handleDeleteByKey(rawKey) {
  const item =
    archiveState.items.find(x => String(x.id) === rawKey) ||
    archiveState.items.find(x => String(x.service_date) === rawKey);
  const targetId = item?.id ?? rawKey;
  if (!targetId) return;
  if (!confirm(`Delete Sunday Service archive "${targetId}" from Firestore?`)) return;

  try {
    await deleteSundayService(targetId);
    await refreshServiceArchives();
    await initPublicPortal();
    logDiag(`Archive "${targetId}" deleted.`);
  } catch (err) {
    logDiag("Failed to delete: " + (err?.message || err), true);
  }
}

export async function refreshServiceArchives() {
  try {
    archiveState.items = await getSundayServices();
    renderArchiveList();
  } catch (err) {
    console.error("Failed to load sunday_services:", err);
    logDiag("Failed to load archives: " + (err?.message || err), true);
  }
}

export function initMediaServicesTab() {
  if (archiveState.bound) {
    refreshServiceArchives();
    return;
  }
  archiveState.bound = true;

  // Sisipkan banner status di atas daftar agar terlihat jelas
  const listEl = document.getElementById("sa-tab-list");
  if (listEl && !document.getElementById("sa-tab-banner-msg")) {
    const msgBar = document.createElement("p");
    msgBar.id = "sa-tab-banner-msg";
    msgBar.className = "text-[11px] font-semibold text-blue-700";
    listEl.parentElement.insertBefore(msgBar, listEl);
  }

  switchArchiveSubtab("sunday-archive");

  document.getElementById("nav-archives")?.addEventListener("click", () => {
    switchArchiveSubtab(archiveState.activeSubtab || "sunday-archive");
    refreshServiceArchives();
  });

  // Event delegation langsung pada container list (anti-bengong)
  listEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-sa-action]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const action = btn.dataset.saAction;
    const key = btn.dataset.saKey || "";
    if (action === "edit") openEditFormByKey(key);
    if (action === "delete") handleDeleteByKey(key);
  });

  document.querySelectorAll(".archive-subtab").forEach(btn => {
    btn.addEventListener("click", () => {
      switchArchiveSubtab(btn.dataset.archiveSubtab);
    });
  });

  document.getElementById("sa-tab-search")?.addEventListener("input", renderArchiveList);
  document.getElementById("sa-tab-filter")?.addEventListener("change", renderArchiveList);

  document.getElementById("sa-tab-reset")?.addEventListener("click", () => {
    resetForm();
    logDiag("Form siap untuk entri baru.");
  });

  document.getElementById("sa-tab-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("sa-tab-edit-id")?.value.trim() || "";
    const serviceDate = document.getElementById("sa-tab-date")?.value.trim() || "";
    const payload = {
      service_date: serviceDate,
      title: document.getElementById("sa-tab-title")?.value.trim() || "",
      speaker: document.getElementById("sa-tab-speaker")?.value.trim() || "",
      youtube_url: document.getElementById("sa-tab-youtube")?.value.trim() || "",
      post_url: document.getElementById("sa-tab-post")?.value.trim() || "",
      poster_url: document.getElementById("sa-tab-poster")?.value.trim() || "",
      published: Boolean(document.getElementById("sa-tab-published")?.checked)
    };

    try {
      logDiag("Saving...");
      await saveSundayService(editId || serviceDate, payload);
      resetForm();
      await refreshServiceArchives();
      await initPublicPortal();
      logDiag(`Saved (${serviceDate} — ${payload.title})`);
    } catch (err) {
      console.error("Error saving sunday service:", err);
      const msg = err?.message || String(err);
      logDiag("Failed to save: " + msg, true);
    }
  });

  refreshServiceArchives();
}
