// js/ui-disciples.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getDisciples, getDepartments, getRolesReference } from "./db-master.js";

const ICARE_OPTIONS = ["Darah Muda", "Keluarga Muda", "Jiwa Muda"];

const disciplesState = {
  items: [],
  selectableRoles: [],
  searchQuery: "",
  icareFilter: "ALL",
  statusFilter: "ALL",
  formOpen: false,
  editingId: null,
  eventsBound: false
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isLeadershipRoleName(roleName = "") {
  const n = String(roleName || "").trim().toLowerCase();
  return n.startsWith("head of dept") || n.startsWith("lead of dept");
}

function isUniversalSharedTask(role = {}) {
  if (role?.is_universal === true) return true;
  const n = String(role?.role_name || role?.name || "").toLowerCase();
  return n.includes("cuci piring") || n.includes("vacuum");
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

function normalizeIcareGroups(item = {}) {
  if (Array.isArray(item.icare_groups) && item.icare_groups.length > 0) {
    return item.icare_groups.map(g => String(g || "").trim()).filter(Boolean);
  }
  const raw = String(item.icare_group || item.age_group || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map(g => g.trim())
    .filter(Boolean);
}

async function fetchSelectableMinistryRoles() {
  try {
    const [depts, roles] = await Promise.all([
      getDepartments().catch(() => []),
      getRolesReference().catch(() => [])
    ]);

    const deptMap = new Map();
    depts.forEach((d, idx) => {
      deptMap.set(d.id, {
        name: d.name || d.id,
        sort_order: Number(d.sort_order) || idx + 1
      });
    });

    return roles
      .filter(r => r.active !== false && r.is_active !== false)
      .map((r, idx) => {
        const label = String(r.role_name || r.name || "").trim();
        const deptInfo = deptMap.get(r.department_id);
        return {
          ...r,
          _label: label,
          _deptName: deptInfo?.name || r.dept_name || "General Ministry",
          _deptOrder: deptInfo?.sort_order ?? 999,
          _roleOrder: Number(r.sort_order) || idx + 1,
          _isUniversal: isUniversalSharedTask(r)
        };
      })
      .filter(r => Boolean(r._label) && !isLeadershipRoleName(r._label))
      .sort((a, b) => {
        if (a._isUniversal !== b._isUniversal) return a._isUniversal ? 1 : -1;
        if (a._deptOrder !== b._deptOrder) return a._deptOrder - b._deptOrder;
        if (a._roleOrder !== b._roleOrder) return a._roleOrder - b._roleOrder;
        return a._label.localeCompare(b._label);
      });
  } catch (err) {
    console.warn("fetchSelectableMinistryRoles fallback:", err);
    return [];
  }
}

export async function createDiscipleRecord(formValues, existingDisciples = []) {
  const nextMemberId = generateNextMemberId(existingDisciples);
  const icareGroups = Array.isArray(formValues.icare_groups)
    ? formValues.icare_groups.map(s => String(s || "").trim()).filter(Boolean)
    : [];

  const payload = {
    member_id: nextMemberId,
    full_name: String(formValues.full_name || "").trim(),
    email: String(formValues.email || "").trim().toLowerCase(),
    phone: String(formValues.phone || "").trim(),
    address: String(formValues.address || "").trim(),
    birth_date: String(formValues.birth_date || "").trim(),
    icare_group: icareGroups.join(", "),
    icare_groups: icareGroups,
    ministry_interests: Array.isArray(formValues.ministry_interests)
      ? formValues.ministry_interests
      : [],
    status: formValues.status || "Active",
    dj_traffic_light: formValues.dj_traffic_light || "red",
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
  return { id: docRef.id, ...payload };
}

export async function updateDiscipleRecord(discipleId, formValues) {
  if (!discipleId) throw new Error("Missing disciple ID.");

  const icareGroups = Array.isArray(formValues.icare_groups)
    ? formValues.icare_groups.map(s => String(s || "").trim()).filter(Boolean)
    : [];

  const payload = {
    full_name: String(formValues.full_name || "").trim(),
    email: String(formValues.email || "").trim().toLowerCase(),
    phone: String(formValues.phone || "").trim(),
    address: String(formValues.address || "").trim(),
    birth_date: String(formValues.birth_date || "").trim(),
    icare_group: icareGroups.join(", "),
    icare_groups: icareGroups,
    ministry_interests: Array.isArray(formValues.ministry_interests)
      ? formValues.ministry_interests
      : [],
    status: formValues.status || "Active",
    updated_at: serverTimestamp()
  };

  await updateDoc(doc(db, "disciples", discipleId), payload);
}

function getFilteredDisciples() {
  const q = String(disciplesState.searchQuery || "").trim().toLowerCase();
  const icare = disciplesState.icareFilter;
  const status = disciplesState.statusFilter;

  return disciplesState.items.filter((d) => {
    const dStatus = d.status || "Active";
    if (status !== "ALL" && dStatus !== status) return false;

    const groups = normalizeIcareGroups(d);
    if (icare !== "ALL" && !groups.includes(icare)) return false;

    if (!q) return true;
    const hay = [
      d.member_id,
      d.full_name,
      d.email,
      d.phone,
      d.address,
      groups.join(", "),
      Array.isArray(d.ministry_interests) ? d.ministry_interests.join(", ") : ""
    ]
      .join(" ")
      .toLowerCase();

    return hay.includes(q);
  });
}

function renderDiscipleFormHtml() {
  if (!disciplesState.formOpen) return "";

  const isEditing = Boolean(disciplesState.editingId);
  const existingDoc = isEditing
    ? disciplesState.items.find(d => d.id === disciplesState.editingId) || null
    : null;

  const displayMemberId = isEditing
    ? (existingDoc?.member_id || "—")
    : generateNextMemberId(disciplesState.items);

  const selectedIcare = new Set(normalizeIcareGroups(existingDoc || {}));
  const selectedInterests = new Set(
    (Array.isArray(existingDoc?.ministry_interests) ? existingDoc.ministry_interests : [])
      .map(s => String(s || "").trim().toLowerCase())
  );

  const icareChecksHtml = ICARE_OPTIONS.map((grp) => `
    <label class="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-300 cursor-pointer select-none text-xs font-medium text-slate-800">
      <input
        type="checkbox"
        name="disc-icare-group"
        value="${esc(grp)}"
        ${selectedIcare.has(grp) ? "checked" : ""}
        class="rounded border-slate-300 text-slate-900"
      />
      <span>${esc(grp)}</span>
    </label>
  `).join("");

  const interestsHtml = disciplesState.selectableRoles.length > 0
    ? disciplesState.selectableRoles.map((r) => {
        const label = r._label;
        const checked = selectedInterests.has(label.toLowerCase()) ? "checked" : "";
        return `
          <label class="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200 cursor-pointer select-none text-xs">
            <input
              type="checkbox"
              name="disc-interest-role"
              value="${esc(label)}"
              ${checked}
              class="rounded border-slate-300 text-slate-900"
            />
            <span class="truncate text-slate-800" title="${esc(label)}">${esc(label)}</span>
          </label>
        `;
      }).join("")
    : `<p class="text-[11px] text-slate-500 col-span-full">No ministry roles configured yet.</p>`;

  return `
    <form id="form-disciple-crud" class="bg-amber-50/70 p-4 rounded-2xl border border-amber-300 space-y-4 text-xs">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400">
            ${isEditing ? "✏️ Edit Disciple" : "➕ New Disciple (Auto Member ID)"}
          </span>
          <h4 class="font-bold text-sm text-slate-900 mt-1">
            ${isEditing ? `Update ${esc(existingDoc?.full_name || "Disciple")}` : "Add New Disciple to Database"}
          </h4>
        </div>
        <div class="text-right">
          <span class="text-[10px] font-bold uppercase text-slate-500 block">Member ID</span>
          <span id="disc-preview-member-id" class="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-slate-900">
            ${esc(displayMemberId)}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-[10px] font-bold text-slate-600 uppercase">Full Name *</label>
          <input
            type="text"
            id="disc-full-name"
            required
            value="${esc(existingDoc?.full_name || "")}"
            placeholder="e.g. Budi Santoso"
            class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg mt-1 font-semibold"
          />
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-600 uppercase">Email</label>
          <input
            type="email"
            id="disc-email"
            value="${esc(existingDoc?.email || "")}"
            placeholder="name@example.com"
            class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg mt-1"
          />
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-600 uppercase">Phone</label>
          <input
            type="text"
            id="disc-phone"
            value="${esc(existingDoc?.phone || "")}"
            placeholder="e.g. 0221234567"
            class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg mt-1"
          />
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-600 uppercase">Birth Date</label>
          <input
            type="date"
            id="disc-birth-date"
            value="${esc(existingDoc?.birth_date || "")}"
            class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg mt-1"
          />
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-600 uppercase">Status</label>
          <select id="disc-status" class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg mt-1 font-semibold">
            <option value="Active" ${(existingDoc?.status || "Active") === "Active" ? "selected" : ""}>Active</option>
            <option value="Inactive" ${existingDoc?.status === "Inactive" ? "selected" : ""}>Inactive</option>
          </select>
        </div>

        <div>
          <label class="text-[10px] font-bold text-slate-600 uppercase">Address</label>
          <input
            type="text"
            id="disc-address"
            value="${esc(existingDoc?.address || "")}"
            placeholder="Street, Suburb, Palmerston North"
            class="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg mt-1"
          />
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-bold text-slate-600 uppercase block">iCare Group</label>
        <div class="flex flex-wrap gap-2">${icareChecksHtml}</div>
      </div>

      <div class="space-y-1.5">
        <label class="text-[10px] font-bold text-slate-600 uppercase block">Ministry Interests / Roles</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50/80 rounded-xl border border-slate-200">
          ${interestsHtml}
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-1">
        <button type="button" id="btn-cancel-disciple-form" class="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg">
          Cancel
        </button>
        <button type="submit" id="btn-save-disciple-crud" class="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-lg">
          ${isEditing ? "💾 Save Changes" : `➕ Create (${esc(displayMemberId)})`}
        </button>
      </div>
    </form>
  `;
}

export function renderDisciplesPanel() {
  const container = document.getElementById("panel-disciples");
  if (!container) return;

  const filtered = getFilteredDisciples().sort((a, b) =>
    String(a.full_name || "").localeCompare(String(b.full_name || ""))
  );
  const nextIdPreview = generateNextMemberId(disciplesState.items);
  const activeCount = disciplesState.items.filter(d => (d.status || "Active") === "Active").length;

  const rowsHtml = filtered.length > 0
    ? filtered.map((d) => {
        const groups = normalizeIcareGroups(d);
        const status = d.status || "Active";
        const djLight = String(d.dj_traffic_light || "red").toLowerCase();
        const djBadge =
          djLight === "green"
            ? "bg-emerald-100 text-emerald-800"
            : djLight === "amber"
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800";

        return `
          <tr class="border-b border-slate-100 hover:bg-slate-50/80 text-xs">
            <td class="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">${esc(d.member_id || "—")}</td>
            <td class="py-2.5 px-3">
              <p class="font-bold text-slate-900">${esc(d.full_name || "")}</p>
              <p class="text-[11px] text-slate-500">${esc(d.email || "—")}</p>
            </td>
            <td class="py-2.5 px-3 text-slate-700 whitespace-nowrap">${esc(d.phone || "—")}</td>
            <td class="py-2.5 px-3">
              ${groups.length > 0
                ? groups.map(g => `<span class="inline-block px-2 py-0.5 mr-1 mb-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-200">${esc(g)}</span>`).join("")
                : `<span class="text-slate-400">—</span>`}
            </td>
            <td class="py-2.5 px-3 text-slate-600 max-w-[220px] truncate" title="${esc(d.address || "")}">${esc(d.address || "—")}</td>
            <td class="py-2.5 px-3 whitespace-nowrap">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
              }">${esc(status)}</span>
              <span class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${djBadge}">DJ: ${esc(djLight.toUpperCase())}</span>
            </td>
            <td class="py-2.5 px-3 text-right whitespace-nowrap">
              <button
                type="button"
                data-edit-disciple="${esc(d.id)}"
                class="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-300"
              >
                ✏️ Edit
              </button>
            </td>
          </tr>
        `;
      }).join("")
    : `
      <tr>
        <td colspan="7" class="py-6 px-3 text-center text-xs text-slate-500">
          No disciples match the current filter.
        </td>
      </tr>
    `;

  container.innerHTML = `
    <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 class="font-bold text-base text-slate-900">👥 Disciples (360°)</h3>
          <p class="text-xs text-slate-500">
            Total: <strong>${disciplesState.items.length}</strong> • Active: <strong>${activeCount}</strong> • Next ID: <span class="font-mono font-bold text-slate-800">${esc(nextIdPreview)}</span>
          </p>
        </div>

        <button
          type="button"
          id="btn-open-add-disciple"
          class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs shrink-0"
        >
          + Add Disciple (${esc(nextIdPreview)})
        </button>
      </div>

      ${renderDiscipleFormHtml()}

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <input
          type="search"
          id="disc-search-input"
          value="${esc(disciplesState.searchQuery)}"
          placeholder="Search name, ID, email, phone, address..."
          class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
        />

        <select id="disc-icare-filter" class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold">
          <option value="ALL" ${disciplesState.icareFilter === "ALL" ? "selected" : ""}>All iCare Groups</option>
          ${ICARE_OPTIONS.map(g => `<option value="${esc(g)}" ${disciplesState.icareFilter === g ? "selected" : ""}>${esc(g)}</option>`).join("")}
        </select>

        <select id="disc-status-filter" class="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold">
          <option value="ALL" ${disciplesState.statusFilter === "ALL" ? "selected" : ""}>All Statuses</option>
          <option value="Active" ${disciplesState.statusFilter === "Active" ? "selected" : ""}>Active</option>
          <option value="Inactive" ${disciplesState.statusFilter === "Inactive" ? "selected" : ""}>Inactive</option>
        </select>
      </div>

      <div class="overflow-x-auto border border-slate-200 rounded-xl">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
            <tr>
              <th class="py-2.5 px-3">ID</th>
              <th class="py-2.5 px-3">Name & Email</th>
              <th class="py-2.5 px-3">Phone</th>
              <th class="py-2.5 px-3">iCare Group</th>
              <th class="py-2.5 px-3">Address</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}

function bindDisciplesEvents() {
  if (disciplesState.eventsBound) return;
  disciplesState.eventsBound = true;

  const container = document.getElementById("panel-disciples");
  if (!container) return;

  container.addEventListener("input", (e) => {
    if (e.target.id === "disc-search-input") {
      disciplesState.searchQuery = e.target.value || "";
      renderDisciplesPanel();
      const input = document.getElementById("disc-search-input");
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  });

  container.addEventListener("change", (e) => {
    if (e.target.id === "disc-icare-filter") {
      disciplesState.icareFilter = e.target.value || "ALL";
      renderDisciplesPanel();
    } else if (e.target.id === "disc-status-filter") {
      disciplesState.statusFilter = e.target.value || "ALL";
      renderDisciplesPanel();
    }
  });

  container.addEventListener("click", (e) => {
    const addBtn = e.target.closest("#btn-open-add-disciple");
    if (addBtn) {
      disciplesState.formOpen = true;
      disciplesState.editingId = null;
      renderDisciplesPanel();
      document.getElementById("disc-full-name")?.focus();
      return;
    }

    const editBtn = e.target.closest("button[data-edit-disciple]");
    if (editBtn) {
      const targetId = editBtn.dataset.editDisciple;
      if (!targetId) return;
      disciplesState.formOpen = true;
      disciplesState.editingId = targetId;
      renderDisciplesPanel();
      document.getElementById("disc-full-name")?.focus();
      return;
    }

    const cancelBtn = e.target.closest("#btn-cancel-disciple-form");
    if (cancelBtn) {
      disciplesState.formOpen = false;
      disciplesState.editingId = null;
      renderDisciplesPanel();
    }
  });

  container.addEventListener("submit", async (e) => {
    if (e.target.id !== "form-disciple-crud") return;
    e.preventDefault();

    const fullName = document.getElementById("disc-full-name")?.value.trim() || "";
    if (!fullName) {
      alert("Full Name is required.");
      return;
    }

    const icareGroups = Array.from(
      document.querySelectorAll('input[name="disc-icare-group"]:checked')
    ).map(cb => cb.value.trim()).filter(Boolean);

    const ministryInterests = Array.from(
      document.querySelectorAll('input[name="disc-interest-role"]:checked')
    ).map(cb => cb.value.trim()).filter(Boolean);

    const formValues = {
      full_name: fullName,
      email: document.getElementById("disc-email")?.value.trim() || "",
      phone: document.getElementById("disc-phone")?.value.trim() || "",
      address: document.getElementById("disc-address")?.value.trim() || "",
      birth_date: document.getElementById("disc-birth-date")?.value || "",
      status: document.getElementById("disc-status")?.value || "Active",
      icare_groups: icareGroups,
      ministry_interests: ministryInterests
    };

    const submitBtn = document.getElementById("btn-save-disciple-crud");
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (disciplesState.editingId) {
        await updateDiscipleRecord(disciplesState.editingId, formValues);
      } else {
        await createDiscipleRecord(formValues, disciplesState.items);
      }

      disciplesState.formOpen = false;
      disciplesState.editingId = null;
      await refreshDisciplesTab();
    } catch (err) {
      alert("Failed to save disciple record: " + (err?.message || err));
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

export async function refreshDisciplesTab() {
  const [items, selectableRoles] = await Promise.all([
    getDisciples().catch(() => []),
    fetchSelectableMinistryRoles()
  ]);
  disciplesState.items = items;
  disciplesState.selectableRoles = selectableRoles;
  renderDisciplesPanel();
}

export async function initDisciplesTab() {
  bindDisciplesEvents();
  await refreshDisciplesTab();
}
