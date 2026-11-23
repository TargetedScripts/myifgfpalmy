// js/service-archives-tab.js
import {
  getSundayServices,
  saveSundayService,
  deleteSundayService
} from "./db-content.js";
import { initPublicPortal } from "./ui-portal.js";

let archiveState = {
  items: [],
  activeSubtab: "sunday-archive"
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function findMainNavBar() {
  const knownTab = Array.from(document.querySelectorAll("button, a")).find(el => {
    const txt = (el.textContent || "").trim();
    return txt.includes("Sunday Roster") || txt.includes("Care & Growth") || txt.includes("Content Studio");
  });
  return knownTab ? knownTab.parentElement : null;
}

function findMainPanelsContainer() {
  const navBar = findMainNavBar();
  if (!navBar) return null;
  let sibling = navBar.nextElementSibling;
  while (sibling) {
    if (sibling.children && sibling.children.length >= 2) {
      return sibling;
    }
    sibling = sibling.nextElementSibling;
  }
  return navBar.parentElement;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("sa-tab-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-xs font-semibold text-red-600"
    : "text-xs font-semibold text-emerald-700";
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
  document.querySelectorAll(".sa-subtab-btn").forEach(btn => {
    const active = btn.dataset.saSubtab === subtabKey;
    btn.className = active
      ? "sa-subtab-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white"
      : "sa-subtab-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200";
  });

  document.querySelectorAll(".sa-subpanel").forEach(panel => {
    panel.classList.toggle("hidden", panel.dataset.saPanel !== subtabKey);
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

  listEl.innerHTML = filtered.map(item => {
    const isPub = item.published !== false;
    return `
      <div class="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm flex items-start justify-between gap-3 text-xs">
        <div class="flex items-start gap-3 min-w-0">
          ${item.poster_url
            ? `<img src="${esc(item.poster_url)}" alt="${esc(item.title || "")}" class="w-14 h-20 object-cover rounded-lg border border-slate-200 bg-slate-100 shrink-0" />`
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
          <button type="button" onclick="window.saEditItem('${esc(item.id)}')" class="text-xs font-semibold text-blue-600 hover:underline">Edit</button>
          <button type="button" onclick="window.saDeleteItem('${esc(item.id)}')" class="text-xs font-semibold text-red-600 hover:underline">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

export async function refreshServiceArchives() {
  try {
    archiveState.items = await getSundayServices();
    renderArchiveList();
    setStatus("");
  } catch (err) {
    console.error("Failed to load sunday_services:", err);
    setStatus("Failed to load archives: " + (err?.message || err), true);
  }
}

function activateMainTab(mainTabBtn, mainViewEl) {
  const navBar = findMainNavBar();
  if (navBar) {
    navBar.querySelectorAll("button, a").forEach(btn => {
      if (btn === mainTabBtn) {
        btn.classList.remove("bg-white", "text-slate-700", "border", "border-slate-200");
        btn.classList.add("bg-slate-900", "text-white");
      } else {
        btn.classList.remove("bg-slate-900", "text-white");
      }
    });
  }

  const panelsParent = findMainPanelsContainer();
  if (panelsParent) {
    Array.from(panelsParent.children).forEach(child => {
      if (child !== navBar && child !== mainViewEl) {
        child.classList.add("hidden");
      }
    });
  }

  if (mainViewEl) {
    mainViewEl.classList.remove("hidden");
  }
  refreshServiceArchives();
}

export function initMediaServicesTab() {
  const navBar = findMainNavBar();
  const panelsParent = findMainPanelsContainer();
  if (!navBar || !panelsParent || document.getElementById("main-view-media-services")) return;

  const mainTabBtn = document.createElement("button");
  mainTabBtn.type = "button";
  mainTabBtn.id = "main-tab-media-services";
  mainTabBtn.className = "px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition";
  mainTabBtn.textContent = "🗂️ Media & Services";
  navBar.appendChild(mainTabBtn);

  const mainViewEl = document.createElement("section");
  mainViewEl.id = "main-view-media-services";
  mainViewEl.className = "hidden space-y-4 mt-4";
  mainViewEl.innerHTML = `
    <div class="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-400 text-slate-950 rounded">Media & Services</span>
        <h2 class="font-bold text-base mt-1">Sunday Service Archive & Media</h2>
        <p class="text-[11px] text-slate-300">Manage <code class="font-mono">sunday_services</code> records (date, sermon title, preacher, YouTube link, post link, poster image link).</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-sa-subtab="sunday-archive" class="sa-subtab-btn px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white">
          🎬 Sunday Service Archive
        </button>
      </div>
    </div>

    <div data-sa-panel="sunday-archive" class="sa-subpanel space-y-5 text-xs">
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 class="font-bold text-sm text-slate-900">📋 Sunday Service Archive Inquiry</h3>
            <p class="text-[11px] text-slate-500">Search, filter, edit, or delete saved Sunday Service archives.</p>
          </div>
          <span id="sa-tab-count" class="text-xs font-semibold text-slate-500"></span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            id="sa-tab-search"
            placeholder="Search date, sermon title, preacher, link..."
            class="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
          />
          <select id="sa-tab-filter" class="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
            <option value="ALL">All Status</option>
            <option value="PUBLISHED">Published Only</option>
            <option value="DRAFT">Draft Only</option>
          </select>
        </div>

        <div id="sa-tab-list" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1"></div>
      </div>

      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 id="sa-tab-form-title" class="font-bold text-sm text-slate-900">➕ Add Sunday Service Archive</h3>
            <p class="text-[11px] text-slate-500">Save a new Sunday Service archive entry or edit an existing one.</p>
          </div>
          <button type="button" id="sa-tab-reset" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs">
            New Entry
          </button>
        </div>

        <form id="sa-tab-form" class="space-y-3">
          <input type="hidden" id="sa-tab-edit-id" value="" />

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="font-semibold text-slate-700">Service Date *</label>
              <input type="date" id="sa-tab-date" required class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Sermon Title *</label>
              <input type="text" id="sa-tab-title" required placeholder="Sermon title" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 font-semibold" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Preacher / Speaker *</label>
              <input type="text" id="sa-tab-speaker" required placeholder="Preacher / speaker name" class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="font-semibold text-slate-700">YouTube Link</label>
              <input type="url" id="sa-tab-youtube" placeholder="https://www.youtube.com/..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Post Link</label>
              <input type="url" id="sa-tab-post" placeholder="https://ifgfpalmy.org/..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
            <div>
              <label class="font-semibold text-slate-700">Poster Image Link *</label>
              <input type="url" id="sa-tab-poster" required placeholder="https://ifgfpalmy.org/wp-content/uploads/..." class="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1" />
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="sa-tab-published" checked class="rounded border-slate-300" />
              <span class="font-semibold text-slate-700">Published</span>
            </label>

            <div class="flex items-center gap-3">
              <span id="sa-tab-status" class="text-xs font-semibold text-emerald-700"></span>
              <button type="submit" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg">
                💾 Save Archive
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  panelsParent.appendChild(mainViewEl);

  mainTabBtn.addEventListener("click", () => activateMainTab(mainTabBtn, mainViewEl));

  navBar.addEventListener("click", (e) => {
    const clicked = e.target.closest("button, a");
    if (clicked && clicked !== mainTabBtn) {
      mainViewEl.classList.add("hidden");
      mainTabBtn.classList.remove("bg-slate-900", "text-white");
    }
  });

  mainViewEl.addEventListener("click", (e) => {
    const subBtn = e.target.closest(".sa-subtab-btn");
    if (subBtn && subBtn.dataset.saSubtab) {
      switchArchiveSubtab(subBtn.dataset.saSubtab);
    }
  });

  document.getElementById("sa-tab-search")?.addEventListener("input", renderArchiveList);
  document.getElementById("sa-tab-filter")?.addEventListener("change", renderArchiveList);
  document.getElementById("sa-tab-reset")?.addEventListener("click", () => {
    resetForm();
    setStatus("");
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
      setStatus("Saving...");
      await saveSundayService(editId || serviceDate, payload);
      resetForm();
      await refreshServiceArchives();
      await initPublicPortal();
      setStatus(`Saved (${serviceDate} — ${payload.title})`);
    } catch (err) {
      console.error("Error saving sunday service:", err);
      const msg = err?.message || String(err);
      setStatus("Failed to save: " + msg, true);
      alert("Failed to save Sunday Service archive: " + msg);
    }
  });
}

window.saEditItem = (id) => {
  const item = archiveState.items.find(x => x.id === id);
  if (!item) return;
  switchArchiveSubtab("sunday-archive");

  const heading = document.getElementById("sa-tab-form-title");
  if (heading) heading.textContent = `✏️ Edit Sunday Service Archive (${item.service_date || item.id})`;

  document.getElementById("sa-tab-edit-id").value = item.id;
  const dateInput = document.getElementById("sa-tab-date");
  dateInput.value = item.service_date || item.id || "";
  dateInput.setAttribute("readonly", "readonly");
  dateInput.classList.add("bg-slate-100");

  document.getElementById("sa-tab-title").value = item.title || "";
  document.getElementById("sa-tab-speaker").value = item.speaker || "";
  document.getElementById("sa-tab-youtube").value = item.youtube_url || "";
  document.getElementById("sa-tab-post").value = item.post_url || "";
  document.getElementById("sa-tab-poster").value = item.poster_url || "";
  document.getElementById("sa-tab-published").checked = item.published !== false;
  setStatus(`Editing ${item.service_date || item.id}`);
};

window.saDeleteItem = async (id) => {
  if (!confirm("Delete this Sunday Service archive from Firestore?")) return;
  try {
    await deleteSundayService(id);
    await refreshServiceArchives();
    await initPublicPortal();
    setStatus("Archive deleted.");
  } catch (err) {
    alert("Failed to delete archive: " + (err?.message || err));
  }
};
