// js/ui-roster.js
import { getDepartments, getRolesReference, getDisciples } from "./db-master.js";
import { getWeeklyInsights } from "./db-content.js";
import {
  getSundayServices,
  ensureServiceRecord,
  getAssignmentsByDate,
  saveAssignment,
  updateAssignmentStatus,
  removeAssignment,
  getUnavailabilityList,
  addUnavailability,
  deleteUnavailability
} from "./db-roster.js";

let rosterState = {
  departments: [],
  roles: [],
  disciples: [],
  insights: [],
  services: [],
  selectedDate: "",
  assignments: [],
  unavailability: []
};

const DEPT_INTEREST_KEYWORDS = {
  pulpit_editorial: ["preach", "mc", "editorial", "pulpit"],
  praise_worship: ["worship", "wl", "singer", "musician"],
  creative_production: ["multimedia", "sound", "creative", "media", "photo", "design"],
  kitchen_catering: ["coffee", "catering", "kitchen", "hospitality"],
  usher_facility: ["usher", "hospitality", "welcome", "facility"],
  dj_class: ["dj", "discipleship", "kids", "sunday school"],
  icare: ["icare", "connect"],
  icorner_missions: ["icorner", "mission", "outreach"]
};

export async function initRosterEngine() {
  bindRosterEvents();
  await loadRosterBaseData();
}

async function loadRosterBaseData() {
  const [depts, roles, disciples, insights, services, unavail] = await Promise.all([
    getDepartments(),
    getRolesReference(),
    getDisciples(),
    getWeeklyInsights(),
    getSundayServices(),
    getUnavailabilityList()
  ]);

  rosterState.departments = depts.filter(d => d.is_active);
  rosterState.roles = roles.filter(r => r.is_active);
  rosterState.disciples = disciples.filter(d => d.status === "Active");
  rosterState.insights = insights;
  rosterState.services = services;
  rosterState.unavailability = unavail;

  populateServiceDateSelector();
  populateUnavailSelectors();
  renderUnavailabilityList();

  if (rosterState.selectedDate) {
    await loadAssignmentsForSelectedDate();
  }
}

function populateServiceDateSelector() {
  const sel = document.getElementById("roster-service-select");
  if (!sel) return;

  const dateMap = new Map();
  rosterState.insights.forEach(w => {
    dateMap.set(w.service_date, {
      date: w.service_date,
      title: w.title,
      key_verse: w.key_verse,
      label: `${w.service_date} — ${w.title} (${w.week_label || "Sunday"})`
    });
  });
  rosterState.services.forEach(s => {
    if (!dateMap.has(s.service_date)) {
      dateMap.set(s.service_date, {
        date: s.service_date,
        title: s.title,
        key_verse: s.key_verse || "",
        label: `${s.service_date} — ${s.title}`
      });
    }
  });

  const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    sel.innerHTML = `<option value="">No service dates yet — add custom date or seed 2027 curriculum</option>`;
    return;
  }

  sel.innerHTML = sorted.map(item => `<option value="${item.date}">${item.label}</option>`).join("");
  if (!rosterState.selectedDate || !dateMap.has(rosterState.selectedDate)) {
    rosterState.selectedDate = sorted[0].date;
  }
  sel.value = rosterState.selectedDate;
}

async function loadAssignmentsForSelectedDate() {
  const date = rosterState.selectedDate;
  if (!date) return;

  const insight = rosterState.insights.find(w => w.service_date === date);
  const customSvc = rosterState.services.find(s => s.service_date === date);
  const title = insight?.title || customSvc?.title || "Sunday Celebration Service";
  const verse = insight?.key_verse || customSvc?.key_verse || "";

  document.getElementById("roster-theme-title").textContent = title;
  document.getElementById("roster-theme-meta").textContent =
    `${date} • 10:30 AM (Pacific/Auckland)` + (verse ? ` • 🔑 ${verse}` : "");

  rosterState.assignments = await getAssignmentsByDate(date);
  renderConflictBanner();
  renderRosterBoard();
}

function isDateWithinBlockout(u, targetDate) {
  const start = u.start_date || u.unavailable_date || "";
  const end = u.end_date || u.unavailable_date || start;
  return start <= targetDate && targetDate <= end;
}

