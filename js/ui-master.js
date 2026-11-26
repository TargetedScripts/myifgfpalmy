// js/ui-master.js
import {
  getDepartments,
  saveDepartment,
  getRolesReference,
  saveRoleReference,
  deleteRoleReference,
  toggleRoleActive,
  getDisciples,
  saveDisciple,
  importDisciplesFromCSV,
  seedInitialMasterData
} from "./db-master.js";

const VOCAL_GROUP_NAMES = [
  "Worship Leader",
  "Singer 1",
  "Singer 2",
  "Singer 3"
];

let masterState = {
  departments: [],
  roles: [],
  disciples: [],
  currentUser: null
};

export async function initMasterApp(userProfile) {
  masterState.currentUser = userProfile;
  ensureRoleManagementControlsUI();
  ensureDiscipleDetailFieldsUI();
  bindMasterEvents();
  await reloadMasterData();
}

async function reloadMasterData() {
  const [depts, roles, disciples] = await Promise.all([
    getDepartments(),
    getRolesReference(),
    getDisciples()
  ]);

  masterState.departments = depts;
  masterState.roles = sortRolesByOrder(roles).map((r, i) => ({
    ...r,
    sort_order: typeof r.sort_order === "number" ? r.sort_order : Number(r.sort_order) || i + 1
  }));
  masterState.disciples = disciples;

  populateDepartmentSelects();
  renderDepartmentsTable();
  renderRolesTable();
  renderDisciplesList();
}

function sortRolesByOrder(roles) {
  return [...roles].sort((a, b) => {
    const orderA = typeof a.sort_order === "number" ? a.sort_order : Number(a.sort_order) || 999;
    const orderB = typeof b.sort_order === "number" ? b.sort_order : Number(b.sort_order) || 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.role_name || "").localeCompare(b.role_name || "");
  });
}

function getDeptLabel(deptId) {
  const found = masterState.departments.find(d => d.id === deptId);
  return found?.name || deptId || "-";
}

function isUniversalRole(role) {
  if (role?.is_universal === true) return true;
  return /cuci piring|vacuum/i.test(role?.role_name || "");
}

function populateDepartmentSelects() {
  const activeDepts = masterState.departments.filter(d => d.is_active !== false);
  const optionsHtml = activeDepts
    .map(d => `<option value="${d.id}">${d.name}</option>`)
    .join("");

  const modalSelect = document.getElementById("role-dept-select");
  if (modalSelect && optionsHtml) {
    modalSelect.innerHTML = optionsHtml;
  }

  const quickSelect = document.getElementById("quick-role-dept");
  if (quickSelect && optionsHtml) {
    const prev = quickSelect.value;
    quickSelect.innerHTML = optionsHtml;
    if (prev && Array.from(quickSelect.options).some(o => o.value === prev)) {
      quickSelect.value = prev;
    }
  }
}

function ensureRoleManagementControlsUI() {
  const panelRoles = document.getElementById("panel-roles");
  if (!panelRoles) return;

  const theadRow = panelRoles.querySelector("table thead tr");
  if (theadRow && !document.getElementById("th-role-actions")) {
    const th = document.createElement("th");
    th.id = "th-role-actions";
    th.className = "p-3 text-right";
    th.textContent = "Actions";
    theadRow.appendChild(th);
  }

  if (!document.getElementById("roles-cleanup-toolbar")) {
    const tableWrap = panelRoles.querySelector("table")?.parentElement;
    if (tableWrap) {
      const bar = document.createElement("div");
      bar.id = "roles-cleanup-toolbar";
      bar.className = "bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs";
      bar.innerHTML = `
        <div class="text-slate-700">
          <strong class="text-slate-900">Master Role Cleanup:</strong>
          Pindahkan role ke departemen mana pun lewat dropdown Department, atau hapus permanen role Disabled & duplikat.
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="btn-ensure-shared-roles"
            class="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold rounded-lg"
          >
            + Ensure Cuci Piring 1–3 & Vacuum (Usher & Facility)
          </button>
          <button
            type="button"
            id="btn-purge-disabled-and-dups"
            class="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
          >
            🗑 Delete All Disabled & Duplicate Roles
          </button>
        </div>
      `;
      panelRoles.insertBefore(bar, tableWrap);
    }
  }
}

