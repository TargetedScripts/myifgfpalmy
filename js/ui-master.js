
// js/ui-master.js
import {
  getDepartments,
  saveDepartment,
  getRolesReference,
  saveRoleReference,
  toggleRoleActive,
  getDisciples,
  saveDisciple,
  seedInitialMasterData
} from "./db-master.js";

let state = {
  profile: null,
  departments: [],
  roles: [],
  disciples: [],
  activeTab: "disciples"
};

export async function initMasterApp(profile) {
  state.profile = profile;
  document.getElementById("user-name-badge").textContent = profile.displayName;
  document.getElementById("user-role-badge").textContent = profile.accessLevel.toUpperCase();

  bindNavigation();
  bindModalsAndActions();
  await refreshAllData();
}

function bindNavigation() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeTab = btn.dataset.tab;

      document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
      document.getElementById(`panel-${state.activeTab}`).classList.remove("hidden");
    });
  });
}

async function refreshAllData() {
  try {
    const [depts, roles, disciples] = await Promise.all([
      getDepartments(),
      getRolesReference(),
      getDisciples()
    ]);
    state.departments = depts;
    state.roles = roles;
    state.disciples = disciples;

    renderDepartments();
    renderRoles();
    renderDisciples();
    populateDepartmentSelect();
  } catch (err) {
    console.error("Error loading master data:", err);
  }
}