function renderConflictBanner() {
  const banner = document.getElementById("roster-conflict-banner");
  if (!banner) return;

  const warnings = [];
  const counts = {};

  rosterState.assignments.forEach(a => {
    counts[a.disciple_id] = counts[a.disciple_id] || [];
    counts[a.disciple_id].push(a.role_name);

    const isBlocked = rosterState.unavailability.some(
      u => u.disciple_id === a.disciple_id && isDateWithinBlockout(u, rosterState.selectedDate)
    );
    if (isBlocked) {
      warnings.push(`⚠️ <strong>${a.disciple_name}</strong> (${a.role_name}) marked UNAVAILABLE on ${rosterState.selectedDate}.`);
    }
  });

  Object.entries(counts).forEach(([discipleId, roleList]) => {
    if (roleList.length > 1) {
      const person = rosterState.assignments.find(x => x.disciple_id === discipleId)?.disciple_name;
      warnings.push(`🔁 Double-booked: <strong>${person}</strong> assigned to ${roleList.join(" + ")}.`);
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

function isDiscipleInterestedInDept(disciple, deptId) {
  const keywords = DEPT_INTEREST_KEYWORDS[deptId] || [];
  const interests = (disciple.ministry_interests || []).join(" ").toLowerCase();
  return keywords.some(kw => interests.includes(kw));
}

function renderRosterBoard() {
  const board = document.getElementById("roster-board");
  if (!board) return;

  if (rosterState.departments.length === 0 || rosterState.roles.length === 0) {
    board.innerHTML = `<div class="p-6 bg-white rounded-xl border text-center text-slate-500">Please click "⚡ Seed Depts & Roles" first to load ministry roles.</div>`;
    return;
  }

  const assignByRole = Object.fromEntries(rosterState.assignments.map(a => [a.role_id, a]));
  const blockedIds = new Set(
    rosterState.unavailability
      .filter(u => isDateWithinBlockout(u, rosterState.selectedDate))
      .map(u => u.disciple_id)
  );

  board.innerHTML = rosterState.departments.map(dept => {
    const deptRoles = rosterState.roles.filter(r => r.department_id === dept.id);
    if (deptRoles.length === 0) return "";

    const rowsHtml = deptRoles.map(role => {
      const assigned = assignByRole[role.id];
      const recommended = rosterState.disciples.filter(d => isDiscipleInterestedInDept(d, dept.id));
      const others = rosterState.disciples.filter(d => !isDiscipleInterestedInDept(d, dept.id));

      const buildOption = (d, isRec) => {
        const blockedTag = blockedIds.has(d.id) ? " [UNAVAILABLE]" : "";
        const djTag = d.dj_traffic_light === "green" ? "🟢" : d.dj_traffic_light === "amber" ? "🟠" : "🔴";
        const starTag = isRec ? "⭐ " : "";
        return `<option value="${d.id}" ${assigned?.disciple_id === d.id ? "selected" : ""}>${starTag}${djTag} ${d.full_name}${blockedTag}</option>`;
      };

      const optionsHtml = `
        <option value="">— Unassigned —</option>
        ${recommended.length > 0 ? `<optgroup label="⭐ Matching Ministry Interest">${recommended.map(d => buildOption(d, true)).join("")}</optgroup>` : ""}
        <optgroup label="All Active Disciples">${others.map(d => buildOption(d, false)).join("")}</optgroup>
      `;

      const statusBadge = assigned
        ? `<select onchange="window.changeRosterStatus('${assigned.id}', this.value)" class="text-[11px] font-semibold px-2 py-1 rounded border ${
            assigned.status === "Confirmed"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : assigned.status === "Declined"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }">
            <option value="Assigned" ${assigned.status === "Assigned" ? "selected" : ""}>Assigned</option>
            <option value="Confirmed" ${assigned.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="Declined" ${assigned.status === "Declined" ? "selected" : ""}>Declined</option>
          </select>`
        : `<span class="text-[11px] text-slate-400">Open slot</span>`;

      return `
        <div class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 last:border-b-0">
          <div class="min-w-[190px]">
            <p class="text-xs font-bold text-slate-900">${role.role_name}</p>
            <span class="text-[10px] text-slate-500">Min DJ: ${role.min_dj_level || "Come"}</span>
          </div>
          <div class="flex items-center gap-2 flex-1 sm:justify-end">
            <select onchange="window.assignVolunteer('${role.id}', this.value)" class="w-full sm:w-64 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg">
              ${optionsHtml}
            </select>
            ${statusBadge}
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <h3 class="font-bold text-xs uppercase tracking-wider text-slate-800">${dept.name}</h3>
          <span class="text-[11px] text-slate-500">${deptRoles.filter(r => assignByRole[r.id]).length}/${deptRoles.length} filled</span>
        </div>
        <div>${rowsHtml}</div>
      </div>
    `;
  }).join("");
}

function populateUnavailSelectors() {
  const sel = document.getElementById("unavail-disciple");
  if (!sel) return;
  sel.innerHTML = rosterState.disciples
    .map(d => `<option value="${d.id}">${d.full_name}</option>`)
    .join("");
}

function renderUnavailabilityList() {
  const container = document.getElementById("list-unavailability");
  if (!container) return;
  if (rosterState.unavailability.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500">No volunteer block-out dates recorded.</p>`;
    return;
  }
  container.innerHTML = rosterState.unavailability.map(u => {
    const rangeLabel = !u.end_date || u.start_date === u.end_date
      ? u.start_date
      : `${u.start_date} → ${u.end_date}`;
    return `
      <div class="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
        <div>
          <span class="font-mono font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded">${rangeLabel}</span>
          <strong class="text-slate-900 ml-1.5">${u.disciple_name}</strong>
          ${u.reason ? `<span class="text-slate-500"> — ${u.reason}</span>` : ""}
        </div>
        <button onclick="window.removeUnavail('${u.id}')" class="text-red-600 hover:underline font-medium">Remove</button>
      </div>
    `;
  }).join("");
}

function generateWhatsAppText() {
  const date = rosterState.selectedDate;
  const title = document.getElementById("roster-theme-title")?.textContent || "Sunday Service";
  const meta = document.getElementById("roster-theme-meta")?.textContent || date;

  let lines = [
    `*IFGF PALMERSTON NORTH — SUNDAY ROSTER*`,
    `📅 *${meta}*`,
    `📖 *Tema:* ${title}`,
    `────────────────────`
  ];

  rosterState.departments.forEach(dept => {
    const deptAssigns = rosterState.assignments.filter(a => a.department_id === dept.id && a.status !== "Declined");
    if (deptAssigns.length > 0) {
      lines.push(`\n*${dept.name.toUpperCase()}*`);
      deptAssigns.forEach(a => {
        const tick = a.status === "Confirmed" ? " ✅" : "";
        lines.push(`• ${a.role_name}: *${a.disciple_name}*${tick}`);
      });
    }
  });

  if (rosterState.assignments.length === 0) {
    lines.push(`\n_(Belum ada petugas yang dijadwalkan untuk tanggal ini)_`);
  }

  lines.push(`\n────────────────────`);
  lines.push(`_Mohon konfirmasi kesiapan pelayanan. Tuhan Yesus memberkati!_ 🙏`);
  return lines.join("\n");
}

function bindRosterEvents() {
  document.getElementById("roster-service-select")?.addEventListener("change", async (e) => {
    rosterState.selectedDate = e.target.value;
    await loadAssignmentsForSelectedDate();
  });

  document.getElementById("btn-add-custom-service")?.addEventListener("click", async () => {
    const dateInput = prompt("Enter Service Date (YYYY-MM-DD), e.g. 2026-11-22:");
    if (!dateInput || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) return;
    const titleInput = prompt("Service Theme / Title:", "Sunday Celebration Service") || "Sunday Celebration Service";
    await ensureServiceRecord(dateInput.trim(), { title: titleInput.trim() });
    rosterState.selectedDate = dateInput.trim();
    await loadRosterBaseData();
  });

  document.getElementById("btn-copy-wa-roster")?.addEventListener("click", async () => {
    const text = generateWhatsAppText();
    try {
      await navigator.clipboard.writeText(text);
      alert("WhatsApp Roster copied to clipboard! Ready to paste into IFGF Palmy WhatsApp group.");
    } catch {
      prompt("Copy WhatsApp Roster below:", text);
    }
  });

  document.getElementById("form-unavailability")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const discipleId = document.getElementById("unavail-disciple").value;
    const disciple = rosterState.disciples.find(d => d.id === discipleId);
    const fromDate = document.getElementById("unavail-from").value;
    const toDate = document.getElementById("unavail-to").value || fromDate;
    const reason = document.getElementById("unavail-reason").value.trim();
    if (!disciple || !fromDate) return;

    if (toDate < fromDate) {
      alert("'To Date' cannot be earlier than 'From Date'.");
      return;
    }

    await addUnavailability({
      disciple_id: disciple.id,
      disciple_name: disciple.full_name,
      start_date: fromDate,
      end_date: toDate,
      reason
    });
    e.target.reset();
    await loadRosterBaseData();
  });
}

window.assignVolunteer = async (roleId, discipleId) => {
  const date = rosterState.selectedDate;
  if (!date) return;

  if (!discipleId) {
    await removeAssignment(`${date}__${roleId}`);
    await loadAssignmentsForSelectedDate();
    return;
  }

  const roleObj = rosterState.roles.find(r => r.id === roleId);
  const discipleObj = rosterState.disciples.find(d => d.id === discipleId);
  if (!roleObj || !discipleObj) return;

  const title = document.getElementById("roster-theme-title")?.textContent || "Sunday Service";
  await ensureServiceRecord(date, { title });
  await saveAssignment(date, roleObj, discipleObj, "Assigned");
  await loadAssignmentsForSelectedDate();
};

window.changeRosterStatus = async (assignmentId, newStatus) => {
  await updateAssignmentStatus(assignmentId, newStatus);
  await loadAssignmentsForSelectedDate();
};

window.removeUnavail = async (id) => {
  await deleteUnavailability(id);
  await loadRosterBaseData();
};