function renderDepartmentsTable() {
  const tbody = document.getElementById("tbody-departments");
  if (!tbody) return;

  tbody.innerHTML = masterState.departments.map((d, idx) => {
    const active = d.is_active !== false;
    return `
      <tr class="border-b border-slate-100 last:border-b-0">
        <td class="p-3 font-mono text-xs text-slate-500">${Number(d.sort_order) || idx + 1}</td>
        <td class="p-3 font-semibold text-slate-900">${d.name}</td>
        <td class="p-3">
          <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${
            active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
          }">${active ? "Active" : "Inactive"}</span>
        </td>
        <td class="p-3 text-right">
          <button
            onclick="window.toggleDeptActive('${d.id}', ${active})"
            class="text-xs font-semibold px-3 py-1 rounded-lg border border-slate-300 hover:bg-slate-50"
          >${active ? "Disable" : "Enable"}</button>
        </td>
      </tr>
    `;
  }).join("");
}

function renderRolesTable() {
  const tbody = document.getElementById("tbody-roles");
  if (!tbody) return;

  const deptOptions = masterState.departments.filter(d => d.is_active !== false);

  tbody.innerHTML = masterState.roles.map((r, index) => {
    const isActive = r.is_active !== false;
    const orderNum = Number(r.sort_order) || index + 1;
    const isVocal = VOCAL_GROUP_NAMES.includes(r.role_name);
    const isUniversal = isUniversalRole(r);

    const deptSelectHtml = `
      <select
        onchange="window.changeRoleDepartment('${r.id}', this.value)"
        class="px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
      >
        ${deptOptions.map(d => `
          <option value="${d.id}" ${d.id === r.department_id ? "selected" : ""}>${d.name}</option>
        `).join("")}
      </select>
    `;

    return `
      <tr class="border-b border-slate-100 last:border-b-0 ${isVocal ? "bg-amber-50/40" : ""}">
        <td class="p-3 whitespace-nowrap">
          <div class="flex items-center gap-1">
            <button
              type="button"
              onclick="window.moveRoleRow(${index}, -1)"
              ${index === 0 ? "disabled" : ""}
              class="px-1.5 py-0.5 text-xs font-bold rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-35"
              title="Move Up"
            >↑</button>
            <button
              type="button"
              onclick="window.moveRoleRow(${index}, 1)"
              ${index === masterState.roles.length - 1 ? "disabled" : ""}
              class="px-1.5 py-0.5 text-xs font-bold rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-35"
              title="Move Down"
            >↓</button>
            <input
              type="number"
              min="1"
              step="1"
              value="${orderNum}"
              onchange="window.setRoleOrderNumber(${index}, this.value)"
              class="w-14 px-1.5 py-0.5 text-xs font-mono border border-slate-300 rounded text-center bg-white"
            />
          </div>
        </td>
        <td class="p-3 font-semibold text-slate-900">
          ${r.role_name}
          ${isVocal ? `<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">Vocal</span>` : ""}
          ${isUniversal ? `<span class="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">Shared</span>` : ""}
        </td>
        <td class="p-3 text-slate-700">${deptSelectHtml}</td>
        <td class="p-3">
          <span class="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">DJ ${r.min_dj_level || "Come"}</span>
        </td>
        <td class="p-3 text-xs">
          ${r.can_reimburse ? `<span class="font-semibold text-emerald-700">✓ Yes</span>` : `<span class="text-slate-400">—</span>`}
        </td>
        <td class="p-3 text-right">
          <button
            type="button"
            onclick="window.toggleRoleStatus('${r.id}', ${isActive})"
            class="text-xs font-bold px-2.5 py-1 rounded-full ${
              isActive
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }"
          >${isActive ? "Active" : "Disabled"}</button>
        </td>
        <td class="p-3 text-right whitespace-nowrap">
          <button
            type="button"
            onclick="window.deleteRolePermanent('${r.id}', '${(r.role_name || "").replace(/'/g, "\\'")}')"
            class="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
          >Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}

