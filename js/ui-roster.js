// js/ui-roster.js
import { auth } from "./firebase-config.js";
import {
  getDepartments,
  saveDepartment,
  deleteDepartment,
  getRoles,
  saveRole,
  deleteRole,
  getDisciples
} from "./db-master.js";
import {
  getWeeklyInsights
} from "./db-content.js";
import {
  getAssignmentsByDate,
  upsertAssignment,
  deleteAssignment,
  getUnavailability,
  addUnavailability,
  deleteUnavailability
} from "./db-roster.js";

const LEGACY_SINGER_NAMES = ["Singer 1", "Singer 2", "Singer 3"];

const FALLBACK_ROLE_ORDER = [
  "Service MC / Host",
  "MD",
  "Worship Leader",
  "Singer",
  ...LEGACY_SINGER_NAMES,
  "Prayer",
  "Acoustic / Electric Guitar",
  "Electric Guitar",
  "Acoustic Guitar",
  "Bass Guitar",
  "Drums / Cajon",
  "Keyboard / Piano",
  "Sound Engineer",
  "Lighting",
  "Multi Media",
  "Camera",
  "Livestream & Camera",
  "Fellowship Refreshments",
  "Greeter / Usher"
];

let rosterState = {
  departments: [],
  roles: [],
  disciples: [],
  services: [],
  unavailability: [],
  selectedDate: "",
  assignments: [],
  currentUserEmail: "",
  currentUserProfile: null,
  isGlobalAdmin: false
};

export async function initRosterEngine(userProfile = null) {
  rosterState.currentUserProfile = userProfile;
  bindRosterEvents();
  await refreshRosterContext();
}

