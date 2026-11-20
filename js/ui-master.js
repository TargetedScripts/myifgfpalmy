// js/ui-master.js
import {
  getDepartments,
  saveDepartment,
  getRolesReference,
  saveRoleReference,
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

  tbody.innerHTML = masterState.roles.map((r, index) => {
    const isActive = r.is_active !== false;
    const orderNum = Number(r.sort_order) || index + 1;
    const isVocal = VOCAL_GROUP_NAMES.includes(r.role_name);

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
        </td>
        <td class="p-3 text-slate-700">${getDeptLabel(r.department_id)}</td>
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
      (d.email || "").toLowerCase().includes(q) ||
      (d.member_id || "").toLowerCase().includes(q)
    );
  });

  if (badge) badge.textContent = `${filtered.length} disciples`;

  container.innerHTML = filtered.map(d => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <p class="font-bold text-sm text-slate-900">${d.full_name || "Unnamed"}</p>
        <p class="text-xs text-slate-500">${d.email || "No email"} • ${d.phone || "No phone"} • <span class="font-semibold">${d.status || "Active"}</span></p>
      </div>
      <button
        type="button"
        onclick="window.editDiscipleModal('${d.id}')"
        class="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 self-start sm:self-center"
      >Edit</button>
    </div>
  `).join("");
}

function bindMasterEvents() {
  document.getElementById("btn-seed-master")?.addEventListener("click", async () => {
    await seedInitialMasterData();
    await reloadMasterData();
    alert("Master departments & roles seeded!");
  });

  // Quick Add Role inline form
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
      min_dj_level: djLevel,
      can_reimburse: canReimburse,
      sort_order: Number(maxOrder + 1),
      is_active: true
    });

    e.target.reset();
    await reloadMasterData();
  });

  // Add Role modal form
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
      min_dj_level: djLevel,
      can_reimburse: canReimburse,
      sort_order: Number(maxOrder + 1),
      is_active: true
    });

    e.target.reset();
    document.getElementById("modal-role").classList.add("hidden");
    await reloadMasterData();
  });

  // Group Worship Leader + Singer 1-3 together in sequence
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

  // Save Order button -> persists numeric sort_order to Firestore
  document.getElementById("btn-save-role-order")?.addEventListener("click", async () => {
    await persistAllRoleOrders();
    alert("Role order saved (Number sort_order updated in Firestore).");
  });

  // Disciples search & CSV import
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
    const id = document.getElementById("disciple-id").value || null;
    await saveDisciple(id, {
      full_name: document.getElementById("disciple-name").value.trim(),
      email: document.getElementById("disciple-email").value.trim(),
      phone: document.getElementById("disciple-phone").value.trim(),
      status: document.getElementById("disciple-status").value,
      system_role: document.getElementById("disciple-sysrole").value,
      dj_traffic_light: document.getElementById("disciple-djlight").value,
      baptism_info: {
        is_baptized: document.getElementById("disciple-baptized").checked,
        baptism_date: document.getElementById("disciple-baptism-date").value || ""
      }
    });
    document.getElementById("modal-disciple").classList.add("hidden");
    await reloadMasterData();
  });
}

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
  document.getElementById("modal-disciple-title").textContent = "Add New Disciple";
  document.getElementById("form-disciple").reset();
  document.getElementById("disciple-id").value = "";
  document.getElementById("modal-disciple").classList.remove("hidden");
};

window.editDiscipleModal = (id) => {
  const d = masterState.disciples.find(x => x.id === id);
  if (!d) return;
  document.getElementById("modal-disciple-title").textContent = "Edit Disciple";
  document.getElementById("disciple-id").value = d.id;
  document.getElementById("disciple-name").value = d.full_name || "";
  document.getElementById("disciple-email").value = d.email || "";
  document.getElementById("disciple-phone").value = d.phone || "";
  document.getElementById("disciple-status").value = d.status || "Active";
  document.getElementById("disciple-sysrole").value = d.system_role || "member";
  document.getElementById("disciple-djlight").value = d.dj_traffic_light || "red";
  document.getElementById("disciple-baptized").checked = Boolean(d.baptism_info?.is_baptized);
  document.getElementById("disciple-baptism-date").value = d.baptism_info?.baptism_date || "";
  document.getElementById("modal-disciple").classList.remove("hidden");
};