function normalizeSequentialOrders() {
  masterState.roles = masterState.roles.map((r, idx) => ({
    ...r,
    sort_order: Number(idx + 1)
  }));
}

async function persistAllRoleOrders() {
  normalizeSequentialOrders();
  await Promise.all(
    masterState.roles.map((r, idx) =>
      saveRoleReference(r.id, { sort_order: Number(idx + 1) })
    )
  );
  renderRolesTable();
}

function renderDisciplesList() {
  const container = document.getElementById("list-disciples");
  const badge = document.getElementById("disciple-count-badge");
  if (!container) return;

  const q = (document.getElementById("search-disciple")?.value || "").trim().toLowerCase();
  const filtered = masterState.disciples.filter(d => {
    if (!q) return true;
    return (
      (d.full_name || "").toLowerCase().includes(q) ||
      (d.nick_name || "").toLowerCase().includes(q) ||
      (d.email || "").toLowerCase().includes(q) ||
      (d.phone || "").toLowerCase().includes(q) ||
      (d.address || "").toLowerCase().includes(q) ||
      (d.spouse_name || "").toLowerCase().includes(q) ||
      (d.children_names || "").toLowerCase().includes(q) ||
      (d.member_id || "").toLowerCase().includes(q)
    );
  });

  if (badge) badge.textContent = `${filtered.length} disciples`;

  container.innerHTML = filtered.map(d => {
    const interests = Array.isArray(d.ministry_interests) ? d.ministry_interests : [];
    const familyInfo = [
      d.spouse_name ? `Spouse: ${d.spouse_name}` : "",
      d.children_names ? `Children: ${d.children_names}` : "",
      d.address ? `Addr: ${d.address}` : ""
    ].filter(Boolean).join(" • ");

    return `
      <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="space-y-1">
          <p class="font-bold text-sm text-slate-900">
            ${d.full_name || "Unnamed"}
            ${d.nick_name ? `<span class="text-xs font-normal text-slate-500">(${d.nick_name})</span>` : ""}
          </p>
          <p class="text-xs text-slate-500">${d.email || "No email"} • ${d.phone || "No phone"} • <span class="font-semibold">${d.status || "Active"}</span></p>
          ${familyInfo ? `<p class="text-[11px] text-slate-600">${familyInfo}</p>` : ""}
          ${interests.length > 0 ? `
            <div class="flex flex-wrap gap-1 pt-0.5">
              ${interests.map(roleName => `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-medium">${roleName}</span>`).join("")}
            </div>
          ` : ""}
        </div>
        <button
          type="button"
          onclick="window.editDiscipleModal('${d.id}')"
          class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 self-start sm:self-center shrink-0"
        >Edit</button>
      </div>
    `;
  }).join("");
}

