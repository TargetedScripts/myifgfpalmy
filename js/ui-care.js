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
  newcomers: [],
  eventsBound: false
};

function getAucklandTodayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function resolveDiscipleDJStages(d) {
  if (d.dj_stages && typeof d.dj_stages === "object") {
    return {
      come: Boolean(d.dj_stages.come),
      grow: Boolean(d.dj_stages.grow),
      serve: Boolean(d.dj_stages.serve),
      lead: Boolean(d.dj_stages.lead)
    };
  }
  if (d.dj_progress && typeof d.dj_progress === "object") {
    const isDone = (val) => String(val || "").trim().toLowerCase() === "completed";
    return {
      come: isDone(d.dj_progress.come),
      grow: isDone(d.dj_progress.grow),
      serve: isDone(d.dj_progress.serve),
      lead: isDone(d.dj_progress.lead)
    };
  }
  const light = (d.dj_traffic_light || "red").toLowerCase();
  return {
    come: light === "green" || light === "amber",
    grow: light === "green",
    serve: light === "green",
    lead: light === "green"
  };
}

export async function initCareModule() {
  ensureICareMemberSelectUI();
  bindCareEvents();
  await loadCareBaseData();
}

async function loadCareBaseData() {
  const [disciples, insights, services, icareGroups, newcomers] = await Promise.all([
    getDisciples(),
    getWeeklyInsights(),
    getSundayServices().catch(() => []),
    getICareGroups(),
    getNewcomers()
  ]);

  careState.disciples = disciples.filter(d => (d.status || "Active") === "Active");
  careState.insights = insights;
  careState.services = services;
  careState.icareGroups = icareGroups;
  careState.newcomers = newcomers;

  populateCareServiceSelector();
  populateICareFormSelects();
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
    if (w.service_date) dateMap.set(w.service_date, `${w.service_date} — ${w.title}`);
  });
  careState.services.forEach(s => {
    if (s.service_date && !dateMap.has(s.service_date)) {
      dateMap.set(s.service_date, `${s.service_date} — ${s.title}`);
    }
  });

  const todayISO = getAucklandTodayISO();
  if (!dateMap.has(todayISO)) {
    dateMap.set(todayISO, `${todayISO} — Today / Current Service`);
  }

  const sorted = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  sel.innerHTML = sorted.map(([dt, label]) => `<option value="${dt}">${label}</option>`).join("");

  if (!careState.selectedDate || !dateMap.has(careState.selectedDate)) {
    const upcoming = sorted.find(([dt]) => dt >= todayISO);
    careState.selectedDate = (upcoming || sorted[sorted.length - 1])[0];
  }
  sel.value = careState.selectedDate;
}

// --- 1. SUNDAY ATTENDANCE ---
async function loadAttendanceForDate() {
  if (!careState.selectedDate) return;
  careState.attendance = await getSundayAttendance(careState.selectedDate);

  const visEl = document.getElementById("att-visitors");
  const kidsEl = document.getElementById("att-kids");
  const notesEl = document.getElementById("att-notes");
  if (visEl) visEl.value = careState.attendance.visitors_count || 0;
  if (kidsEl) kidsEl.value = careState.attendance.kids_count || 0;
  if (notesEl) notesEl.value = careState.attendance.notes || "";

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
    (d.full_name || "").toLowerCase().includes(keyword) ||
    (d.nick_name || "").toLowerCase().includes(keyword)
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
          <p class="text-xs font-bold">${d.full_name}${d.nick_name ? ` (${d.nick_name})` : ""}</p>
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
    (d.full_name || "").toLowerCase().includes(keyword) ||
    (d.nick_name || "").toLowerCase().includes(keyword)
  );

  tbody.innerHTML = filtered.map(d => {
    const stages = resolveDiscipleDJStages(d);
    const light = (d.dj_traffic_light || "red").toLowerCase();

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
          <p class="font-bold text-xs text-slate-900">${d.full_name}${d.nick_name ? ` (${d.nick_name})` : ""}</p>
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

  const currentStages = resolveDiscipleDJStages(disciple);
  const updatedStages = { ...currentStages, [stageKey]: isChecked };
  const res = await updateDiscipleDJStages(discipleId, updatedStages, disciple.dj_progress || {});

  disciple.dj_stages = res.djStages;
  disciple.dj_progress = res.djProgress;
  disciple.dj_traffic_light = res.trafficLight;
  renderDJMatrix();
};

// --- 3. ICARE GROUPS (LINKED TO DISCIPLES) ---
function ensureICareMemberSelectUI() {
  const form = document.getElementById("form-icare");
  if (!form || document.getElementById("icare-members-wrapper")) return;

  const hiddenId = document.createElement("input");
  hiddenId.type = "hidden";
  hiddenId.id = "icare-edit-id";
  form.prepend(hiddenId);

  const wrapper = document.createElement("div");
  wrapper.id = "icare-members-wrapper";
  wrapper.className = "space-y-1.5 pt-1";
  wrapper.innerHTML = `
    <label class="block text-xs font-semibold text-slate-700">iCare Members (Syncs to Disciples)</label>
    <div id="icare-members-checklist" class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"></div>
  `;

  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) {
    form.insertBefore(wrapper, submitBtn);
  } else {
    form.appendChild(wrapper);
  }
}

