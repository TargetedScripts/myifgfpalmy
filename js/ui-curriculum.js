// js/ui-curriculum.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION_MONTHLY = "monthly_themes";

export const MONTHLY_THEMES_2026 = [
  {
    month_key: "2026-01",
    month_name: "January",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Begin with the end in mind",
    passages: "Gen 1-3",
    scripture: "Gen 3:14-20",
    synopsis: "In the midst of pain and suffering caused by the fall, God's promises for His people still stand. Having the promises as the end in mind will get us aligned in the new journey of 2026.",
    topic: "Resolution",
    notable_events: "New Year, iDeclare, 21 days of prayer and fasting",
    keyword: "Planning, Reflection",
    status: "Published"
  },
  {
    month_key: "2026-02",
    month_name: "February",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "God who restores",
    passages: "Gen 6-9",
    scripture: "Gen 6:9-18",
    synopsis: "God re-established His covenant with Noah and restored the circumstances for Noah to start again. God does not only keep His promise, He restores the circumstances for His people to walk in the promise.",
    topic: "Restoration",
    notable_events: "Chinese New Year",
    keyword: "Restoration",
    status: "Published"
  },
  {
    month_key: "2026-03",
    month_name: "March",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Overcoming pride",
    passages: "Gen 11:1-8",
    scripture: "Gen 11:6-7",
    synopsis: "While God calls His people to be fruitful and fill the earth, they chose to gather and build their own name. Pride is the killer of man's potential to operate in the promise of God.",
    topic: "Humility",
    notable_events: "",
    keyword: "Pride",
    status: "Published"
  },
  {
    month_key: "2026-04",
    month_name: "April",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Something different",
    passages: "Gen 12:1-5",
    scripture: "Gen 12:4-5",
    synopsis: "As God called Abraham to go from his countrymen, he was willing to be separated completely. Living in God's promise calls for a separation from the world.",
    topic: "Separated",
    notable_events: "Good Friday, Easter",
    keyword: "Separated, Holiness",
    status: "Published"
  },
  {
    month_key: "2026-05",
    month_name: "May",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "The fire and the altar",
    passages: "Gen 12:6-8, Gen 13:14-18, Gen 22",
    scripture: "Gen 12:7",
    synopsis: "Whenever God confirms His promises to Abraham, Abraham built an altar of sacrifice. Worship and sacrifices are the evidence of faith towards the promises of God.",
    topic: "Worship and sacrifice",
    notable_events: "Ascension Day, Pentecost, Mother's Day",
    keyword: "Worship, Sacrifice",
    status: "Published"
  },
  {
    month_key: "2026-06",
    month_name: "June",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Building a legacy",
    passages: "Gen 17",
    scripture: "Gen 17:7,9",
    synopsis: "As the God of Abraham, Isaac, and Jacob, God established His promises with Abraham and his generations. The promises are not only to be received, but also to be kept by more than one generation.",
    topic: "Generations",
    notable_events: "Father's Day",
    keyword: "Generations",
    status: "Published"
  },
  {
    month_key: "2026-07",
    month_name: "July",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "In between",
    passages: "Gen 16,18,21",
    scripture: "Gen 16:1-2",
    synopsis: "Conflicts arose when Sarah didn't agree with the waiting season. On the other hand, Abraham stayed active in the waiting season of the promise. The “in between” moments are as important as the promise itself.",
    topic: "Waiting period",
    notable_events: "",
    keyword: "Transitions, Seasons",
    status: "Published"
  },
  {
    month_key: "2026-08",
    month_name: "August",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "A new well",
    passages: "Gen 26",
    scripture: "Gen 26:25",
    synopsis: "With the agreement to the promise of God, Isaac met the providence of God. Worship and faith precedes providence for the promise.",
    topic: "Providence",
    notable_events: "Independence Day",
    keyword: "Providence",
    status: "Published"
  },
  {
    month_key: "2026-09",
    month_name: "September",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Equal unequal",
    passages: "Gen 25,27",
    scripture: "Gen 25:23",
    synopsis: "Esau and Jacob have both similar and unique promises from God. The key to be aligned in the promise is to make peace with both of those types of promises.",
    topic: "Identity",
    notable_events: "",
    keyword: "Identity",
    status: "Published"
  },
  {
    month_key: "2026-10",
    month_name: "October",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Labor and purpose",
    passages: "Gen 30-31",
    scripture: "Gen 31:1-3",
    synopsis: "There are times that God led Jacob to Padan-Aran to be fruitful and there are times that God called Jacob to go back to live in His generational promise. Labor is a means to fulfil the purpose of God.",
    topic: "Purpose",
    notable_events: "",
    keyword: "Mission, Purpose",
    status: "Published"
  },
  {
    month_key: "2026-11",
    month_name: "November",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Dreams and visions",
    passages: "Gen 40-41",
    scripture: "Gen 41:38-39",
    synopsis: "As Joseph became mature, he did not only understand the meaning of the dream, but also the implication of it. The promise of God becomes reality when dreams and visions are accompanied with implications.",
    topic: "Dreaming again",
    notable_events: "",
    keyword: "Dreaming again",
    status: "Published"
  },
  {
    month_key: "2026-12",
    month_name: "December",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Living in abundance",
    passages: "Gen 41:44-57",
    scripture: "Gen 41:50-52",
    synopsis: "The promise is fulfilled not only when Joseph was trouble free but when he was also fruitful in the land of his suffering. Abundance speaks of fruitfulness, not fortunes, which is the promise of God since the very beginning.",
    topic: "Abundance",
    notable_events: "Christmas, End of Year",
    keyword: "Abundance",
    status: "Published"
  }
];