function normKey(val) {
  return (val || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeEmailList(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.map(e => (e || "").toString().trim().toLowerCase()).filter(Boolean);
  }
  return val
    .toString()
    .split(/[,;\n]+/)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
}

function isLeadershipRole(role) {
  const name = (role?.role_name || role?.name || "").toString().trim().toLowerCase();
  return name.startsWith("head of dept") || name.startsWith("lead of dept");
}

function resolveUserAccess() {
  const email = (
    rosterState.currentUserProfile?.email ||
    rosterState.currentUserProfile?.discipleDoc?.email ||
    auth?.currentUser?.email ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  rosterState.currentUserEmail = email;

  const sysRole = (
    rosterState.currentUserProfile?.system_role ||
    rosterState.currentUserProfile?.discipleDoc?.system_role ||
    rosterState.currentUserProfile?.role ||
    rosterState.currentUserProfile?.accessLevel ||
    ""
  )
    .toString()
    .toLowerCase();

  const isGlobal =
    ["super_admin", "admin", "coordinator", "church_coordinator", "pastor"].includes(sysRole) ||
    rosterState.currentUserProfile?.isAdmin === true;

  rosterState.isGlobalAdmin = isGlobal;
}

function getVisibleDepartments() {
  const activeDepts = rosterState.departments.filter(
    d => d.active !== false && d.is_active !== false
  );

  if (rosterState.isGlobalAdmin) return activeDepts;

  const myEmail = rosterState.currentUserEmail;
  const myInterests = Array.isArray(rosterState.currentUserProfile?.discipleDoc?.ministry_interests)
    ? rosterState.currentUserProfile.discipleDoc.ministry_interests.map(i =>
        String(i || "").trim().toLowerCase()
      )
    : [];

  return activeDepts.filter(d => {
    const leads = normalizeEmailList(d.lead_emails || d.lead_email || d.head_email);
    if (myEmail && leads.includes(myEmail)) return true;

    const deptNameLower = String(d.name || "").trim().toLowerCase();
    if (!deptNameLower) return false;

    return myInterests.some(
      item =>
        (item.startsWith("head of dept") || item.startsWith("lead of dept")) &&
        item.includes(deptNameLower)
    );
  });
}

function roleMatchesDept(role, dept) {
  const deptKeys = new Set([
    normKey(dept.id),
    normKey(dept.name)
  ].filter(Boolean));

  const roleKeys = [
    normKey(role.department_id),
    normKey(role.dept_id),
    normKey(role.dept_name),
    normKey(role.department_name)
  ].filter(Boolean);

  return roleKeys.some(k => deptKeys.has(k));
}

function getNumericOrder(role) {
  const raw =
    role?.sort_order !== undefined && role?.sort_order !== null && role?.sort_order !== ""
      ? role.sort_order
      : role?.order;
  if (raw === null || raw === undefined || raw === "") return null;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function sortRolesCustom(roles) {
  return [...roles].sort((a, b) => {
    const orderA = getNumericOrder(a);
    const orderB = getNumericOrder(b);

    if (orderA !== null && orderB !== null) {
      if (orderA !== orderB) return orderA - orderB;
    } else if (orderA !== null) {
      return -1;
    } else if (orderB !== null) {
      return 1;
    }

    const nameA = a.role_name || a.name || "";
    const nameB = b.role_name || b.name || "";
    const idxA = FALLBACK_ROLE_ORDER.indexOf(nameA);
    const idxB = FALLBACK_ROLE_ORDER.indexOf(nameB);
    const rankA = idxA === -1 ? 999 : idxA;
    const rankB = idxB === -1 ? 999 : idxB;
    if (rankA !== rankB) return rankA - rankB;
    return nameA.localeCompare(nameB);
  });
}

function isUniversalRole(role) {
  if (role?.is_universal === true) return true;
  return /cuci piring|vacuum/i.test(role?.role_name || role?.name || "");
}

function getRoleSlotsCount(role) {
  const raw = Number(role?.slots_count);
  if (Number.isFinite(raw) && raw >= 1) return Math.min(20, Math.floor(raw));
  if (/^singer$/i.test((role?.role_name || role?.name || "").trim())) return 3;
  return 1;
}

function buildRoleSlots(role) {
  const count = getRoleSlotsCount(role);
  const baseName = (role?.role_name || role?.name || "Role").trim();
  if (count <= 1) {
    return [{
      slotIndex: 1,
      slotsCount: 1,
      slotKey: role.id,
      displayLabel: baseName,
      assignmentKey: role.id
    }];
  }
  return Array.from({ length: count }, (_, idx) => {
    const num = idx + 1;
    return {
      slotIndex: num,
      slotsCount: count,
      slotKey: `${role.id}__${num}`,
      displayLabel: `${baseName} ${num}`,
      assignmentKey: `${role.id}__${num}`
    };
  });
}

function findAssignmentForSlot(role, slot) {
  const baseName = (role?.role_name || role?.name || "").trim();
  const exactBySlot = rosterState.assignments.find(
    a => a.slot_key === slot.slotKey || a.role_id === slot.slotKey
  );
  if (exactBySlot) return exactBySlot;

  if (slot.slotIndex === 1) {
    const matching = rosterState.assignments.filter(
      a => !a.slot_key && (a.role_id === role.id || a.role_name === baseName)
    );
    return matching[0] || null;
  }

  const matchingForRole = rosterState.assignments.filter(
    a => a.role_id === role.id || a.role_name === baseName || a.role_name === slot.displayLabel
  );
  return matchingForRole[slot.slotIndex - 1] || null;
}

function discipleHasInterestInRole(disciple, role) {
  if (isUniversalRole(role)) return true;
  const interests = Array.isArray(disciple?.ministry_interests) ? disciple.ministry_interests : [];
  if (interests.length === 0) return false;
  const target = (role?.role_name || role?.name || "").trim().toLowerCase();
  if (!target) return false;

  return interests.some(item => {
    const val = String(item || "").trim().toLowerCase();
    if (val === target) return true;
    if (target === "singer" && LEGACY_SINGER_NAMES.some(s => s.toLowerCase() === val)) return true;
    return false;
  });
}

async function refreshRosterContext() {
  const [depts, roles, disciples, weeks, unavail] = await Promise.all([
    getDepartments(),
    getRoles(),
    getDisciples(),
    getWeeklyInsights(),
    getUnavailability()
  ]);

  rosterState.departments = [...depts].sort((a, b) =>
    (Number(a.sort_order) || 999) - (Number(b.sort_order) || 999) ||
    (a.name || "").localeCompare(b.name || "")
  );
  rosterState.roles = sortRolesCustom(
    roles.filter(
      r => r.active !== false && r.is_active !== false && !isLeadershipRole(r)
    )
  );
  rosterState.disciples = disciples.filter(d => (d.status || "Active") === "Active");
  rosterState.unavailability = unavail;

  resolveUserAccess();
  renderDepartmentAdminManager();

  const serviceMap = new Map();
  weeks.forEach(w => {
    if (w.service_date) {
      serviceMap.set(w.service_date, {
        service_date: w.service_date,
        title: w.title || "Sunday Celebration",
        week_label: w.week_label || "",
        key_verse: w.key_verse || ""
      });
    }
  });

  if (rosterState.selectedDate && !serviceMap.has(rosterState.selectedDate)) {
    serviceMap.set(rosterState.selectedDate, {
      service_date: rosterState.selectedDate,
      title: "Custom / Special Service",
      week_label: "Special",
      key_verse: ""
    });
  }

  rosterState.services = Array.from(serviceMap.values()).sort((a, b) =>
    a.service_date.localeCompare(b.service_date)
  );

  if (!rosterState.selectedDate && rosterState.services.length > 0) {
    const todayISO = getAucklandTodayISO();
    const upcoming = rosterState.services.find(s => s.service_date >= todayISO);
    rosterState.selectedDate = (upcoming || rosterState.services[0]).service_date;
  }

  populateServiceSelect();
  populateUnavailDiscipleSelect();
  renderUnavailabilityList();

  if (rosterState.selectedDate) {
    await loadServiceRoster(rosterState.selectedDate);
  }
}

function ensureAdminManagerContainer() {
  const board = document.getElementById("roster-board");
  if (!board || !board.parentElement) return null;

  let container = document.getElementById("roster-dept-lead-manager");
  if (!container) {
    container = document.createElement("div");
    container.id = "roster-dept-lead-manager";
    container.className = "mb-5";
    board.parentElement.insertBefore(container, board);
  }
  return container;
}

function renderDepartmentAdminManager() {
  const container = ensureAdminManagerContainer();
  if (!container) return;

  const visibleDepts = getVisibleDepartments();

  if (!rosterState.isGlobalAdmin) {
    if (visibleDepts.length === 0) {
      container.innerHTML = `
        <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
          <strong>Department Access:</strong> Akun Anda (<code>${rosterState.currentUserEmail || "guest"}</code>) belum ditetapkan sebagai Kepala Departemen. Hubungi System Admin / Church Coordinator untuk mendaftarkan email Anda pada departemen terkait.
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p class="text-[11px] uppercase tracking-wider text-amber-400 font-bold">Department Lead Mode</p>
          <p class="text-xs text-slate-200 mt-0.5">
            Anda mengelola roster untuk: <strong>${visibleDepts.map(d => d.name).join(", ")}</strong> (${rosterState.currentUserEmail})
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${visibleDepts.map(d => `
            <button
              type="button"
              onclick="window.openAddDeptRolePrompt('${d.id}')"
              class="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg"
            >+ Add Role (${d.name})</button>
          `).join("")}
        </div>
      </div>
    `;
    return;
  }

  const discipleEmailOptions = rosterState.disciples
    .filter(d => d.email)
    .map(d => `<option value="${d.email.toLowerCase()}">${d.full_name} (${d.email})</option>`)
    .join("");

  const deptRowsHtml = rosterState.departments.map(dept => {
    const leads = normalizeEmailList(dept.lead_emails || dept.lead_email);
    const deptRoles = rosterState.roles.filter(r => roleMatchesDept(r, dept));
    const isActive = dept.active !== false && dept.is_active !== false;

    const roleBadges = deptRoles.map(r => {
      const rName = r.role_name || r.name;
      const slots = getRoleSlotsCount(r);
      return `
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-800">
          <span>${rName}${slots > 1 ? ` (${slots} slots)` : ""}</span>
          <button type="button" onclick="window.openEditDeptRolePrompt('${r.id}')" title="Edit Role" class="text-blue-600 hover:underline font-bold">✎</button>
          <button type="button" onclick="window.deleteDeptRoleItem('${r.id}', '${rName.replace(/'/g, "\\'")}')" title="Delete Role" class="text-red-600 hover:underline font-bold">×</button>
        </span>
      `;
    }).join(" ");

    return `
      <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm text-slate-900">${dept.name}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}">
                ${isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p class="text-xs text-slate-600 mt-0.5">
              👤 <strong>Kepala Departemen (Lead Emails):</strong>
              ${leads.length > 0 ? leads.map(e => `<code class="bg-white px-1.5 py-0.5 rounded border text-[11px]">${e}</code>`).join(" ") : `<span class="italic text-slate-400">Belum ditetapkan</span>`}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-1.5 shrink-0">
            <button type="button" onclick="window.openAddDeptRolePrompt('${dept.id}')" class="px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg">
              + Role
            </button>
            <button type="button" onclick="window.openEditDepartmentForm('${dept.id}')" class="px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg">
              ✎ Edit Dept / Lead
            </button>
            <button type="button" onclick="window.deleteDepartmentItem('${dept.id}', '${(dept.name || "").replace(/'/g, "\\'")}')" class="px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg">
              🗑 Delete
            </button>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/70">
          <span class="text-[11px] font-semibold text-slate-500 mr-1">Roles (${deptRoles.length}):</span>
          ${roleBadges || `<span class="text-[11px] text-slate-400 italic">Belum ada role</span>`}
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `
    <details class="bg-white rounded-xl border border-slate-200 shadow-sm">
      <summary class="px-4 py-3 cursor-pointer flex items-center justify-between font-bold text-xs uppercase tracking-wider text-slate-800 select-none">
        <span>⚙️ Department & Department Lead Settings (Add / Edit / Delete)</span>
        <span class="text-[11px] font-normal normal-case text-slate-500">${rosterState.departments.length} departments</span>
      </summary>
      <div class="p-4 border-t border-slate-200 space-y-4">
        <form id="form-manage-department" class="grid grid-cols-1 md:grid-cols-12 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <input type="hidden" id="dept-edit-id" value="" />
          <div class="md:col-span-3">
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Department Name *</label>
            <input type="text" id="dept-edit-name" required placeholder="e.g. Praise & Worship" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
          </div>
          <div class="md:col-span-4">
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Lead Email(s) — Kepala Departemen</label>
            <input type="text" id="dept-edit-leads" list="datalist-disciple-emails" placeholder="nori@email.com (pisahkan koma jika >1)" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
            <datalist id="datalist-disciple-emails">${discipleEmailOptions}</datalist>
          </div>
          <div class="md:col-span-3">
            <label class="block text-[11px] font-bold text-slate-700 mb-1">Initial Roles (Opsional, pisah koma)</label>
            <input type="text" id="dept-edit-roles" placeholder="WL, Singer, Keyboard" class="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
          </div>
          <div class="md:col-span-2 flex items-end gap-1.5">
            <button type="submit" id="btn-save-dept" class="w-full px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg">
              + Add Dept
            </button>
            <button type="button" id="btn-cancel-edit-dept" onclick="window.resetDepartmentForm()" class="hidden px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg">
              Cancel
            </button>
          </div>
        </form>

        <div class="space-y-2.5">
          ${deptRowsHtml || `<p class="text-xs text-slate-500">Belum ada departemen terdaftar.</p>`}
        </div>
      </div>
    </details>
  `;

  document.getElementById("form-manage-department")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("dept-edit-id").value.trim() || null;
    const name = document.getElementById("dept-edit-name").value.trim();
    const leadEmails = normalizeEmailList(document.getElementById("dept-edit-leads").value);
    const initialRolesRaw = document.getElementById("dept-edit-roles").value;
    if (!name) return;

    const deptId = editId || normKey(name);
    await saveDepartment(deptId, {
      name,
      lead_emails: leadEmails,
      active: true,
      is_active: true
    });

    const newRoleNames = initialRolesRaw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    for (let i = 0; i < newRoleNames.length; i++) {
      const rName = newRoleNames[i];
      await saveRole(null, {
        role_name: rName,
        department_id: deptId,
        dept_name: name,
        min_dj_level: "Come",
        slots_count: /^singer$/i.test(rName) ? 3 : 1,
        is_universal: /cuci piring|vacuum/i.test(rName),
        sort_order: rosterState.roles.length + i + 1,
        active: true,
        is_active: true
      });
    }

    window.resetDepartmentForm();
    await refreshRosterContext();
  });
}

window.openEditDepartmentForm = (deptId) => {
  const dept = rosterState.departments.find(d => d.id === deptId);
  if (!dept) return;

  document.getElementById("dept-edit-id").value = dept.id;
  document.getElementById("dept-edit-name").value = dept.name || "";
  document.getElementById("dept-edit-leads").value = normalizeEmailList(
    dept.lead_emails || dept.lead_email
  ).join(", ");
  document.getElementById("dept-edit-roles").value = "";

  const saveBtn = document.getElementById("btn-save-dept");
  const cancelBtn = document.getElementById("btn-cancel-edit-dept");
  if (saveBtn) saveBtn.textContent = "Save Dept";
  if (cancelBtn) cancelBtn.classList.remove("hidden");
  document.getElementById("dept-edit-name")?.focus();
};

window.resetDepartmentForm = () => {
  const form = document.getElementById("form-manage-department");
  if (form) form.reset();
  const idInput = document.getElementById("dept-edit-id");
  if (idInput) idInput.value = "";
  const saveBtn = document.getElementById("btn-save-dept");
  const cancelBtn = document.getElementById("btn-cancel-edit-dept");
  if (saveBtn) saveBtn.textContent = "+ Add Dept";
  if (cancelBtn) cancelBtn.classList.add("hidden");
};

window.deleteDepartmentItem = async (deptId, deptName) => {
  if (!confirm(`Hapus departemen "${deptName}"?`)) return;
  await deleteDepartment(deptId);
  await refreshRosterContext();
};

window.openAddDeptRolePrompt = async (deptId) => {
  const dept = rosterState.departments.find(d => d.id === deptId);
  if (!dept) return;

  const roleName = prompt(`Tambah Role baru untuk departemen "${dept.name}" (contoh: WL, Singer, Lighting):`);
  if (!roleName || !roleName.trim()) return;

  const cleanName = roleName.trim();
  const defaultSlots = /^singer$/i.test(cleanName) ? "3" : "1";
  const slotsRaw = prompt("Jumlah slot pada kebaktian Minggu (1, 2, 3, ...):", defaultSlots);
  const slotsCount = Math.max(1, Math.min(20, parseInt(slotsRaw, 10) || Number(defaultSlots)));
  const minDj = prompt("Min DJ Level (Come / Grow / Serve / Lead):", "Come") || "Come";

  await saveRole(null, {
    role_name: cleanName,
    department_id: dept.id,
    dept_name: dept.name,
    min_dj_level: minDj.trim(),
    slots_count: slotsCount,
    is_universal: /cuci piring|vacuum/i.test(cleanName),
    sort_order: rosterState.roles.length + 1,
    active: true,
    is_active: true
  });
  await refreshRosterContext();
};

window.openEditDeptRolePrompt = async (roleId) => {
  const role = rosterState.roles.find(r => r.id === roleId);
  if (!role) return;

  const currentName = role.role_name || role.name || "";
  const newName = prompt("Edit nama Role:", currentName);
  if (!newName || !newName.trim()) return;

  const newSlotsRaw = prompt("Jumlah slot pada kebaktian Minggu:", String(getRoleSlotsCount(role)));
  const newSlots = Math.max(1, Math.min(20, parseInt(newSlotsRaw, 10) || 1));

  const newDj = prompt("Min DJ Level (Come / Grow / Serve / Lead):", role.min_dj_level || "Come");
  if (newDj === null) return;

  const newOrderRaw = prompt("Urutan tampil (angka):", String(getNumericOrder(role) ?? 1));
  const newOrder = Number(newOrderRaw);

  await saveRole(role.id, {
    role_name: newName.trim(),
    slots_count: newSlots,
    min_dj_level: newDj.trim() || "Come",
    is_universal: /cuci piring|vacuum/i.test(newName.trim()),
    ...(Number.isFinite(newOrder) ? { sort_order: newOrder } : {})
  });
  await refreshRosterContext();
};

window.deleteDeptRoleItem = async (roleId, roleName) => {
  if (!confirm(`Hapus role "${roleName}"?`)) return;
  await deleteRole(roleId);
  await refreshRosterContext();
};

function getAucklandTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function populateServiceSelect() {
  const select = document.getElementById("roster-service-select");
  if (!select) return;

  select.innerHTML = rosterState.services
    .map(s => `<option value="${s.service_date}">${s.service_date} — ${s.title}${s.week_label ? ` (${s.week_label})` : ""}</option>`)
    .join("");

  if (rosterState.selectedDate) {
    select.value = rosterState.selectedDate;
  }
}

function populateUnavailDiscipleSelect() {
  const select = document.getElementById("unavail-disciple");
  if (!select) return;

  select.innerHTML = rosterState.disciples
    .map(d => `<option value="${d.id}">${d.full_name}</option>`)
    .join("");
}

async function loadServiceRoster(serviceDate) {
  rosterState.selectedDate = serviceDate;
  const svc = rosterState.services.find(s => s.service_date === serviceDate);

  const titleEl = document.getElementById("roster-theme-title");
  const metaEl = document.getElementById("roster-theme-meta");
  if (titleEl) {
    titleEl.textContent = svc ? `${svc.service_date} • ${svc.title}` : serviceDate;
  }
  if (metaEl) {
    metaEl.textContent = svc
      ? [svc.week_label, svc.key_verse].filter(Boolean).join(" • ") || "Sunday Celebration 4:30 PM"
      : "";
  }

  rosterState.assignments = await getAssignmentsByDate(serviceDate);
  renderRosterBoard();
  renderConflicts();
}

function isDiscipleUnavailable(discipleId, serviceDate) {
  return rosterState.unavailability.find(u => {
    if (u.disciple_id !== discipleId) return false;
    const start = u.start_date || u.unavailable_date || "";
    const end = u.end_date || start;
    return serviceDate >= start && serviceDate <= end;
  });
}

function getDjRank(level) {
  const map = { come: 1, grow: 2, serve: 3, lead: 4 };
  return map[(level || "come").toLowerCase()] || 1;
}

function meetsMinDj(disciple, minDjLevel) {
  const reqRank = getDjRank(minDjLevel);
  if (reqRank <= 1) return true;
  const light = (disciple.dj_traffic_light || "red").toLowerCase();
  const stage = (disciple.dj_stage || "").toLowerCase();
  if (light === "green") return true;
  if (light === "amber") return reqRank <= 2;
  if (stage.includes("grow") || stage.includes("serve") || stage.includes("lead")) return reqRank <= 2;
  return false;
}

function renderRosterBoard() {
  const board = document.getElementById("roster-board");
  if (!board) return;

  const visibleDepartments = getVisibleDepartments();

  const assignedCountByDisciple = {};
  rosterState.assignments.forEach(a => {
    if (a.disciple_id) {
      assignedCountByDisciple[a.disciple_id] = (assignedCountByDisciple[a.disciple_id] || 0) + 1;
    }
  });

  const deptCards = visibleDepartments.map(dept => {
    const deptRoles = rosterState.roles.filter(r => roleMatchesDept(r, dept));
    if (deptRoles.length === 0) return "";

    const expandedSlots = deptRoles.flatMap(role =>
      buildRoleSlots(role).map(slot => ({ role, slot }))
    );

    const filledCount = expandedSlots.filter(({ role, slot }) => {
      const current = findAssignmentForSlot(role, slot);
      return Boolean(current?.disciple_id);
    }).length;

    const leads = normalizeEmailList(dept.lead_emails || dept.lead_email);

    const rowsHtml = expandedSlots.map(({ role, slot }) => {
      const rName = role.role_name || role.name || "Role";
      const current = findAssignmentForSlot(role, slot);
      const selectedId = current?.disciple_id || "";
      const isVocalTeam = ["Worship Leader", "Singer", ...LEGACY_SINGER_NAMES].includes(rName);
      const universal = isUniversalRole(role);

      const sortedDisciples = [...rosterState.disciples].sort((a, b) => {
        if (!universal) {
          const intA = discipleHasInterestInRole(a, role) ? 0 : 1;
          const intB = discipleHasInterestInRole(b, role) ? 0 : 1;
          if (intA !== intB) return intA - intB;
        }
        return (a.full_name || "").localeCompare(b.full_name || "");
      });

      const optionsHtml = sortedDisciples.map(d => {
        const unavail = isDiscipleUnavailable(d.id, rosterState.selectedDate);
        const djOk = meetsMinDj(d, role.min_dj_level);
        const count = assignedCountByDisciple[d.id] || 0;
        const interested = !universal && discipleHasInterestInRole(d, role);
        const flags = [
          interested ? "✨ Interested" : "",
          unavail ? "🚫 Unavailable" : "",
          !djOk ? `⚠️ Min DJ: ${role.min_dj_level}` : "",
          count > 1 ? `(${count} roles)` : ""
        ].filter(Boolean).join(" ");

        return `<option value="${d.id}" ${d.id === selectedId ? "selected" : ""}>${d.full_name}${flags ? ` ${flags}` : ""}</option>`;
      }).join("");

      const statusBadge = selectedId
        ? `<span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${
            current?.status === "Confirmed"
              ? "badge-green"
              : current?.status === "Declined"
              ? "badge-red"
              : "badge-amber"
          }">${current?.status || "Assigned"}</span>`
        : `<span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Optional / Open</span>`;

      const slotMeta = slot.slotsCount > 1 ? ` • Slot ${slot.slotIndex}/${slot.slotsCount}` : "";

      return `
        <div class="py-2.5 border-b border-slate-100 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          isVocalTeam ? "bg-amber-50/35 -mx-2 px-2 rounded-lg" : ""
        }">
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="text-xs font-bold text-slate-900">${slot.displayLabel}</p>
              ${universal ? `<span class="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">Shared</span>` : ""}
              ${slot.slotIndex === 1 ? `
                <button type="button" onclick="window.openEditDeptRolePrompt('${role.id}')" title="Edit Role & Slots" class="text-[11px] text-slate-400 hover:text-blue-600">✎</button>
                <button type="button" onclick="window.deleteDeptRoleItem('${role.id}', '${rName.replace(/'/g, "\\'")}')" title="Delete Role" class="text-[11px] text-slate-400 hover:text-red-600">×</button>
              ` : ""}
            </div>
            <p class="text-[11px] text-slate-500">Min DJ: ${role.min_dj_level || "Come"}${slotMeta}${role.can_reimburse ? " • Reimbursable" : ""}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <select
              onchange="window.assignRosterSlot('${role.id}', '${slot.slotKey}', this.value)"
              class="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white max-w-[230px]"
            >
              <option value="">— Unassigned —</option>
              ${optionsHtml}
            </select>
            ${statusBadge}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div class="flex items-center justify-between border-b border-slate-200 pb-2 gap-2">
          <div>
            <h3 class="font-bold text-xs uppercase tracking-wider text-slate-800">${dept.name}</h3>
            ${leads.length > 0 ? `<p class="text-[10px] text-slate-500">Lead: ${leads.join(", ")}</p>` : ""}
          </div>
          <div class="flex items-center gap-2">
            <button type="button" onclick="window.openAddDeptRolePrompt('${dept.id}')" class="text-[11px] font-bold text-blue-600 hover:underline">+ Role</button>
            <span class="text-xs font-bold text-slate-600">${filledCount}/${expandedSlots.length} filled</span>
          </div>
        </div>
        <div>${rowsHtml}</div>
      </div>
    `;
  }).filter(Boolean).join("");

  board.innerHTML =
    deptCards ||
    `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500 col-span-full">Tidak ada departemen atau role yang tersedia untuk akun Anda.</div>`;
}

function renderConflicts() {
  const banner = document.getElementById("roster-conflict-banner");
  if (!banner) return;

  const visibleDeptIds = new Set(getVisibleDepartments().map(d => normKey(d.id)));
  const visibleDeptNames = new Set(getVisibleDepartments().map(d => normKey(d.name)));

  const warnings = [];
  const byDisciple = {};

  rosterState.assignments.forEach(a => {
    if (!a.disciple_id) return;
    byDisciple[a.disciple_id] = byDisciple[a.disciple_id] || [];
    byDisciple[a.disciple_id].push(a.role_name);

    const inScope =
      rosterState.isGlobalAdmin ||
      visibleDeptIds.has(normKey(a.dept_id)) ||
      visibleDeptNames.has(normKey(a.dept_name));

    if (!inScope) return;

    const unavail = isDiscipleUnavailable(a.disciple_id, rosterState.selectedDate);
    if (unavail) {
      warnings.push(`🚫 <strong>${a.disciple_name}</strong> is marked unavailable for <strong>${roleNameOr(a.role_name)}</strong>${unavail.reason ? ` (${unavail.reason})` : ""}.`);
    }

    const baseRoleId = String(a.role_id || "").split("__")[0];
    const role = rosterState.roles.find(r => r.id === baseRoleId || r.id === a.role_id || (r.role_name || r.name) === a.role_name);
    const disciple = rosterState.disciples.find(d => d.id === a.disciple_id);
    if (role && disciple && !meetsMinDj(disciple, role.min_dj_level)) {
      const rName = a.role_name || role.role_name || role.name;
      warnings.push(`⚠️ <strong>${a.disciple_name}</strong> is assigned to <strong>${rName}</strong> (Min DJ: ${role.min_dj_level}).`);
    }
  });

  Object.entries(byDisciple).forEach(([discId, roleNames]) => {
    if (roleNames.length > 1) {
      const personName = rosterState.assignments.find(x => x.disciple_id === discId)?.disciple_name || "Volunteer";
      warnings.push(`🔁 <strong>${personName}</strong> has multiple roles on ${rosterState.selectedDate}: <strong>${roleNames.join(", ")}</strong>.`);
    }
  });

  if (warnings.length === 0) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
  } else {
    banner.classList.remove("hidden");
    banner.innerHTML = warnings.map(w => `<p>${w}</p>`).join("");
  }
}

function roleNameOr(val) {
  return val || "role";
}

function renderUnavailabilityList() {
  const list = document.getElementById("list-unavailability");
  if (!list) return;

  if (rosterState.unavailability.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-500">No unavailability records logged.</p>`;
    return;
  }

  list.innerHTML = rosterState.unavailability.map(u => {
    const label = !u.end_date || u.start_date === u.end_date
      ? u.start_date
      : `${u.start_date} → ${u.end_date}`;
    return `
      <div class="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2 text-xs">
        <div>
          <strong>${u.disciple_name}</strong>
          <span class="font-mono text-red-700 ml-1.5">${label}</span>
          ${u.reason ? `<span class="text-slate-600 ml-1">— ${u.reason}</span>` : ""}
        </div>
        <button onclick="window.removeUnavailability('${u.id}')" class="text-red-600 hover:underline font-medium shrink-0">Remove</button>
      </div>
    `;
  }).join("");
}

function buildWhatsAppRosterText() {
  const svc = rosterState.services.find(s => s.service_date === rosterState.selectedDate);
  const lines = [
    `*IFGF PALMERSTON NORTH — SUNDAY ROSTER*`,
    `📅 *Date:* ${rosterState.selectedDate}`,
    svc ? `📖 *Theme:* ${svc.title}` : "",
    `⏰ *Time:* Sunday 4:30 PM`,
    ``
  ].filter(Boolean);

  getVisibleDepartments().forEach(dept => {
    const deptRoles = rosterState.roles.filter(r => roleMatchesDept(r, dept));
    if (deptRoles.length === 0) return;

    lines.push(`*${dept.name}*`);
    deptRoles.forEach(role => {
      buildRoleSlots(role).forEach(slot => {
        const assigned = findAssignmentForSlot(role, slot);
        const person = assigned?.disciple_name || "_Unassigned_";
        lines.push(`• ${slot.displayLabel}: ${person}`);
      });
    });
    lines.push(``);
  });

  return lines.join("\n").trim();
}

function bindRosterEvents() {
  document.querySelector('.tab-btn[data-tab="roster"]')?.addEventListener("click", async () => {
    await refreshRosterContext();
  });

  document.getElementById("roster-service-select")?.addEventListener("change", async (e) => {
    await loadServiceRoster(e.target.value);
  });

  document.getElementById("btn-add-custom-service")?.addEventListener("click", async () => {
    const dateVal = prompt("Enter Service Date (YYYY-MM-DD, e.g. 2026-12-25):");
    if (!dateVal || !/^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
      if (dateVal !== null) alert("Please enter a valid date in YYYY-MM-DD format.");
      return;
    }
    const cleanDate = dateVal.trim();
    const titleVal = prompt("Enter Service / Event Title:", "Special Service") || "Special Service";

    if (!rosterState.services.some(s => s.service_date === cleanDate)) {
      rosterState.services.push({
        service_date: cleanDate,
        title: titleVal.trim(),
        week_label: "Special",
        key_verse: ""
      });
      rosterState.services.sort((a, b) => a.service_date.localeCompare(b.service_date));
    }
    rosterState.selectedDate = cleanDate;
    populateServiceSelect();
    await loadServiceRoster(cleanDate);
  });

  document.getElementById("btn-copy-wa-roster")?.addEventListener("click", async () => {
    const text = buildWhatsAppRosterText();
    try {
      await navigator.clipboard.writeText(text);
      alert("WhatsApp roster copied to clipboard!");
    } catch {
      prompt("Copy WhatsApp Roster text:", text);
    }
  });

  document.getElementById("form-unavailability")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const discipleId = document.getElementById("unavail-disciple").value;
    const disciple = rosterState.disciples.find(d => d.id === discipleId);
    const startDate = document.getElementById("unavail-from").value;
    const endDate = document.getElementById("unavail-to").value || startDate;
    const reason = document.getElementById("unavail-reason").value.trim();

    if (!disciple || !startDate) return;
    if (endDate < startDate) {
      alert("'To Date' cannot be earlier than 'From Date'.");
      return;
    }

    await addUnavailability({
      disciple_id: disciple.id,
      disciple_name: disciple.full_name,
      start_date: startDate,
      end_date: endDate,
      reason
    });
    e.target.reset();
    rosterState.unavailability = await getUnavailability();
    renderUnavailabilityList();
    renderRosterBoard();
    renderConflicts();
  });
}

