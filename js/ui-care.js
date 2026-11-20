// js/ui-care.js
import { getDisciples, saveDisciple } from "./db-master.js";
import { getWeeklyInsights } from "./db-content.js";
import { getSundayServices } from "./db-roster.js";
import {
  getSundayAttendance,
  saveSundayAttendance,
  updateDiscipleDJStages,
  getICareGroups,
  saveICareGroup,
  deleteICareGroup,
  getNewcomers,
  addNewcomer,
  updateNewcomerStatus,
  deleteNewcomer
} from "./db-care.js";

let careState = {
  disciples: [],
  insights: [],
  services: [],
  selectedDate: "",
  attendance: { present_ids: [], visitors_count: 0, kids_count: 0, notes: "" },
  icareGroups: [],
  newcomers: []
};

export async function initCareModule() {
  bindCareEvents();
  await loadCareBaseData();
}

async function loadCareBaseData() {
  const [disciples, insights, services, icareGroups, newcomers] = await Promise.all([
    getDisciples(),
    getWeeklyInsights(),
    getSundayServices(),
    getICareGroups(),
    getNewcomers()
  ]);

  careState.disciples = disciples.filter(d => d.status === "Active");
  careState.insights = insights;
  careState.services = services;
  careState.icareGroups = icareGroups;
  careState.newcomers = newcomers;

  populateCareServiceSelector();
  await loadAttendanceForDate();
  renderDJMatrix();
  renderICareGroups();
  renderNewcomers();
}

function populateCareServiceSelector() {
  const sel = document.getElementById("care-service-select");
  if (!sel) return;

  const dateMap = new Map();
  careState.insights.forEach(w => {
    dateMap.set(w.service_date, `${w.service_date} — ${w.title}`);
  });
  careState.services.forEach(s => {
    if (!dateMap.has(s.service_date)) {
      dateMap.set(s.service_date, `${s.service_date} — ${s.title}`);
    }
  });

  const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (sorted.length === 0) {
    sel.innerHTML = `<option value="">No service dates found</option>`;
    return;
  }

  sel.innerHTML = sorted.map(([dt, label]) => `<option value="${dt}">${label}</option>`).join("");
  if (!careState.selectedDate || !dateMap.has(careState.selectedDate)) {
    careState.selectedDate = sorted[0][0];
  }
  sel.value = careState.selectedDate;
}

// --- 1. SUNDAY ATTENDANCE ---
async function loadAttendanceForDate() {
  if (!careState.selectedDate) return;
  careState.attendance = await getSundayAttendance(careState.selectedDate);

  document.getElementById("att-visitors").value = careState.attendance.visitors_count || 0;
  document.getElementById("att-kids").value = careState.attendance.kids_count || 0;
  document.getElementById("att-notes").value = careState.attendance.notes || "";

  renderAttendanceChecklist();
}

function renderAttendanceChecklist() {
  const container = document.getElementById("att-checklist");
  const summaryEl = document.getElementById("att-summary-badge");
  if (!container) return;

  const keyword = (document.getElementById("att-search")?.value || "").toLowerCase().trim();
  const presentSet = new Set(careState.attendance.present_ids || []);

  const visitors = Number(document.getElementById("att-visitors")?.value || 0);
  const kids = Number(document.getElementById("att-kids")?.value || 0);
  const totalHeadcount = presentSet.size + visitors + kids;

  if (summaryEl) {
    summaryEl.textContent = `Members: ${presentSet.size}/${careState.disciples.length} • Visitors: ${visitors} • Kids: ${kids} • Total: ${totalHeadcount}`;
  }

  const filtered = careState.disciples.filter(d =>
    (d.full_name || "").toLowerCase().includes(keyword)
  );

  container.innerHTML = filtered.map(d => {
    const isPresent = presentSet.has(d.id);
    return `
      <button type="button" onclick="window.toggleDiscipleAttendance('${d.id}')"
        class="p-3 rounded-xl border text-left transition flex items-center justify-between ${
          isPresent
            ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold"
            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
        }">
        <div>
          <p class="text-xs font-bold">${d.full_name}</p>
          <p class="text-[10px] text-slate-500">${d.member_id || ""}</p>
        </div>
        <span class="text-xs px-2 py-0.5 rounded-full font-bold ${
          isPresent ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
        }">
          ${isPresent ? "✓ Present" : "Check-in"}
        </span>
      </button>
    `;
  }).join("");
}

window.toggleDiscipleAttendance = (discipleId) => {
  const set = new Set(careState.attendance.present_ids || []);
  if (set.has(discipleId)) {
    set.delete(discipleId);
  } else {
    set.add(discipleId);
  }
  careState.attendance.present_ids = Array.from(set);
  renderAttendanceChecklist();
};