function renderDiscipleInterestsChecklist(selectedInterests = []) {
  const box = document.getElementById("disciple-ministry-interests-box");
  if (!box) return;

  const activeRoles = masterState.roles.filter(r => r.is_active !== false);
  if (activeRoles.length === 0) {
    box.innerHTML = `<p class="text-[11px] text-slate-500 col-span-full">No active roles in roles_reference.</p>`;
    return;
  }

  const normalizedSelected = (Array.isArray(selectedInterests) ? selectedInterests : [])
    .map(s => String(s || "").trim().toLowerCase())
    .filter(Boolean);

  // Kelompokkan berdasarkan departemen sesuai urutan master
  const byDept = new Map();
  activeRoles.forEach(r => {
    const deptName = getDeptLabel(r.department_id);
    if (!byDept.has(deptName)) byDept.set(deptName, []);
    byDept.get(deptName).push(r);
  });

  box.innerHTML = Array.from(byDept.entries()).map(([deptName, deptRoles]) => {
    const itemsHtml = deptRoles.map(r => {
      const rName = (r.role_name || "").trim();
      const universal = isUniversalRole(r);
      if (universal) {
        return `
          <label class="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-600 cursor-not-allowed select-none">
            <span class="flex items-center gap-1.5 min-w-0">
              <input type="checkbox" name="disciple-interest-cb" value="${rName}" checked disabled class="rounded border-slate-300" />
              <span class="truncate">${rName}</span>
            </span>
            <span class="text-[9px] font-bold uppercase px-1 rounded bg-slate-200 text-slate-600 shrink-0">All</span>
          </label>
        `;
      }

      const isChecked = normalizedSelected.includes(rName.toLowerCase()) ? "checked" : "";
      return `
        <label class="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 hover:border-slate-400 text-[11px] text-slate-800 cursor-pointer select-none">
          <input type="checkbox" name="disciple-interest-cb" value="${rName}" ${isChecked} class="rounded border-slate-300 text-slate-900" />
          <span class="truncate" title="${rName}">${rName}</span>
        </label>
      `;
    }).join("");

    return `
      <div class="space-y-1.5">
        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${deptName}</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">${itemsHtml}</div>
      </div>
    `;
  }).join("");
}

function ensureDiscipleDetailFieldsUI() {
  const form = document.getElementById("form-disciple");
  if (!form) return;

  const modal = document.getElementById("modal-disciple");
  if (modal) {
    modal.classList.remove("overflow-hidden");
    modal.classList.add("overflow-y-auto", "p-4");

    const panel = modal.querySelector(":scope > div");
    if (panel) {
      panel.style.maxWidth = "44rem";
      panel.style.width = "100%";
      panel.style.maxHeight = "90vh";
      panel.style.overflowY = "auto";
    }
  }

  form.style.display = "block";
  form.style.width = "100%";
  form.style.maxWidth = "100%";
  form.style.height = "auto";
  form.classList.remove("grid", "grid-cols-2", "grid-cols-3", "flex", "flex-col", "h-full");

  if (!document.getElementById("disciple-detail-fields-wrapper")) {
    const wrapper = document.createElement("div");
    wrapper.id = "disciple-detail-fields-wrapper";
    wrapper.className = "space-y-3 pt-3 mt-3 border-t border-slate-200 text-xs min-w-0 w-full";
    wrapper.innerHTML = `
      <p class="font-bold text-[11px] uppercase tracking-wider text-slate-500">Personal & Contact Details</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Member ID</label>
          <input type="text" id="disciple-member-id" placeholder="e.g., M-001" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Nick Name</label>
          <input type="text" id="disciple-nickname" placeholder="Nama panggilan" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Gender</label>
          <select id="disciple-gender" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white">
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Place of Birth</label>
          <input type="text" id="disciple-pob" placeholder="Kota / tempat lahir" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Date of Birth</label>
          <input type="text" id="disciple-dob" placeholder="YYYY-MM-DD atau DD/MM/YYYY" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Status in New Zealand</label>
          <input type="text" id="disciple-nz-status" placeholder="Citizen / Resident / Visa" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 min-w-0">
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Institution / Company</label>
          <input type="text" id="disciple-institution" placeholder="Kampus / perusahaan / pekerjaan" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Home Address</label>
          <input type="text" id="disciple-address" placeholder="Alamat lengkap / kota" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
      </div>

      <p class="font-bold text-[11px] uppercase tracking-wider text-slate-500 pt-1">Family & iCare</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Marital Status</label>
          <input type="text" id="disciple-marital-status" placeholder="Single / Married / ..." class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Spouse Name</label>
          <input type="text" id="disciple-spouse-name" placeholder="Nama pasangan" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">Joined an iCare</label>
          <input type="text" id="disciple-in-icare" placeholder="Yes / No / Nama iCare" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
        </div>
      </div>

      <div class="min-w-0">
        <label class="block font-semibold text-slate-600">Children Names</label>
        <input type="text" id="disciple-children-names" placeholder="Nama anak-anak (pisahkan koma)" class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white" />
      </div>

      <p class="font-bold text-[11px] uppercase tracking-wider text-slate-500 pt-1">Ministry Interests (Linked to Master Roles)</p>
      <div id="disciple-ministry-interests-box" class="space-y-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-52 overflow-y-auto"></div>

      <p class="font-bold text-[11px] uppercase tracking-wider text-slate-500 pt-1">DJ Progress & Pastoral Notes</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 min-w-0">
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">DJ 1: Come</label>
          <input type="text" id="disciple-dj-come" placeholder="Not Started / In Progress / Completed" class="w-full min-w-0 px-2 py-1 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">DJ 2: Grow</label>
          <input type="text" id="disciple-dj-grow" placeholder="Not Started / In Progress / Completed" class="w-full min-w-0 px-2 py-1 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">DJ 3: Serve</label>
          <input type="text" id="disciple-dj-serve" placeholder="Not Started / In Progress / Completed" class="w-full min-w-0 px-2 py-1 border rounded-lg mt-1 bg-white" />
        </div>
        <div class="min-w-0">
          <label class="block font-semibold text-slate-600">DJ 4: Lead</label>
          <input type="text" id="disciple-dj-lead" placeholder="Not Started / In Progress / Completed" class="w-full min-w-0 px-2 py-1 border rounded-lg mt-1 bg-white" />
        </div>
      </div>

      <div class="min-w-0">
        <label class="block font-semibold text-slate-600">How Can We Help / Pastoral Notes</label>
        <textarea id="disciple-pastoral-notes" rows="2" placeholder="Catatan pastoral, pokok doa, atau bantuan yang dibutuhkan..." class="w-full min-w-0 px-2.5 py-1.5 border rounded-lg mt-1 bg-white"></textarea>
      </div>
    `;

    form.appendChild(wrapper);
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    let footer = document.getElementById("disciple-modal-footer-actions");
    if (!footer) {
      footer = document.createElement("div");
      footer.id = "disciple-modal-footer-actions";
      footer.className = "flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-200 w-full";
      form.appendChild(footer);
    }

    const cancelBtn = Array.from(form.querySelectorAll("button")).find(
      b => b !== submitBtn && /cancel/i.test(b.textContent || "")
    );
    if (cancelBtn && !footer.contains(cancelBtn)) {
      cancelBtn.className = "px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold whitespace-nowrap shrink-0";
      footer.appendChild(cancelBtn);
    }

    if (!footer.contains(submitBtn)) {
      submitBtn.className = "px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap shrink-0";
      footer.appendChild(submitBtn);
    }

    submitBtn.style.height = "auto";
    submitBtn.style.maxHeight = "none";
    submitBtn.style.writingMode = "horizontal-tb";
  }
}