let currState = {
  items: [],
  bound: false
};

function esc(str = "") {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setCurrStatus(msg, isError = false) {
  const el = document.getElementById("curr-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

function resetCurrForm() {
  document.getElementById("curr-form-title").textContent = "➕ Add / Edit Monthly Theme";
  ["curr-month-key", "curr-month-name", "curr-title", "curr-passages", "curr-scripture", "curr-synopsis", "curr-topic", "curr-keyword", "curr-events"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function renderMonthlyThemes() {
  const listEl = document.getElementById("curr-monthly-list");
  if (!listEl) return;

  const source = currState.items.length > 0 ? currState.items : MONTHLY_THEMES_2026;
  const sorted = [...source].sort((a, b) =>
    String(a.month_key || "").localeCompare(String(b.month_key || ""))
  );

  listEl.innerHTML = sorted.map(item => {
    const key = item.month_key || item.id || "";
    return `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(key)}</span>
          <div class="flex items-center gap-2">
            <button type="button" data-curr-action="edit" data-curr-key="${esc(key)}" class="text-blue-600 hover:underline font-semibold">Edit</button>
            <button type="button" data-curr-action="delete" data-curr-key="${esc(key)}" class="text-red-600 hover:underline font-semibold">Delete</button>
          </div>
        </div>
        <h4 class="font-bold text-sm text-slate-900">${esc(item.title || "")}</h4>
        ${item.passages || item.scripture ? `<p class="text-[11px] text-amber-800 font-semibold">📖 ${esc(item.passages || "")}${item.scripture ? ` • ${esc(item.scripture)}` : ""}</p>` : ""}
        ${item.synopsis ? `<p class="text-slate-600 leading-relaxed">${esc(item.synopsis)}</p>` : ""}
        <div class="flex flex-wrap gap-1.5 pt-1">
          ${item.topic ? `<span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">Topic: ${esc(item.topic)}</span>` : ""}
          ${item.keyword ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">Keyword: ${esc(item.keyword)}</span>` : ""}
          ${item.notable_events ? `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">Events: ${esc(item.notable_events)}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

export async function refreshCurriculumMonthly() {
  try {
    const snap = await getDocs(collection(db, COLLECTION_MONTHLY));
    currState.items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMonthlyThemes();
  } catch (err) {
    console.warn("Using fallback 2026 themes:", err);
    renderMonthlyThemes();
  }
}

export async function seed2026MonthlyThemes() {
  setCurrStatus("Seeding 2026 monthly themes...");
  for (const item of MONTHLY_THEMES_2026) {
    await setDoc(doc(db, COLLECTION_MONTHLY, item.month_key), item, { merge: true });
  }
  await refreshCurriculumMonthly();
  setCurrStatus("12 Monthly Themes 2026 (Jan–Dec) tersimpan!");
}

export function initCurriculumTab() {
  if (currState.bound) {
    refreshCurriculumMonthly();
    return;
  }
  currState.bound = true;

  document.getElementById("curr-seed-2026-btn")?.addEventListener("click", async () => {
    try {
      await seed2026MonthlyThemes();
    } catch (err) {
      setCurrStatus("Gagal seed: " + (err?.message || err), true);
    }
  });

  document.getElementById("curr-reset-btn")?.addEventListener("click", () => {
    resetCurrForm();
    setCurrStatus("");
  });

  document.getElementById("curr-monthly-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-curr-action]");
    if (!btn) return;
    const key = btn.dataset.currKey || "";
    const pool = currState.items.length > 0 ? currState.items : MONTHLY_THEMES_2026;
    const item = pool.find(x => (x.month_key || x.id) === key);

    if (btn.dataset.currAction === "edit" && item) {
      document.getElementById("curr-form-title").textContent = `✏️ Edit Monthly Theme (${key})`;
      document.getElementById("curr-month-key").value = item.month_key || key;
      document.getElementById("curr-month-name").value = item.month_name || "";
      document.getElementById("curr-title").value = item.title || "";
      document.getElementById("curr-passages").value = item.passages || "";
      document.getElementById("curr-scripture").value = item.scripture || "";
      document.getElementById("curr-synopsis").value = item.synopsis || "";
      document.getElementById("curr-topic").value = item.topic || "";
      document.getElementById("curr-keyword").value = item.keyword || "";
      document.getElementById("curr-events").value = item.notable_events || "";
      setCurrStatus(`Editing ${key}`);
    }

    if (btn.dataset.currAction === "delete" && key) {
      if (!confirm(`Hapus tema bulanan ${key}?`)) return;
      await deleteDoc(doc(db, COLLECTION_MONTHLY, key));
      await refreshCurriculumMonthly();
      setCurrStatus(`Deleted ${key}`);
    }
  });

  document.getElementById("form-curr-monthly")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const monthKey = document.getElementById("curr-month-key").value.trim();
    if (!monthKey) return;

    const payload = {
      month_key: monthKey,
      month_name: document.getElementById("curr-month-name").value.trim(),
      annual_theme: "Align in Promise",
      book: "Genesis",
      title: document.getElementById("curr-title").value.trim(),
      passages: document.getElementById("curr-passages").value.trim(),
      scripture: document.getElementById("curr-scripture").value.trim(),
      synopsis: document.getElementById("curr-synopsis").value.trim(),
      topic: document.getElementById("curr-topic").value.trim(),
      keyword: document.getElementById("curr-keyword").value.trim(),
      notable_events: document.getElementById("curr-events").value.trim(),
      status: "Published"
    };

    try {
      setCurrStatus("Saving...");
      await setDoc(doc(db, COLLECTION_MONTHLY, monthKey), payload, { merge: true });
      resetCurrForm();
      await refreshCurriculumMonthly();
      setCurrStatus(`Saved ${monthKey}!`);
    } catch (err) {
      setCurrStatus("Gagal menyimpan: " + (err?.message || err), true);
    }
  });

  refreshCurriculumMonthly();
}