// --- RENDER DEPARTMENTS ---
function renderDepartments() {
  const tbody = document.getElementById("tbody-departments");
  if (state.departments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500">No departments yet. Click "Seed Default Data" above.</td></tr>`;
    return;
  }
  tbody.innerHTML = state.departments.map(d => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-3 font-medium text-slate-800">${d.sort_order || "-"}</td>
      <td class="p-3 font-semibold text-slate-900">${d.name}</td>
      <td class="p-3">
        <span class="px-2 py-1 text-xs rounded-full font-medium ${d.is_active ? "badge-green" : "bg-slate-200 text-slate-600"}">
          ${d.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td class="p-3 text-right">
        <button onclick="window.editDept('${d.id}')" class="text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-medium">Edit</button>
      </td>
    </tr>
  `).join("");
}

// --- RENDER ROLES REFERENCE ---
function renderRoles() {
  const tbody = document.getElementById("tbody-roles");
  const deptMap = Object.fromEntries(state.departments.map(d => [d.id, d.name]));

  if (state.roles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">No roles found. Click "Seed Default Data" to populate 24+ roles.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.roles.map(r => `
    <tr class="border-b border-slate-100 hover:bg-slate-50">
      <td class="p-3 font-semibold text-slate-900">${r.role_name}</td>
      <td class="p-3 text-sm text-slate-600">${deptMap[r.department_id] || r.department_id}</td>
      <td class="p-3"><span class="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 font-medium">DJ ${r.min_dj_level || "Come"}</span></td>
      <td class="p-3 text-xs">${r.can_reimburse ? "✅ Yes" : "—"}</td>
      <td class="p-3 text-right space-x-1">
        <button onclick="window.toggleRole('${r.id}', ${r.is_active})" class="text-xs px-2.5 py-1 rounded font-medium ${r.is_active ? "badge-green" : "badge-red"}">
          ${r.is_active ? "Active" : "Disabled"}
        </button>
      </td>
    </tr>
  `).join("");
}

// --- RENDER DISCIPLES ---
function renderDisciples() {
  const container = document.getElementById("list-disciples");
  const search = (document.getElementById("search-disciple")?.value || "").toLowerCase();

  const filtered = state.disciples.filter(d =>
    (d.full_name || "").toLowerCase().includes(search) ||
    (d.email || "").toLowerCase().includes(search)
  );

  if (filtered.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200">No disciples found. Click "+ Add Disciple" to create the first profile.</div>`;
    return;
  }

  const lightIcon = { green: "🟢", amber: "🟠", red: "🔴" };

  container.innerHTML = filtered.map(d => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <span title="Discipleship Traffic Light">${lightIcon[d.dj_traffic_light] || "🔴"}</span>
          <h3 class="font-bold text-slate-900">${d.full_name}</h3>
          <span class="px-2 py-0.5 text-xs rounded-full font-medium ${d.status === "Active" ? "badge-green" : "badge-amber"}">
            ${d.status || "Active"}
          </span>
        </div>
        <p class="text-xs text-slate-500 mt-1">${d.email || "No email"} • ${d.phone || "No phone"} • Role: <strong class="text-slate-700">${d.system_role || "member"}</strong></p>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-center">
        <button onclick="window.editDisciple('${d.id}')" class="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700">
          Edit Profile
        </button>
      </div>
    </div>
  `).join("");
}

function populateDepartmentSelect() {
  const sel = document.getElementById("role-dept-select");
  if (!sel) return;
  sel.innerHTML = state.departments.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
}

// --- MODALS & GLOBAL HANDLERS ---
function bindModalsAndActions() {
  document.getElementById("btn-seed-master")?.addEventListener("click", async () => {
    if (!confirm("Populate default 9 Departments and 24+ Roles for IFGF Palmy?")) return;
    const btn = document.getElementById("btn-seed-master");
    btn.disabled = true;
    btn.textContent = "Seeding...";
    await seedInitialMasterData();
    await refreshAllData();
    btn.disabled = false;
    btn.textContent = "⚡ Seed Default Data";
    alert("Master Departments & Roles seeded successfully!");
  });

  document.getElementById("search-disciple")?.addEventListener("input", renderDisciples);

  // Save Disciple Form
  document.getElementById("form-disciple")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("disciple-id").value;
    const payload = {
      full_name: document.getElementById("disciple-name").value.trim(),
      email: document.getElementById("disciple-email").value.trim().toLowerCase(),
      phone: document.getElementById("disciple-phone").value.trim(),
      status: document.getElementById("disciple-status").value,
      system_role: document.getElementById("disciple-sysrole").value,
      dj_traffic_light: document.getElementById("disciple-djlight").value,
      baptism_info: {
        is_baptized: document.getElementById("disciple-baptized").checked,
        baptism_date: document.getElementById("disciple-baptism-date").value || ""
      }
    };
    await saveDisciple(id || null, payload);
    document.getElementById("modal-disciple").classList.add("hidden");
    await refreshAllData();
  });

  // Save Role Form
  document.getElementById("form-role")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      role_name: document.getElementById("role-name").value.trim(),
      department_id: document.getElementById("role-dept-select").value,
      min_dj_level: document.getElementById("role-dj-level").value,
      can_reimburse: document.getElementById("role-reimburse").checked,
      is_active: true
    };
    await saveRoleReference(null, payload);
    document.getElementById("modal-role").classList.add("hidden");
    e.target.reset();
    await refreshAllData();
  });
}

window.openNewDiscipleModal = () => {
  document.getElementById("form-disciple").reset();
  document.getElementById("disciple-id").value = "";
  document.getElementById("modal-disciple-title").textContent = "Add New Disciple";
  document.getElementById("modal-disciple").classList.remove("hidden");
};

window.editDisciple = (id) => {
  const d = state.disciples.find(x => x.id === id);
  if (!d) return;
  document.getElementById("disciple-id").value = d.id;
  document.getElementById("disciple-name").value = d.full_name || "";
  document.getElementById("disciple-email").value = d.email || "";
  document.getElementById("disciple-phone").value = d.phone || "";
  document.getElementById("disciple-status").value = d.status || "Active";
  document.getElementById("disciple-sysrole").value = d.system_role || "member";
  document.getElementById("disciple-djlight").value = d.dj_traffic_light || "red";
  document.getElementById("disciple-baptized").checked = d.baptism_info?.is_baptized || false;
  document.getElementById("disciple-baptism-date").value = d.baptism_info?.baptism_date || "";
  document.getElementById("modal-disciple-title").textContent = "Edit Disciple Profile";
  document.getElementById("modal-disciple").classList.remove("hidden");
};

window.toggleRole = async (id, currentState) => {
  await toggleRoleActive(id, currentState);
  await refreshAllData();
};

window.editDept = async (id) => {
  const d = state.departments.find(x => x.id === id);
  if (!d) return;
  const newName = prompt("Department Name:", d.name);
  if (newName && newName.trim()) {
    await saveDepartment(id, { name: newName.trim() });
    await refreshAllData();
  }
};