function setFieldVal(id, value = "") {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function getFieldVal(id) {
  return (document.getElementById(id)?.value || "").trim();
}

function bindMasterEvents() {
  document.getElementById("btn-seed-master")?.addEventListener("click", async () => {
    await seedInitialMasterData();
    await reloadMasterData();
    alert("Master departments & roles seeded!");
  });

  document.getElementById("btn-ensure-shared-roles")?.addEventListener("click", async () => {
    const targetDeptId = masterState.departments.some(d => d.id === "usher_facility")
      ? "usher_facility"
      : (masterState.departments[0]?.id || "usher_facility");
    const targetDeptName = getDeptLabel(targetDeptId);

    const sharedItems = [
      "Cuci Piring 1",
      "Cuci Piring 2",
      "Cuci Piring 3",
      "Vacuum"
    ];

    let maxOrder = masterState.roles.reduce(
      (max, r) => Math.max(max, Number(r.sort_order) || 0),
      0
    );

    for (const label of sharedItems) {
      const exists = masterState.roles.some(
        r => (r.role_name || "").trim().toLowerCase() === label.toLowerCase()
      );
      if (!exists) {
        maxOrder += 1;
        await saveRoleReference(null, {
          role_name: label,
          department_id: targetDeptId,
          dept_name: targetDeptName,
          min_dj_level: "Come",
          can_reimburse: false,
          is_universal: true,
          sort_order: maxOrder,
          is_active: true
        });
      }
    }

    await reloadMasterData();
    alert("Cuci Piring 1–3 & Vacuum siap di bawah Usher & Facility.");
  });

  document.getElementById("btn-purge-disabled-and-dups")?.addEventListener("click", async () => {
    const seenNames = new Set();
    const toDelete = [];

    const orderedForDedup = [...masterState.roles].sort((a, b) => {
      const actA = a.is_active !== false ? 0 : 1;
      const actB = b.is_active !== false ? 0 : 1;
      if (actA !== actB) return actA - actB;
      return (Number(a.sort_order) || 999) - (Number(b.sort_order) || 999);
    });

    for (const r of orderedForDedup) {
      const normName = (r.role_name || "").trim().toLowerCase();
      const isDisabled = r.is_active === false;
      const isDuplicate = normName && seenNames.has(normName);

      if (isDisabled || isDuplicate) {
        toDelete.push(r);
      } else if (normName) {
        seenNames.add(normName);
      }
    }

    if (toDelete.length === 0) {
      alert("Tidak ada role Disabled atau duplikat yang perlu dihapus.");
      return;
    }

    const previewNames = toDelete.map(x => `• ${x.role_name} (${x.is_active === false ? "Disabled" : "Duplicate"})`).join("\n");
    if (!confirm(`Hapus PERMANEN ${toDelete.length} role berikut dari database?\n\n${previewNames}`)) {
      return;
    }

    for (const item of toDelete) {
      await deleteRoleReference(item.id);
    }

    await reloadMasterData();
    alert(`${toDelete.length} role Disabled & duplikat telah dihapus permanen.`);
  });

  document.getElementById("form-quick-role")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const roleName = document.getElementById("quick-role-name").value.trim();
    const deptId = document.getElementById("quick-role-dept").value;
    const djLevel = document.getElementById("quick-role-dj").value;
    const canReimburse = document.getElementById("quick-role-reimburse").checked;
    if (!roleName) return;

    const maxOrder = masterState.roles.reduce(
      (max, r) => Math.max(max, Number(r.sort_order) || 0),
      0
    );

    await saveRoleReference(null, {
      role_name: roleName,
      department_id: deptId,
      dept_name: getDeptLabel(deptId),
      min_dj_level: djLevel,
      can_reimburse: canReimburse,
      is_universal: /cuci piring|vacuum/i.test(roleName),
      sort_order: Number(maxOrder + 1),
      is_active: true
    });

    e.target.reset();
    await reloadMasterData();
  });

  document.getElementById("form-role")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const roleName = document.getElementById("role-name").value.trim();
    const deptId = document.getElementById("role-dept-select").value;
    const djLevel = document.getElementById("role-dj-level").value;
    const canReimburse = document.getElementById("role-reimburse").checked;
    if (!roleName) return;

    const maxOrder = masterState.roles.reduce(
      (max, r) => Math.max(max, Number(r.sort_order) || 0),
      0
    );

    await saveRoleReference(null, {
      role_name: roleName,
      department_id: deptId,
      dept_name: getDeptLabel(deptId),
      min_dj_level: djLevel,
      can_reimburse: canReimburse,
      is_universal: /cuci piring|vacuum/i.test(roleName),
      sort_order: Number(maxOrder + 1),
      is_active: true
    });

    e.target.reset();
    document.getElementById("modal-role").classList.add("hidden");
    await reloadMasterData();
  });

  document.getElementById("btn-group-vocal-order")?.addEventListener("click", () => {
    const vocalRows = [];
    const otherRows = [];

    masterState.roles.forEach(r => {
      if (VOCAL_GROUP_NAMES.includes(r.role_name)) {
        vocalRows.push(r);
      } else {
        otherRows.push(r);
      }
    });

    vocalRows.sort((a, b) => {
      const ia = VOCAL_GROUP_NAMES.indexOf(a.role_name);
      const ib = VOCAL_GROUP_NAMES.indexOf(b.role_name);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    const wlIdx = otherRows.findIndex(r => r.role_name === "Worship Leader");
    const insertAt = wlIdx >= 0 ? wlIdx : 0;
    const merged = [
      ...otherRows.slice(0, insertAt),
      ...vocalRows,
      ...otherRows.slice(insertAt)
    ];

    masterState.roles = merged.map((r, idx) => ({
      ...r,
      sort_order: Number(idx + 1)
    }));
    renderRolesTable();
  });

  document.getElementById("btn-save-role-order")?.addEventListener("click", async () => {
    await persistAllRoleOrders();
    alert("Role order saved (Number sort_order updated in Firestore).");
  });

  document.getElementById("search-disciple")?.addEventListener("input", renderDisciplesList);

  document.getElementById("btn-import-csv")?.addEventListener("click", () => {
    document.getElementById("input-csv-disciples")?.click();
  });

  document.getElementById("input-csv-disciples")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await importDisciplesFromCSV(text);
    e.target.value = "";
    await reloadMasterData();
    alert(`CSV imported: ${res.createdCount} created, ${res.updatedCount} updated.`);
  });

  document.getElementById("form-disciple")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    ensureDiscipleDetailFieldsUI();
    const id = getFieldVal("disciple-id") || null;
    const existing = id ? masterState.disciples.find(x => x.id === id) : null;

    const selectedInterests = Array.from(
      document.querySelectorAll('input[name="disciple-interest-cb"]:checked')
    ).map(cb => cb.value.trim()).filter(Boolean);

    await saveDisciple(id, {
      member_id: getFieldVal("disciple-member-id"),
      full_name: getFieldVal("disciple-name"),
      nick_name: getFieldVal("disciple-nickname"),
      gender: getFieldVal("disciple-gender"),
      place_of_birth: getFieldVal("disciple-pob"),
      date_of_birth: getFieldVal("disciple-dob"),
      nz_status: getFieldVal("disciple-nz-status"),
      institution: getFieldVal("disciple-institution"),
      email: getFieldVal("disciple-email"),
      phone: getFieldVal("disciple-phone"),
      address: getFieldVal("disciple-address"),
      marital_status: getFieldVal("disciple-marital-status"),
      spouse_name: getFieldVal("disciple-spouse-name"),
      children_names: getFieldVal("disciple-children-names"),
      in_icare: getFieldVal("disciple-in-icare"),
      ministry_interests: selectedInterests,
      pastoral_notes: getFieldVal("disciple-pastoral-notes"),
      status: getFieldVal("disciple-status") || "Active",
      system_role: getFieldVal("disciple-sysrole") || "member",
      dj_traffic_light: getFieldVal("disciple-djlight") || "red",
      dj_progress: {
        come: getFieldVal("disciple-dj-come") || existing?.dj_progress?.come || "Not Started",
        grow: getFieldVal("disciple-dj-grow") || existing?.dj_progress?.grow || "Not Started",
        serve: getFieldVal("disciple-dj-serve") || existing?.dj_progress?.serve || "Not Started",
        lead: getFieldVal("disciple-dj-lead") || existing?.dj_progress?.lead || "Not Started"
      },
      baptism_info: {
        is_baptized: Boolean(document.getElementById("disciple-baptized")?.checked),
        baptism_date: getFieldVal("disciple-baptism-date")
      }
    });
    document.getElementById("modal-disciple").classList.add("hidden");
    await reloadMasterData();
  });
}

