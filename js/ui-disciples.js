// js/ui-disciples.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ICARE_OPTIONS = ["Darah Muda", "Keluarga Muda", "Jiwa Muda"];

const state = {
  disciples: [],
  searchQuery: "",
  eventsBound: false
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normText(val = "") {
  return String(val || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normPhone(val = "") {
  return String(val || "").replace(/\D+/g, "");
}

function normalizeIcareGroups(item = {}) {
  if (Array.isArray(item.icare_groups) && item.icare_groups.length > 0) {
    return item.icare_groups.map((g) => String(g || "").trim()).filter(Boolean);
  }
  const raw = String(item.icare_group || item.age_group || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

export function generateNextMemberId(existingDisciples = [], prefix = "IFGF", padLength = 3) {
  let maxNum = 0;

  (Array.isArray(existingDisciples) ? existingDisciples : []).forEach((d) => {
    const rawId = String(d?.member_id || "").trim();
    const match = rawId.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (Number.isFinite(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  return `${prefix}-${String(maxNum + 1).padStart(padLength, "0")}`;
}

async function fetchAllDisciples() {
  const snap = await getDocs(collection(db, "disciples"));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || "")));
}

function ensureModalIcareField() {
  const form = document.getElementById("form-disciple");
  if (!form) return;

  if (!document.getElementById("disciple-icare-group")) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <label class="block text-xs font-semibold text-slate-600 mb-1">iCare Group</label>
      <select id="disciple-icare-group" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white">
        <option value="">— Select iCare Group —</option>
        <option value="Darah Muda">Darah Muda</option>
        <option value="Keluarga Muda">Keluarga Muda</option>
        <option value="Jiwa Muda">Jiwa Muda</option>
        <option value="Keluarga Muda, Jiwa Muda">Keluarga Muda, Jiwa Muda</option>
        <option value="Darah Muda, Keluarga Muda">Darah Muda, Keluarga Muda</option>
      </select>
    `;
    const statusRow = document.getElementById("disciple-status")?.closest(".grid");
    if (statusRow && statusRow.parentNode) {
      statusRow.parentNode.insertBefore(wrapper, statusRow.nextSibling);
    } else {
      form.prepend(wrapper);
    }
  }

  if (!document.getElementById("disciple-member-id-preview")) {
    const preview = document.createElement("p");
    preview.id = "disciple-member-id-preview";
    preview.className = "text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block";
    const titleEl = document.getElementById("modal-disciple-title");
    if (titleEl && titleEl.parentNode) {
      titleEl.parentNode.insertBefore(preview, titleEl.nextSibling);
    }
  }
}

export function openNewDiscipleModal() {
  ensureModalIcareField();
  const modal = document.getElementById("modal-disciple");
  const titleEl = document.getElementById("modal-disciple-title");
  const nextId = generateNextMemberId(state.disciples);

  if (titleEl) titleEl.textContent = "Add New Disciple";
  const previewEl = document.getElementById("disciple-member-id-preview");
  if (previewEl) previewEl.textContent = `Auto Member ID: ${nextId}`;

  const idInput = document.getElementById("disciple-id");
  const nameInput = document.getElementById("disciple-name");
  const emailInput = document.getElementById("disciple-email");
  const phoneInput = document.getElementById("disciple-phone");
  const statusInput = document.getElementById("disciple-status");
  const sysRoleInput = document.getElementById("disciple-sysrole");
  const djLightInput = document.getElementById("disciple-djlight");
  const baptizedInput = document.getElementById("disciple-baptized");
  const baptismDateInput = document.getElementById("disciple-baptism-date");
  const icareSelect = document.getElementById("disciple-icare-group");

  if (idInput) idInput.value = "";
  if (nameInput) nameInput.value = "";
  if (emailInput) emailInput.value = "";
  if (phoneInput) phoneInput.value = "";
  if (statusInput) statusInput.value = "Active";
  if (sysRoleInput) sysRoleInput.value = "member";
  if (djLightInput) djLightInput.value = "red";
  if (baptizedInput) baptizedInput.checked = false;
  if (baptismDateInput) baptismDateInput.value = "";
  if (icareSelect) icareSelect.value = "";

  if (modal) modal.classList.remove("hidden");
  setTimeout(() => nameInput?.focus(), 30);
}

export function openEditDiscipleModal(discipleId) {
  const item = state.disciples.find((d) => d.id === discipleId);
  if (!item) return;

  ensureModalIcareField();
  const modal = document.getElementById("modal-disciple");
  const titleEl = document.getElementById("modal-disciple-title");
  if (titleEl) titleEl.textContent = `Edit Disciple — ${item.full_name || ""}`;

  const previewEl = document.getElementById("disciple-member-id-preview");
  if (previewEl) previewEl.textContent = `Member ID: ${item.member_id || "—"}`;

  const idInput = document.getElementById("disciple-id");
  const nameInput = document.getElementById("disciple-name");
  const emailInput = document.getElementById("disciple-email");
  const phoneInput = document.getElementById("disciple-phone");
  const statusInput = document.getElementById("disciple-status");
  const sysRoleInput = document.getElementById("disciple-sysrole");
  const djLightInput = document.getElementById("disciple-djlight");
  const baptizedInput = document.getElementById("disciple-baptized");
  const baptismDateInput = document.getElementById("disciple-baptism-date");
  const icareSelect = document.getElementById("disciple-icare-group");

  if (idInput) idInput.value = item.id || "";
  if (nameInput) nameInput.value = item.full_name || "";
  if (emailInput) emailInput.value = item.email || "";
  if (phoneInput) phoneInput.value = item.phone || "";
  if (statusInput) statusInput.value = item.status || "Active";
  if (sysRoleInput) sysRoleInput.value = item.system_role || "member";
  if (djLightInput) djLightInput.value = item.dj_traffic_light || "red";
  if (baptizedInput) baptizedInput.checked = Boolean(item.water_baptized);
  if (baptismDateInput) baptismDateInput.value = item.baptism_date || "";

  if (icareSelect) {
    const groups = normalizeIcareGroups(item);
    const joined = groups.join(", ");
    const matchedOption = Array.from(icareSelect.options).find(
      (opt) => opt.value.toLowerCase() === joined.toLowerCase()
    );
    icareSelect.value = matchedOption ? matchedOption.value : groups[0] || "";
  }

  if (modal) modal.classList.remove("hidden");
  setTimeout(() => nameInput?.focus(), 30);
}

function getFilteredDisciples() {
  const q = normText(state.searchQuery);
  if (!q) return state.disciples;

  return state.disciples.filter((d) => {
    const groups = normalizeIcareGroups(d).join(", ");
    const hay = [
      d.member_id,
      d.full_name,
      d.email,
      d.phone,
      d.address,
      d.status,
      groups
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function renderDisciplesList() {
  const listEl = document.getElementById("list-disciples");
  const badgeEl = document.getElementById("disciple-count-badge");
  if (!listEl) return;

  const filtered = getFilteredDisciples();
  const activeCount = state.disciples.filter((d) => (d.status || "Active") === "Active").length;
  const nextId = generateNextMemberId(state.disciples);

  if (badgeEl) {
    badgeEl.textContent = `${filtered.length} shown • ${activeCount} Active / ${state.disciples.length} Total • Next: ${nextId}`;
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
        No disciples found matching "${esc(state.searchQuery)}".
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered
    .map((d) => {
      const groups = normalizeIcareGroups(d);
      const status = d.status || "Active";
      const djLight = String(d.dj_traffic_light || "red").toLowerCase();
      const djLabel =
        djLight === "green" ? "🟢 Completed" : djLight === "amber" ? "🟠 In Progress" : "🔴 Not Started";

      return `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">${esc(d.member_id || "—")}</span>
              <h4 class="font-bold text-sm text-slate-900">${esc(d.full_name || "")}</h4>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${
                status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }">${esc(status)}</span>
              <span class="text-[11px] text-slate-600">${esc(djLabel)}</span>
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              ${d.email ? `<span>✉️ ${esc(d.email)}</span>` : ""}
              ${d.phone ? `<span>📱 ${esc(d.phone)}</span>` : ""}
              ${d.birth_date ? `<span>🎂 ${esc(d.birth_date)}</span>` : ""}
              ${d.address ? `<span class="truncate max-w-xs" title="${esc(d.address)}">📍 ${esc(d.address)}</span>` : ""}
            </div>

            ${
              groups.length > 0
                ? `<div class="pt-0.5 flex flex-wrap gap-1.5">
                    ${groups
                      .map(
                        (g) =>
                          `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">iCare: ${esc(g)}</span>`
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-edit-disciple-id="${esc(d.id)}"
              class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition"
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function parseCsvLine(line = "") {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeDateToIso(rawDate = "") {
  const s = String(rawDate || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const parts = s.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2].padStart(4, "0");
    return `${year}-${month}-${day}`;
  }
  return s;
}

async function importCsvTextIgnoreDuplicates(csvText = "") {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return { added: 0, skipped: 0 };

  const existingNames = new Set();
  const existingNamePhone = new Set();
  const existingNameDob = new Set();
  const existingEmails = new Set();

  state.disciples.forEach((d) => {
    const n = normText(d.full_name || d.name);
    const p = normPhone(d.phone);
    const dob = normText(d.birth_date);
    const em = normText(d.email);
    if (n) existingNames.add(n);
    if (n && p) existingNamePhone.add(`${n}__${p}`);
    if (n && dob) existingNameDob.add(`${n}__${dob}`);
    if (em) existingEmails.add(em);
  });

  let added = 0;
  let skipped = 0;
  const workingList = [...state.disciples];

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0) continue;

    // Lewati baris header jika ada
    const firstColLower = normText(cols[0]);
    if (i === 0 && (firstColLower === "name" || firstColLower === "full_name" || firstColLower === "nama")) {
      continue;
    }

    const fullName = String(cols[0] || "").trim();
    if (!fullName) continue;

    const email = String(cols[1] || "").trim().toLowerCase();
    const address = String(cols[2] || "").trim();
    const phone = String(cols[3] || "").trim();
    const birthDate = normalizeDateToIso(cols[4] || "");
    const rawGroups = String(cols[5] || "").trim();

    const icareGroups = rawGroups
      ? rawGroups.split(",").map((g) => g.trim()).filter(Boolean)
      : [];

    const nameKey = normText(fullName);
    const phoneKey = normPhone(phone);
    const dobKey = normText(birthDate);
    const emailKey = normText(email);

    const isDup =
      (nameKey && existingNames.has(nameKey)) ||
      (nameKey && phoneKey && existingNamePhone.has(`${nameKey}__${phoneKey}`)) ||
      (nameKey && dobKey && existingNameDob.has(`${nameKey}__${dobKey}`)) ||
      (emailKey && existingEmails.has(emailKey));

    if (isDup) {
      skipped++;
      continue;
    }

    const nextId = generateNextMemberId(workingList);
    const payload = {
      member_id: nextId,
      full_name: fullName,
      email,
      phone,
      address,
      birth_date: birthDate,
      icare_group: icareGroups.join(", "),
      icare_groups: icareGroups,
      ministry_interests: [],
      status: "Active",
      system_role: "member",
      dj_traffic_light: "red",
      dj_progress: {
        come: "Not Started",
        grow: "Not Started",
        serve: "Not Started",
        lead: "Not Started"
      },
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "disciples"), payload);
    const createdItem = { id: docRef.id, ...payload };
    workingList.push(createdItem);
    added++;

    if (nameKey) existingNames.add(nameKey);
    if (nameKey && phoneKey) existingNamePhone.add(`${nameKey}__${phoneKey}`);
    if (nameKey && dobKey) existingNameDob.add(`${nameKey}__${dobKey}`);
    if (emailKey) existingEmails.add(emailKey);
  }

  return { added, skipped };
}

function bindEvents() {
  if (state.eventsBound) return;
  state.eventsBound = true;

  window.openNewDiscipleModal = openNewDiscipleModal;

  const searchInput = document.getElementById("search-disciple");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value || "";
      renderDisciplesList();
    });
  }

  const listEl = document.getElementById("list-disciples");
  if (listEl) {
    listEl.addEventListener("click", (e) => {
      const editBtn = e.target.closest("button[data-edit-disciple-id]");
      if (editBtn) {
        openEditDiscipleModal(editBtn.dataset.editDiscipleId);
      }
    });
  }

  const importBtn = document.getElementById("btn-import-csv");
  const csvInput = document.getElementById("input-csv-disciples");
  if (importBtn && csvInput) {
    importBtn.addEventListener("click", () => csvInput.click());
    csvInput.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const res = await importCsvTextIgnoreDuplicates(text);
        await refreshDisciplesModule();
        alert(`CSV import finished: ${res.added} added, ${res.skipped} duplicate(s) skipped.`);
      } catch (err) {
        alert("Failed to import CSV: " + (err?.message || err));
      } finally {
        csvInput.value = "";
      }
    });
  }

  const form = document.getElementById("form-disciple");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      ensureModalIcareField();

      const existingId = document.getElementById("disciple-id")?.value.trim() || "";
      const fullName = document.getElementById("disciple-name")?.value.trim() || "";
      if (!fullName) {
        alert("Full Name is required.");
        return;
      }

      const email = document.getElementById("disciple-email")?.value.trim().toLowerCase() || "";
      const phone = document.getElementById("disciple-phone")?.value.trim() || "";
      const status = document.getElementById("disciple-status")?.value || "Active";
      const systemRole = document.getElementById("disciple-sysrole")?.value || "member";
      const djLight = document.getElementById("disciple-djlight")?.value || "red";
      const waterBaptized = Boolean(document.getElementById("disciple-baptized")?.checked);
      const baptismDate = document.getElementById("disciple-baptism-date")?.value || "";
      const rawIcare = document.getElementById("disciple-icare-group")?.value.trim() || "";
      const icareGroups = rawIcare
        ? rawIcare.split(",").map((g) => g.trim()).filter(Boolean)
        : [];

      try {
        if (existingId) {
          await updateDoc(doc(db, "disciples", existingId), {
            full_name: fullName,
            email,
            phone,
            status,
            system_role: systemRole,
            dj_traffic_light: djLight,
            water_baptized: waterBaptized,
            baptism_date: baptismDate,
            icare_group: icareGroups.join(", "),
            icare_groups: icareGroups,
            updated_at: serverTimestamp()
          });
        } else {
          const nextMemberId = generateNextMemberId(state.disciples);
          await addDoc(collection(db, "disciples"), {
            member_id: nextMemberId,
            full_name: fullName,
            email,
            phone,
            address: "",
            birth_date: "",
            icare_group: icareGroups.join(", "),
            icare_groups: icareGroups,
            ministry_interests: [],
            status,
            system_role: systemRole,
            dj_traffic_light: djLight,
            water_baptized: waterBaptized,
            baptism_date: baptismDate,
            dj_progress: {
              come: "Not Started",
              grow: "Not Started",
              serve: "Not Started",
              lead: "Not Started"
            },
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }

        document.getElementById("modal-disciple")?.classList.add("hidden");
        await refreshDisciplesModule();
      } catch (err) {
        alert("Failed to save disciple: " + (err?.message || err));
      }
    });
  }
}

export async function refreshDisciplesModule() {
  state.disciples = await fetchAllDisciples().catch(() => []);
  renderDisciplesList();
}

export async function initDisciplesModule() {
  bindEvents();
  await refreshDisciplesModule();
}