// --- 2. DJ PROGRESS MATRIX ---
function renderDJMatrix() {
  const tbody = document.getElementById("tbody-dj-matrix");
  if (!tbody) return;

  const keyword = (document.getElementById("dj-search")?.value || "").toLowerCase().trim();
  const filtered = careState.disciples.filter(d =>
    (d.full_name || "").toLowerCase().includes(keyword)
  );

  tbody.innerHTML = filtered.map(d => {
    const stages = d.dj_stages || {
      come: d.dj_traffic_light === "green" || d.dj_traffic_light === "amber",
      grow: d.dj_traffic_light === "green",
      serve: d.dj_traffic_light === "green",
      lead: d.dj_traffic_light === "green"
    };

    const light = d.dj_traffic_light || "red";
    const badge =
      light === "green"
        ? `<span class="badge-green px-2 py-0.5 rounded-full text-[11px] font-bold">🟢 Completed</span>`
        : light === "amber"
        ? `<span class="badge-amber px-2 py-0.5 rounded-full text-[11px] font-bold">🟠 In Progress</span>`
        : `<span class="badge-red px-2 py-0.5 rounded-full text-[11px] font-bold">🔴 Not Started</span>`;

    const renderCheck = (stageKey) => `
      <input type="checkbox" ${stages[stageKey] ? "checked" : ""}
        onchange="window.toggleDJStage('${d.id}', '${stageKey}', this.checked)"
        class="w-4 h-4 accent-emerald-600 cursor-pointer" />
    `;

    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="p-3">
          <p class="font-bold text-xs text-slate-900">${d.full_name}</p>
          <p class="text-[10px] text-slate-500">${d.member_id || ""}</p>
        </td>
        <td class="p-3 text-center">${renderCheck("come")}</td>
        <td class="p-3 text-center">${renderCheck("grow")}</td>
        <td class="p-3 text-center">${renderCheck("serve")}</td>
        <td class="p-3 text-center">${renderCheck("lead")}</td>
        <td class="p-3 text-right">${badge}</td>
      </tr>
    `;
  }).join("");
}

window.toggleDJStage = async (discipleId, stageKey, isChecked) => {
  const disciple = careState.disciples.find(d => d.id === discipleId);
  if (!disciple) return;

  const currentStages = disciple.dj_stages || {
    come: disciple.dj_traffic_light === "green" || disciple.dj_traffic_light === "amber",
    grow: disciple.dj_traffic_light === "green",
    serve: disciple.dj_traffic_light === "green",
    lead: disciple.dj_traffic_light === "green"
  };

  const updatedStages = { ...currentStages, [stageKey]: isChecked };
  const newLight = await updateDiscipleDJStages(discipleId, updatedStages);

  disciple.dj_stages = updatedStages;
  disciple.dj_traffic_light = newLight;
  renderDJMatrix();
};

// --- 3. ICARE GROUPS ---
function renderICareGroups() {
  const container = document.getElementById("list-icare-groups");
  if (!container) return;

  if (careState.icareGroups.length === 0) {
    container.innerHTML = `<div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">No iCare groups created yet. Add your first Palmerston North iCare cell group using the form.</div>`;
    return;
  }

  container.innerHTML = careState.icareGroups.map(g => `
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="space-y-1">
        <h4 class="font-bold text-sm text-slate-900">${g.name}</h4>
        <p class="text-xs text-slate-600">👤 Leader: <strong>${g.leader_name || "TBA"}</strong></p>
        <p class="text-xs text-slate-500">🕒 ${g.schedule || "Weekly"} • 📍 ${g.location || "Palmerston North"}</p>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-center">
        <button onclick="window.removeICareGroup('${g.id}')" class="text-xs text-red-600 hover:underline font-semibold">Delete</button>
      </div>
    </div>
  `).join("");
}

window.removeICareGroup = async (id) => {
  if (!confirm("Delete this iCare group?")) return;
  await deleteICareGroup(id);
  careState.icareGroups = await getICareGroups();
  renderICareGroups();
};

// --- 4. NEWCOMERS / ICORNER ---
function renderNewcomers() {
  const container = document.getElementById("list-newcomers");
  if (!container) return;

  if (careState.newcomers.length === 0) {
    container.innerHTML = `<div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">No newcomers recorded yet. Log Sunday first-time visitors here for iCorner follow-up.</div>`;
    return;
  }

  container.innerHTML = careState.newcomers.map(n => `
    <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-mono text-[11px] px-2 py-0.5 bg-slate-100 rounded font-bold">${n.visit_date}</span>
          <h4 class="font-bold text-sm text-slate-900">${n.full_name}</h4>
          <span class="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">${n.category}</span>
        </div>
        <p class="text-xs text-slate-500 mt-1">${n.phone || "No phone"} • ${n.email || "No email"} ${n.notes ? `• "${n.notes}"` : ""}</p>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-center">
        <select onchange="window.changeNewcomerStatus('${n.id}', this.value)" class="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-semibold">
          <option value="New Visitor" ${n.followup_status === "New Visitor" ? "selected" : ""}>New Visitor</option>
          <option value="Contacted" ${n.followup_status === "Contacted" ? "selected" : ""}>Contacted</option>
          <option value="Joined iCare" ${n.followup_status === "Joined iCare" ? "selected" : ""}>Joined iCare</option>
          <option value="Converted to Disciple" ${n.followup_status === "Converted to Disciple" ? "selected" : ""}>Converted</option>
        </select>
        <button onclick="window.promoteNewcomerToDisciple('${n.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg">
          + Disciple
        </button>
      </div>
    </div>
  `).join("");
}

window.changeNewcomerStatus = async (id, status) => {
  await updateNewcomerStatus(id, status);
  careState.newcomers = await getNewcomers();
  renderNewcomers();
};

window.promoteNewcomerToDisciple = async (id) => {
  const n = careState.newcomers.find(x => x.id === id);
  if (!n) return;
  if (!confirm(`Promote "${n.full_name}" into the main Disciples directory?`)) return;

  await saveDisciple({
    full_name: n.full_name,
    email: n.email || "",
    phone: n.phone || "",
    status: "Active",
    system_role: "member",
    dj_traffic_light: "red",
    notes: `Joined from iCorner (${n.visit_date}). ${n.notes || ""}`
  });
  await updateNewcomerStatus(id, "Converted to Disciple");
  await loadCareBaseData();
  alert(`${n.full_name} has been added to Disciples!`);
};

// --- EVENTS ---
function bindCareEvents() {
  document.querySelectorAll(".care-subtab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".care-subtab").forEach(b => {
        b.classList.remove("bg-slate-900", "text-white");
        b.classList.add("bg-slate-100", "text-slate-700");
      });
      btn.classList.remove("bg-slate-100", "text-slate-700");
      btn.classList.add("bg-slate-900", "text-white");

      document.querySelectorAll(".care-subpanel").forEach(p => p.classList.add("hidden"));
      document.getElementById(`care-sub-${btn.dataset.subtab}`)?.classList.remove("hidden");
    });
  });

  document.getElementById("care-service-select")?.addEventListener("change", async (e) => {
    careState.selectedDate = e.target.value;
    await loadAttendanceForDate();
  });

  document.getElementById("att-search")?.addEventListener("input", renderAttendanceChecklist);
  document.getElementById("att-visitors")?.addEventListener("input", renderAttendanceChecklist);
  document.getElementById("att-kids")?.addEventListener("input", renderAttendanceChecklist);

  document.getElementById("btn-save-attendance")?.addEventListener("click", async () => {
    if (!careState.selectedDate) return;
    await saveSundayAttendance(careState.selectedDate, {
      present_ids: careState.attendance.present_ids || [],
      visitors_count: document.getElementById("att-visitors").value,
      kids_count: document.getElementById("att-kids").value,
      notes: document.getElementById("att-notes").value.trim()
    });
    alert(`Sunday Attendance for ${careState.selectedDate} saved!`);
  });

  document.getElementById("dj-search")?.addEventListener("input", renderDJMatrix);

  document.getElementById("form-icare")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveICareGroup({
      name: document.getElementById("icare-name").value.trim(),
      leader_name: document.getElementById("icare-leader").value.trim(),
      schedule: document.getElementById("icare-schedule").value.trim(),
      location: document.getElementById("icare-location").value.trim()
    });
    e.target.reset();
    careState.icareGroups = await getICareGroups();
    renderICareGroups();
  });

  document.getElementById("form-newcomer")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addNewcomer({
      visit_date: document.getElementById("new-date").value,
      full_name: document.getElementById("new-name").value.trim(),
      phone: document.getElementById("new-phone").value.trim(),
      email: document.getElementById("new-email").value.trim(),
      category: document.getElementById("new-category").value,
      notes: document.getElementById("new-notes").value.trim()
    });
    e.target.reset();
    careState.newcomers = await getNewcomers();
    renderNewcomers();
  });
}