window.changeRoleDepartment = async (roleId, newDeptId) => {
  if (!roleId || !newDeptId) return;
  await saveRoleReference(roleId, {
    department_id: newDeptId,
    dept_name: getDeptLabel(newDeptId)
  });
  await reloadMasterData();
};

window.deleteRolePermanent = async (roleId, roleName) => {
  if (!roleId) return;
  if (!confirm(`Hapus PERMANEN role "${roleName}" dari roles_reference?`)) return;
  await deleteRoleReference(roleId);
  await reloadMasterData();
};

window.moveRoleRow = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= masterState.roles.length) return;
  const copy = [...masterState.roles];
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, moved);
  masterState.roles = copy.map((r, idx) => ({
    ...r,
    sort_order: Number(idx + 1)
  }));
  renderRolesTable();
};

window.setRoleOrderNumber = (index, rawVal) => {
  const num = Math.max(1, parseInt(rawVal, 10) || 1);
  const copy = [...masterState.roles];
  const [moved] = copy.splice(index, 1);
  moved.sort_order = Number(num);
  copy.splice(index, 0, moved);
  copy.sort((a, b) => (Number(a.sort_order) || 999) - (Number(b.sort_order) || 999));
  masterState.roles = copy.map((r, idx) => ({
    ...r,
    sort_order: Number(idx + 1)
  }));
  renderRolesTable();
};

