// js/ui-roster.js
import {
  getDepartments,
  getRoles,
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

const FALLBACK_ROLE_ORDER = [
  "Service MC / Host",
  "Worship Leader",
  "Singer 1",
  "Singer 2",
  "Singer 3",
  "Singer / Backing Vocal",
  "Acoustic / Electric Guitar",
  "Electric Guitar",
  "Acoustic Guitar",
  "Bass Guitar",
  "Drums / Cajon",
  "Keyboard / Piano",
  "MD",
  "Prayer",
  "Sound Engineer",
  "Lighting",
  "Multi Media",
  "Multimedia / Lyrics Operator",
  "Camera",
  "Livestream & Camera",
  "Barista / Coffee Station",
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
  assignments: []
};

export async function initRosterEngine() {
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
  const raw = role?.sort_order;
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  const parsed = Number(raw);
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : null;
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

async function refreshRosterContext() {
  const [depts, roles, disciples, weeks, unavail] = await Promise.all([
    getDepartments(),
    getRoles(),
    getDisciples(),
    getWeeklyInsights(),
    getUnavailability()
  ]);

  rosterState.departments = depts.filter(d => d.active !== false && d.is_active !== false);
  rosterState.roles = sortRolesCustom(
    roles.filter(r => r.active !== false && r.is_active !== false)
  );
  rosterState.disciples = disciples.filter(d => (d.status || "Active") === "Active");
  rosterState.unavailability = unavail;

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
      ? [svc.week_label, svc.key_verse].filter(Boolean).join(" • ") || "Sunday Celebration 10:30 AM"
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

  const assignedCountByDisciple = {};
  rosterState.assignments.forEach(a => {
    if (a.disciple_id) {
      assignedCountByDisciple[a.disciple_id] = (assignedCountByDisciple[a.disciple_id] || 0) + 1;
    }
  });

  const deptCards = rosterState.departments.map(dept => {
    const deptRoles = rosterState.roles.filter(r => roleMatchesDept(r, dept));
    if (deptRoles.length === 0) return "";

    const filledCount = deptRoles.filter(r => {
      const rName = r.role_name || r.name;
      return rosterState.assignments.some(
        a => (a.role_id === r.id || a.role_name === rName) && a.disciple_id
      );
    }).length;

    const rowsHtml = deptRoles.map(role => {
      const rName = role.role_name || role.name || "Role";
      const current = rosterState.assignments.find(
        a => a.role_id === role.id || a.role_name === rName
      );
      const selectedId = current?.disciple_id || "";
      const isVocalTeam = ["Worship Leader", "Singer 1", "Singer 2", "Singer 3"].includes(rName);

      const optionsHtml = rosterState.disciples.map(d => {
        const unavail = isDiscipleUnavailable(d.id, rosterState.selectedDate);
        const djOk = meetsMinDj(d, role.min_dj_level);
        const count = assignedCountByDisciple[d.id] || 0;
        const flags = [
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

      return `
        <div class="py-2.5 border-b border-slate-100 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          isVocalTeam ? "bg-amber-50/35 -mx-2 px-2 rounded-lg" : ""
        }">
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-900">${rName}</p>
            <p class="text-[11px] text-slate-500">Min DJ: ${role.min_dj_level || "Come"}${role.can_reimburse ? " • Reimbursable" : ""}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <select
              onchange="window.assignRosterSlot('${role.id}', this.value)"
              class="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium bg-white max-w-[210px]"
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
        <div class="flex items-center justify-between border-b border-slate-200 pb-2">
          <h3 class="font-bold text-xs uppercase tracking-wider text-slate-800">${dept.name}</h3>
          <span class="text-xs font-bold text-slate-600">${filledCount}/${deptRoles.length} filled</span>
        </div>
        <div>${rowsHtml}</div>
      </div>
    `;
  }).filter(Boolean).join("");

  board.innerHTML = deptCards || `<div class="p-6 bg-white rounded-xl border text-center text-xs text-slate-500 col-span-full">Click "Seed Master Data" first to initialize departments and roles.</div>`;
}

function renderConflicts() {
  const banner = document.getElementById("roster-conflict-banner");
  if (!banner) return;

  const warnings = [];
  const byDisciple = {};

  rosterState.assignments.forEach(a => {
    if (!a.disciple_id) return;
    byDisciple[a.disciple_id] = byDisciple[a.disciple_id] || [];
    byDisciple[a.disciple_id].push(a.role_name);

    const unavail = isDiscipleUnavailable(a.disciple_id, rosterState.selectedDate);
    if (unavail) {
      warnings.push(`🚫 <strong>${a.disciple_name}</strong> is marked unavailable for <strong>${roleNameOr(a.role_name)}</strong>${unavail.reason ? ` (${unavail.reason})` : ""}.`);
    }

    const role = rosterState.roles.find(r => r.id === a.role_id || (r.role_name || r.name) === a.role_name);
    const disciple = rosterState.disciples.find(d => d.id === a.disciple_id);
    if (role && disciple && !meetsMinDj(disciple, role.min_dj_level)) {
      const rName = role.role_name || role.name;
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
    `⏰ *Time:* Sunday 10:30 AM`,
    ``
  ].filter(Boolean);

  rosterState.departments.forEach(dept => {
    const deptRoles = rosterState.roles.filter(r => roleMatchesDept(r, dept));
    if (deptRoles.length === 0) return;

    lines.push(`*${dept.name}*`);
    deptRoles.forEach(role => {
      const rName = role.role_name || role.name || "Role";
      const assigned = rosterState.assignments.find(
        a => a.role_id === role.id || a.role_name === rName
      );
      const person = assigned?.disciple_name || "_Unassigned_";
      lines.push(`• ${rName}: ${person}`);
    });
    lines.push(``);
  });

  return lines.join("\n").trim();
}

function bindRosterEvents() {
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

window.assignRosterSlot = async (roleId, discipleId) => {
  const role = rosterState.roles.find(r => r.id === roleId);
  if (!role || !rosterState.selectedDate) return;

  const rName = role.role_name || role.name || "Role";
  const existing = rosterState.assignments.find(
    a => a.role_id === role.id || a.role_name === rName
  );

  if (!discipleId) {
    if (existing?.id) {
      await deleteAssignment(existing.id);
    }
  } else {
    const disciple = rosterState.disciples.find(d => d.id === discipleId);
    if (!disciple) return;
    await upsertAssignment(existing?.id || null, {
      service_date: rosterState.selectedDate,
      dept_id: role.department_id || role.dept_id || "",
      dept_name: role.dept_name || "",
      role_id: role.id,
      role_name: rName,
      disciple_id: disciple.id,
      disciple_name: disciple.full_name,
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