function populateICareFormSelects(selectedMemberIds = []) {
  const box = document.getElementById("icare-members-checklist");
  if (!box) return;

  const selectedSet = new Set(selectedMemberIds);
  box.innerHTML = careState.disciples.map(d => `
    <label class="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded cursor-pointer hover:border-slate-400">
      <input type="checkbox" name="icare-member-cb" value="${d.id}" ${selectedSet.has(d.id) ? "checked" : ""} class="rounded border-slate-300" />
      <span class="truncate">${d.full_name}</span>
    </label>
  `).join("");
}

async function syncDisciplesICareMembership(groupName, memberIds = []) {
  const memberSet = new Set(memberIds);
  for (const d of careState.disciples) {
    const isMember = memberSet.has(d.id);
    const currentVal = (d.in_icare || "").trim();
    if (isMember && currentVal !== groupName) {
      await saveDisciple(d.id, { in_icare: groupName });
      d.in_icare = groupName;
    } else if (!isMember && currentVal === groupName) {
      await saveDisciple(d.id, { in_icare: "No" });
      d.in_icare = "No";
    }
  }
}

function renderICareGroups() {
  const container = document.getElementById("list-icare-groups");
  if (!container) return;

  const unassignedDisciples = careState.disciples.filter(d => {
    const val = (d.in_icare || "").trim().toLowerCase();
    return !val || val === "no" || val === "belum" || val === "-";
  });

  const unassignedBanner = `
    <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
      <strong>Belum tergabung iCare (${unassignedDisciples.length}/${careState.disciples.length}):</strong>
      ${unassignedDisciples.length > 0 ? unassignedDisciples.map(d => d.full_name).join(", ") : "Semua jemaat aktif sudah terhubung dengan iCare."}
    </div>
  `;

  if (careState.icareGroups.length === 0) {
    container.innerHTML = `${unassignedBanner}<div class="p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-500">No iCare groups created yet. Add your first Palmerston North iCare cell group using the form.</div>`;
    return;
  }

  const groupsHtml = careState.icareGroups.map(g => {
    const memberIds = Array.isArray(g.member_ids) ? g.member_ids : [];
    const memberNames = memberIds
      .map(id => careState.disciples.find(d => d.id === id)?.full_name)
      .filter(Boolean);

    return `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h4 class="font-bold text-sm text-slate-900">${g.name}</h4>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">${memberNames.length} members</span>
          </div>
          <p class="text-xs text-slate-600">👤 Leader: <strong>${g.leader_name || "TBA"}</strong></p>
          <p class="text-xs text-slate-500">🕒 ${g.schedule || "Weekly"} • 📍 ${g.location || "Palmerston North"}</p>
          ${memberNames.length > 0 ? `<p class="text-[11px] text-slate-600 pt-0.5">👥 ${memberNames.join(", ")}</p>` : ""}
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button type="button" onclick="window.editICareGroup('${g.id}')" class="text-xs text-blue-600 hover:underline font-semibold">Edit</button>
          <button type="button" onclick="window.removeICareGroup('${g.id}')" class="text-xs text-red-600 hover:underline font-semibold">Delete</button>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = `${unassignedBanner}${groupsHtml}`;
}

window.editICareGroup = (id) => {
  const g = careState.icareGroups.find(x => x.id === id);
  if (!g) return;
  const editEl = document.getElementById("icare-edit-id");
  if (editEl) editEl.value = g.id;
  document.getElementById("icare-name").value = g.name || "";
  document.getElementById("icare-leader").value = g.leader_name || "";
  document.getElementById("icare-schedule").value = g.schedule || "";
  document.getElementById("icare-location").value = g.location || "";
  populateICareFormSelects(g.member_ids || []);
};

window.removeICareGroup = async (id) => {
  const g = careState.icareGroups.find(x => x.id === id);
  if (!confirm("Delete this iCare group?")) return;
  await deleteICareGroup(id);
  if (g?.name) {
    await syncDisciplesICareMembership(g.name, []);
  }
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

  container.innerHTML = careState.newcomers.map(n => {
    const alreadyConverted = n.followup_status === "Converted to Disciple";
    return `
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
            <option value="Converted to Disciple" ${alreadyConverted ? "selected" : ""}>Converted</option>
          </select>
          <button
            type="button"
            onclick="window.promoteNewcomerToDisciple('${n.id}')"
            ${alreadyConverted ? "disabled" : ""}
            class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 text-white text-[11px] font-bold rounded-lg"
          >
            ${alreadyConverted ? "✓ Converted" : "+ Disciple"}
          </button>
          <button type="button" onclick="window.removeNewcomer('${n.id}')" class="text-xs text-red-600 hover:underline font-semibold">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

window.changeNewcomerStatus = async (id, status) => {
  await updateNewcomerStatus(id, status);
  careState.newcomers = await getNewcomers();
  renderNewcomers();
};

window.removeNewcomer = async (id) => {
  if (!confirm("Delete this visitor record?")) return;
  await deleteNewcomer(id);
  careState.newcomers = await getNewcomers();
  renderNewcomers();
};

window.promoteNewcomerToDisciple = async (id) => {
  const n = careState.newcomers.find(x => x.id === id);
  if (!n) return;
  if (!confirm(`Promote "${n.full_name}" into the main Disciples directory?`)) return;

  await saveDisciple(null, {
    full_name: n.full_name,
    email: (n.email || "").trim().toLowerCase(),
    phone: n.phone || "",
    status: "Active",
    system_role: "member",
    dj_traffic_light: "red",
    dj_stages: { come: false, grow: false, serve: false, lead: false },
    dj_progress: {
      come: "Not Started",
      grow: "Not Started",
      serve: "Not Started",
      lead: "Not Started"
    },
    in_icare: "No",
    ministry_interests: [],
    pastoral_notes: `Joined from iCorner (${n.visit_date}). ${n.notes || ""}`
  });
  await updateNewcomerStatus(id, "Converted to Disciple");
  await loadCareBaseData();
  alert(`${n.full_name} has been added to Disciples!`);
};

// --- EVENTS ---
function bindCareEvents() {
  if (careState.eventsBound) return;
  careState.eventsBound = true;

  document.querySelector('.tab-btn[data-tab="care"]')?.addEventListener("click", async () => {
    await loadCareBaseData();
  });

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
    const editId = document.getElementById("icare-edit-id")?.value.trim() || null;
    const name = document.getElementById("icare-name").value.trim();
    const leaderName = document.getElementById("icare-leader").value.trim();
    const schedule = document.getElementById("icare-schedule").value.trim();
    const location = document.getElementById("icare-location").value.trim();
    const memberIds = Array.from(
      document.querySelectorAll('input[name="icare-member-cb"]:checked')
    ).map(cb => cb.value);

    if (!name) return;

    await saveICareGroup({
      id: editId,
      name,
      leader_name: leaderName,
      schedule,
      location,
      member_ids: memberIds
    });

    await syncDisciplesICareMembership(name, memberIds);

    e.target.reset();
    const editEl = document.getElementById("icare-edit-id");
    if (editEl) editEl.value = "";
    populateICareFormSelects([]);
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