window.assignRosterSlot = async (roleId, slotKey, discipleId) => {
  const role = rosterState.roles.find(r => r.id === roleId);
  if (!role || !rosterState.selectedDate) return;

  const slots = buildRoleSlots(role);
  const slot = slots.find(s => s.slotKey === slotKey) || slots[0];
  const existing = findAssignmentForSlot(role, slot);

  if (!discipleId) {
    if (existing?.id) {
      await deleteAssignment(existing.id);
    }
  } else {
    const disciple = rosterState.disciples.find(d => d.id === discipleId);
    if (!disciple) return;
    const deptObj = rosterState.departments.find(
      d => d.id === (role.department_id || role.dept_id)
    );
    await upsertAssignment(existing?.id || null, {
      service_date: rosterState.selectedDate,
      department_id: role.department_id || role.dept_id || "",
      dept_id: role.department_id || role.dept_id || "",
      dept_name: deptObj?.name || role.dept_name || "",
      role_id: role.id,
      slot_key: slot.slotKey,
      slot_index: slot.slotIndex,
      role_name: slot.displayLabel,
      disciple_id: disciple.id,
      disciple_name: disciple.full_name,
      disciple_phone: disciple.phone || "",
      status: "Assigned"
    });
  }

  rosterState.assignments = await getAssignmentsByDate(rosterState.selectedDate);
  renderRosterBoard();
  renderConflicts();
};

window.removeUnavailability = async (id) => {
  await deleteUnavailability(id);
  rosterState.unavailability = await getUnavailability();
  renderUnavailabilityList();
  renderRosterBoard();
  renderConflicts();
};