window.toggleRoleStatus = async (id, currentActive) => {
  await toggleRoleActive(id, currentActive);
  await reloadMasterData();
};

window.toggleDeptActive = async (id, currentActive) => {
  await saveDepartment(id, { is_active: !currentActive });
  await reloadMasterData();
};

window.openNewDiscipleModal = () => {
  ensureDiscipleDetailFieldsUI();
  document.getElementById("modal-disciple-title").textContent = "Add New Disciple";
  document.getElementById("form-disciple").reset();
  setFieldVal("disciple-id", "");
  setFieldVal("disciple-dj-come", "Not Started");
  setFieldVal("disciple-dj-grow", "Not Started");
  setFieldVal("disciple-dj-serve", "Not Started");
  setFieldVal("disciple-dj-lead", "Not Started");
  renderDiscipleInterestsChecklist([]);
  document.getElementById("modal-disciple").classList.remove("hidden");
};

window.editDiscipleModal = (id) => {
  const d = masterState.disciples.find(x => x.id === id);
  if (!d) return;
  ensureDiscipleDetailFieldsUI();

  document.getElementById("modal-disciple-title").textContent = "Edit Disciple";
  setFieldVal("disciple-id", d.id);
  setFieldVal("disciple-name", d.full_name || "");
  setFieldVal("disciple-email", d.email || "");
  setFieldVal("disciple-phone", d.phone || "");
  setFieldVal("disciple-status", d.status || "Active");
  setFieldVal("disciple-sysrole", d.system_role || "member");
  setFieldVal("disciple-djlight", d.dj_traffic_light || "red");

  const baptEl = document.getElementById("disciple-baptized");
  if (baptEl) baptEl.checked = Boolean(d.baptism_info?.is_baptized);
  setFieldVal("disciple-baptism-date", d.baptism_info?.baptism_date || "");

  setFieldVal("disciple-member-id", d.member_id || "");
  setFieldVal("disciple-nickname", d.nick_name || "");
  setFieldVal("disciple-gender", d.gender || "");
  setFieldVal("disciple-pob", d.place_of_birth || "");
  setFieldVal("disciple-dob", d.date_of_birth || "");
  setFieldVal("disciple-nz-status", d.nz_status || "");
  setFieldVal("disciple-institution", d.institution || "");
  setFieldVal("disciple-address", d.address || "");
  setFieldVal("disciple-marital-status", d.marital_status || "");
  setFieldVal("disciple-spouse-name", d.spouse_name || "");
  setFieldVal("disciple-children-names", d.children_names || "");
  setFieldVal("disciple-in-icare", d.in_icare || "");
  renderDiscipleInterestsChecklist(d.ministry_interests || []);
  setFieldVal("disciple-pastoral-notes", d.pastoral_notes || "");

  setFieldVal("disciple-dj-come", d.dj_progress?.come || "Not Started");
  setFieldVal("disciple-dj-grow", d.dj_progress?.grow || "Not Started");
  setFieldVal("disciple-dj-serve", d.dj_progress?.serve || "Not Started");
  setFieldVal("disciple-dj-lead", d.dj_progress?.lead || "Not Started");

  document.getElementById("modal-disciple").classList.remove("hidden");
};
