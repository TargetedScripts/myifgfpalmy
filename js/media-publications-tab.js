// js/media-publications-tab.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MONTH_NAMES_ID = {
  "01": "Januari",
  "02": "Februari",
  "03": "Maret",
  "04": "April",
  "05": "Mei",
  "06": "Juni",
  "07": "Juli",
  "08": "Agustus",
  "09": "September",
  "10": "Oktober",
  "11": "November",
  "12": "Desember"
};

const MONTH_NAMES_ID_SHORT = {
  "01": "Jan",
  "02": "Feb",
  "03": "Mar",
  "04": "Apr",
  "05": "Mei",
  "06": "Jun",
  "07": "Jul",
  "08": "Agu",
  "09": "Sep",
  "10": "Okt",
  "11": "Nov",
  "12": "Des"
};

function escapeHtml(val = "") {
  return String(val)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toggleVisibility(el, show) {
  if (!el) return;
  el.classList.toggle("hidden", !show);
  el.style.display = show ? "block" : "none";
}

function formatShortIndoDate(dateStr = "") {
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return dateStr;
  const day = Number(parts[2]);
  const monthLabel = MONTH_NAMES_ID_SHORT[parts[1]] || parts[1];
  return `${day} ${monthLabel}`;
}

function inferYearMeta(yearStr, monthlyDocs) {
  const yr = String(yearStr);
  if (yr === "2026") {
    return {
      annualTitle: "THE ANNUAL ANCHOR 2026 - ALIGN IN PROMISE",
      subtitle: "Menyelaraskan Hidup dalam Janji, Pemulihan, dan Kesetiaan Tuhan",
      bookOrSeries: "Kitab Kejadian",
      focusLabel: "ALIGN IN PROMISE"
    };
  }
  if (yr === "2027") {
    return {
      annualTitle: "THE ANNUAL ANCHOR 2027 - ALIGN IN PURPOSE",
      subtitle: "Menyelaraskan Langkah dalam Panggilan, Ketaatan, dan Hadirat Tuhan",
      bookOrSeries: "Kitab Keluaran",
      focusLabel: "ALIGN IN PURPOSE"
    };
  }

  const firstDoc = monthlyDocs[0] || {};
  const seriesText = (firstDoc.phase || firstDoc.book || `Perjalanan Firman Tuhan ${yr}`).trim();
  const focusText = (firstDoc.topic || `ALIGN IN FAITH ${yr}`).trim().toUpperCase();

  return {
    annualTitle: `THE ANNUAL ANCHOR ${yr} - ${focusText}`,
    subtitle: `Menyelaraskan Langkah, Iman, dan Panggilan Tuhan Sepanjang Tahun ${yr}`,
    bookOrSeries: seriesText,
    focusLabel: focusText
  };
}

function generateAnnualAnchorDraft(yearStr, monthlyDocs) {
  const yr = String(yearStr);
  const sorted = [...monthlyDocs].sort((a, b) =>
    String(a.monthKey || "").localeCompare(String(b.monthKey || ""))
  );

  const meta = inferYearMeta(yr, sorted);
  const firstMonth = sorted[0] || { title: "Awal yang Teguh", focus: "Foundation" };
  const lastMonth = sorted[sorted.length - 1] || { title: "Buah Kesetiaan", focus: "Faithfulness" };

  const prologue =
    yr === "2026"
      ? `Setiap tahun membawa musim, tantangan, dan pergumulannya sendiri. Di tengah dunia yang terus berubah dan sering kali terasa tidak pasti, jemaat IFGF Palmerston North memerlukan jangkar yang kokoh agar tidak mudah goyah. The Annual Anchor 2026 hadir sebagai kompas rohani bersama untuk menuntun langkah kita sepanjang tahun melalui ${meta.bookOrSeries}—mengingatkan bahwa sejak awal mula hingga akhir, janji Allah tidak pernah berubah dan kesetiaan-Nya selalu menopang umat-Nya.`
      : yr === "2027"
      ? `Setelah menelusuri bagaimana Allah meneguhkan janji-Nya sepanjang Kitab Kejadian, The Annual Anchor 2027 mengajak kita melangkah lebih jauh ke dalam ${meta.bookOrSeries}. Ketika umat Tuhan bertumbuh dan menghadapi realitas hidup yang makin kompleks, pertanyaannya bukan sekadar ke mana kita melangkah, melainkan bagaimana kita hidup selaras dengan panggilan dan tujuan Allah. Melalui tiga fase utama—SEE, WALK, dan DWELL—tahun ${yr} dirancang untuk membentuk kepekaan mata rohani, ketekunan melangkah dalam iman, serta kerinduan untuk hidup senantiasa dalam hadirat Tuhan.`
      : `Tahun ${yr} membuka lembaran baru dengan arah yang jelas: hidup yang selaras dengan kehendak dan tujuan Allah. Di tengah ritme kehidupan yang padat dan penuh keputusan, jemaat IFGF Palmerston North dipanggil untuk tidak berjalan sekadar mengikuti arus, melainkan melangkah berdasarkan firman dan pimpinan Tuhan. Melalui ${meta.bookOrSeries}, perjalanan 12 bulan di tahun ${yr} menuntun kita untuk bertumbuh dari "${firstMonth.title}" hingga "${lastMonth.title}" dengan hati yang tertambat pada Allah.`;

  const welcome =
    yr === "2026"
      ? `Selamat datang di The Annual Anchor 2026. Sepanjang tahun ini, kita mendalami ${meta.bookOrSeries} dengan fokus ${meta.focusLabel}: memahami janji-janji Allah yang teguh dan bagaimana kita hidup selaras di dalamnya.`
      : yr === "2027"
      ? `Selamat datang di The Annual Anchor 2027. Sepanjang tahun ini, kita mendalami ${meta.bookOrSeries} dengan fokus ${meta.focusLabel}: mengenali bagaimana Allah melihat, memanggil, menuntun, dan berdiam di tengah umat-Nya agar hidup kita selaras dengan tujuan ilahi-Nya.`
      : `Selamat datang di The Annual Anchor ${yr}. Sepanjang tahun ini, kita mendalami ${meta.bookOrSeries} dengan fokus ${meta.focusLabel} agar setiap langkah pelayanan, keluarga, dan pekerjaan kita selaras dengan rencana Tuhan.`;

  const months = Array.from({ length: 12 }, (_, idx) => {
    const mm = String(idx + 1).padStart(2, "0");
    const monthKey = `${yr}-${mm}`;
    const monthName = MONTH_NAMES_ID[mm] || `Bulan ${idx + 1}`;
    const found = sorted.find(d => String(d.monthKey || d.id || "") === monthKey) || {};

    const theme = (found.title || found.theme || `Tema ${monthName} ${yr}`).trim();
    const focus = (found.focus || found.topic || "Alignment").trim();
    const reading = (found.passages || found.scripture || found.reading || "Firman Tuhan").trim();

    let summary = (found.narrative || "").trim();
    if (!summary) {
      const rawSynopsis = (found.synopsis || found.subtitle || found.preacherGuide || "").trim();
      if (rawSynopsis) {
        const sentences = rawSynopsis.split(/(?<=[.!?])\s+/).filter(Boolean);
        summary = sentences.slice(0, 2).join(" ");
      } else {
        summary = `Fokus bulan ${monthName} mengarahkan kita pada "${theme}" melalui ${reading}, agar iman kita terus bertumbuh selaras dengan rencana Tuhan.`;
      }
    }

    return {
      monthNumber: idx + 1,
      monthKey,
      monthName,
      theme,
      focus,
      reading,
      summary
    };
  });

  const annualReflection =
    yr === "2026"
      ? `Menengok kembali perjalanan satu tahun penuh, kita belajar bahwa janji Tuhan tidak selalu digenapi dengan cara atau waktu yang kita duga, tetapi selalu digenapi tepat pada waktunya. Ada kalanya kita harus menunggu di masa yang sunyi, ada saatnya luka masa lalu dipulihkan, dan ada musim di mana kita dipanggil untuk berbuah di tengah keterbatasan. Semua proses itu bermuara pada satu kepastian: Kristus adalah kegenapan dari setiap janji Allah. Kiranya sepanjang tahun ini kita bertumbuh semakin berakar dalam firman-Nya, setia dalam ketaatan, dan menjadi saksi nyata dari kasih serta kesetiaan Tuhan di mana pun kita berada.`
      : yr === "2027"
      ? `Tujuan Allah bagi kita bukan sekadar melepaskan kita dari tekanan, melainkan membawa kita masuk ke dalam persekutuan yang hidup dengan-Nya dan mengutus kita menjadi berkat. Di sepanjang perjalanan 2027, akan ada musim yang menuntut keberanian melangkah, kerendahan hati untuk belajar bergantung hari demi hari, serta kasih karunia yang memulihkan ketika kita jatuh. Di dalam Kristus, Allah melihat pergumulan kita, menebus hidup kita, dan berdiam di tengah kita. Kiranya sepanjang 2027 kita terus melangkah dalam ketaatan dan selaras dengan tujuan-Nya.`
      : `Sepanjang tahun ${yr}, Tuhan tidak pernah meninggalkan umat-Nya berjalan sendirian. Setiap musim—baik masa menabur, menanti, maupun menuai—sedang membentuk karakter dan meneguhkan iman kita di dalam Kristus. Kiranya sepanjang tahun ${yr} kita tetap berakar dalam firman-Nya, peka terhadap pimpinan Roh Kudus, dan menjadi berkat bagi komunitas serta lingkungan sekitar kita.`;

  return {
    year: yr,
    annualTitle: meta.annualTitle,
    subtitle: meta.subtitle,
    prologue,
    greeting: "Shalom,",
    welcome,
    months,
    annualReflection,
    closing: "Kiranya Tuhan Yesus memberkati.",
    published: true
  };
}

function buildFurtickWeekNarrative(week, monthDoc, index) {
  const title = (week.title || `Pesan Minggu ${index + 1}`).trim();
  const focus = (week.monthlyFocus || monthDoc?.subtitle || monthDoc?.focus || "").trim();
  const connection = (week.connectionToMonthlyTheme || "").trim();
  const winning = (week.winningPoint || "").trim();
  const verse = (week.keyVerse || week.scriptureReading || "").trim();

  if (winning) {
    const cleanWinning = winning.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ");
    if (connection) {
      const cleanConn = connection.split(/(?<=[.!?])\s+/).slice(0, 1).join(" ");
      return `${cleanConn} ${cleanWinning}`;
    }
    return cleanWinning;
  }

  const hooks = [
    `Jangan remehkan proses yang kelihatannya lambat hari ini. Di balik "${title}"${focus ? `—yang menyoroti ${focus.toLowerCase()}—` : ", "}Tuhan sedang membentuk ketahanan yang tidak bisa dibeli dengan jalan pintas.`,
    `Sering kali kita mengukur rencana Tuhan dengan kacamata jam kita sendiri. Lewat "${title}"${verse ? ` (${verse})` : ""}, Tuhan menantang kita untuk tetap percaya ketika hasil belum terlihat di depan mata.`,
    `Yang terlihat buntu di permukaan bisa jadi justru sedang disiapkan Tuhan untuk menjadi pintu masuk. Fokus "${title}" mengajak kita melepaskan rasa takut dan melangkah selaras dengan arah yang Tuhan tetapkan.`,
    `Ketaatan kecil yang dijaga di tengah tekanan jauh lebih menentukan daripada semangat besar yang mudah padam. Dalam "${title}", Tuhan mengingatkan bahwa panggilan-Nya tidak pernah kehabisan cara untuk menuntun kita.`
  ];

  return hooks[index % hooks.length];
}

function generateMonthlyCompassDraft(monthKey, monthDoc, weeklyDocs, rosterMap) {
  const [yr, mm] = String(monthKey).split("-");
  const monthName = MONTH_NAMES_ID[mm] || monthKey;
  const themeTitle = (monthDoc?.title || `Tema ${monthName} ${yr}`).trim();
  const focusText = (monthDoc?.subtitle || monthDoc?.focus || monthDoc?.topic || "").trim();
  const synopsis = (monthDoc?.synopsis || "").trim();

  const sortedWeeks = [...weeklyDocs].sort((a, b) =>
    String(a.serviceDate || a.date || a.id || "").localeCompare(String(b.serviceDate || b.date || b.id || ""))
  );

  const intro = synopsis
    ? `Bulan ${monthName} ini kita memasuki tema "${themeTitle}"${focusText ? `—dengan fokus: ${focusText}` : ""}. ${synopsis.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")} Jangan menyerah di tengah proses; Tuhan tetap bekerja bahkan ketika belum semua jawaban terlihat jelas.`
    : `Bulan ${monthName} ini kita memasuki tema "${themeTitle}"${focusText ? `—dengan fokus: ${focusText}` : ""}. Ini bukan sekadar pergantian tanggal di kalender, melainkan undangan untuk menyelaraskan cara pandang dan iman kita dengan apa yang sedang Tuhan kerjakan. Tetap teguh, tetap peka, dan percayalah bahwa Tuhan tidak pernah kehilangan kendali.`;

  const weeks = sortedWeeks.map((w, idx) => {
    const dateStr = String(w.serviceDate || w.date || w.id || "").trim();
    const shortDate = formatShortIndoDate(dateStr);
    const weekLabel = shortDate ? `Minggu ${idx + 1} (${shortDate})` : (w.weekLabel || `Minggu ${idx + 1}`).trim();

    const rosterSpeaker = dateStr && rosterMap[dateStr] ? rosterMap[dateStr].trim() : "";
    const guidelineSpeaker = (w.speakerGuideline || w.speaker || "").trim();
    const speaker = rosterSpeaker || guidelineSpeaker || "TBA";
    const speakerSource = rosterSpeaker ? "roster" : (guidelineSpeaker ? "guideline" : "manual");

    return {
      date: dateStr,
      weekLabel,
      title: (w.title || `Tema Minggu ${idx + 1}`).trim(),
      speaker,
      speakerSource,
      narrative: buildFurtickWeekNarrative(w, monthDoc, idx)
    };
  });

  const lastWeek = weeks[weeks.length - 1];
  const reflection =
    `Kamu mungkin mengira bulan ${monthName} ini hanya soal rutinitas yang berulang atau doa yang terasa berjalan di tempat. Padahal, Tuhan sedang bekerja di balik layar—menguatkan bagian yang rapuh, meluruskan arah yang sempat melenceng, dan menyiapkan langkah berikutnya. Bukan tentang seberapa cepat keadaan berubah, melainkan tentang siapa yang tetap percaya dan setia ketika prosesnya belum selesai${lastWeek ? `, sampai pada "${lastWeek.title}"` : ""}. Tema "${themeTitle}" belum selesai ditulis oleh Tuhan. Tetap melangkah, tetap berakar, dan percayalah bahwa kasih serta kesetiaan-Nya selalu menyertaimu.`;

  return {
    monthKey,
    year: yr,
    monthThemeTitle: themeTitle,
    greeting: "Shalom,",
    intro,
    weeks,
    reflection,
    closing: "Kiranya Tuhan Yesus memberkati.",
    published: true
  };
}

async function fetchRosterSpeakerMap() {
  const map = {};
  const candidateCollections = ["rosters", "sunday_rosters", "roster_assignments"];

  for (const colName of candidateCollections) {
    try {
      const snap = await getDocs(collection(db, colName));
      snap.forEach(docSnap => {
        const d = docSnap.data() || {};
        const dateKey = String(d.serviceDate || d.date || docSnap.id || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;

        const speaker =
          d.speaker ||
          d.preacher ||
          d.speakerName ||
          d.preacherName ||
          (d.assignments && (d.assignments.speaker || d.assignments.preacher || d.assignments.Speaker || d.assignments.Preacher)) ||
          (Array.isArray(d.slots)
            ? (d.slots.find(s => /speaker|preacher|khotbah/i.test(String(s.role || s.roleName || "")))?.assigneeName ||
                d.slots.find(s => /speaker|preacher|khotbah/i.test(String(s.role || s.roleName || "")))?.memberName ||
                "")
            : "");

        if (speaker && !map[dateKey]) {
          map[dateKey] = String(speaker).trim();
        }
      });
    } catch {
      // Abaikan jika koleksi belum ada atau tidak dapat diakses
    }
  }

  return map;
}

export function initMediaPublicationsTab() {
  const subtabButtons = document.querySelectorAll(".archive-subtab");
  const subpanels = document.querySelectorAll(".archive-subpanel");

  function switchSubtab(target) {
    subtabButtons.forEach(b => {
      const active = b.dataset.archiveSubtab === target;
      b.classList.toggle("bg-slate-900", active);
      b.classList.toggle("text-white", active);
      b.classList.toggle("bg-slate-100", !active);
      b.classList.toggle("text-slate-700", !active);
    });

    subpanels.forEach(panel => {
      toggleVisibility(panel, panel.id === `archive-subpanel-${target}`);
    });
  }

  // Satu pintu navigasi subtab (menghentikan listener lama dari service-archives-tab.js agar tidak bentrok)
  subtabButtons.forEach(btn => {
    btn.addEventListener(
      "click",
      e => {
        e.stopImmediatePropagation();
        switchSubtab(btn.dataset.archiveSubtab);
      },
      true
    );
  });

  // --- MONTHLY COMPASS STATE & ELEMENTS ---
  const mcMonthSelect = document.getElementById("mc-month-select");
  const mcDbBadge = document.getElementById("mc-db-badge");
  const mcStatusMsg = document.getElementById("mc-status-msg");
  const mcEditorContainer = document.getElementById("mc-editor-container");
  const mcPublishedCheck = document.getElementById("mc-published-check");
  const mcGreeting = document.getElementById("mc-greeting");
  const mcThemeRef = document.getElementById("mc-theme-ref");
  const mcIntro = document.getElementById("mc-intro");
  const mcWeeksEditor = document.getElementById("mc-weeks-editor");
  const mcReflection = document.getElementById("mc-reflection");
  const mcClosing = document.getElementById("mc-closing");
  const mcSyncRosterBtn = document.getElementById("mc-sync-roster-btn");
  const mcRegenerateBtn = document.getElementById("mc-regenerate-btn");
  const mcPublishBtn = document.getElementById("mc-publish-btn");

  let monthlyThemesCache = [];
  let weeklyInsightsCache = [];
  let rosterMapCache = {};
  let currentMcData = null;

  // --- ANNUAL ANCHOR STATE & ELEMENTS ---
  const aaYearSelect = document.getElementById("aa-year-select");
  const aaDbBadge = document.getElementById("aa-db-badge");
  const aaStatusMsg = document.getElementById("aa-status-msg");
  const aaEditorContainer = document.getElementById("aa-editor-container");
  const aaPublishedCheck = document.getElementById("aa-published-check");
  const aaTitle = document.getElementById("aa-title");
  const aaSubtitle = document.getElementById("aa-subtitle");
  const aaPrologue = document.getElementById("aa-prologue");
  const aaGreeting = document.getElementById("aa-greeting");
  const aaWelcome = document.getElementById("aa-welcome");
  const aaMonthsEditor = document.getElementById("aa-months-editor");
  const aaReflection = document.getElementById("aa-reflection");
  const aaClosing = document.getElementById("aa-closing");
  const aaRegenerateBtn = document.getElementById("aa-regenerate-btn");
  const aaPublishBtn = document.getElementById("aa-publish-btn");

  let currentAaData = null;

  function renderMcWeeksEditor(weeks = []) {
    if (!weeks.length) {
      mcWeeksEditor.innerHTML = `<div class="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500">Belum ada data mingguan untuk bulan ini di kurikulum. Anda tetap bisa mengisi pembuka & refleksi atau menambahkan data minggu di tab Curriculum.</div>`;
      return;
    }

    mcWeeksEditor.innerHTML = weeks
      .map(
        (w, idx) => `
        <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5" data-mc-week-idx="${idx}">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold text-slate-900 text-xs">${escapeHtml(w.weekLabel || `Minggu ${idx + 1}`)} <span class="text-slate-400 font-mono">(${escapeHtml(w.date || "-")})</span></span>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
              w.speakerSource === "roster"
                ? "bg-emerald-100 text-emerald-800"
                : w.speakerSource === "guideline"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-200 text-slate-700"
            }">Speaker: ${escapeHtml(w.speaker || "TBA")} (${escapeHtml(w.speakerSource || "manual")})</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div class="sm:col-span-2">
              <label class="font-semibold text-slate-600">Weekly Theme Title</label>
              <input type="text" data-field="title" value="${escapeHtml(w.title || "")}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5 font-semibold" />
            </div>
            <div>
              <label class="font-semibold text-slate-600">Speaker (Sync / Override)</label>
              <input type="text" data-field="speaker" value="${escapeHtml(w.speaker || "")}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5" />
            </div>
          </div>

          <div>
            <label class="font-semibold text-slate-600">Narasi / Ringkasan Mingguan</label>
            <textarea data-field="narrative" rows="3" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5 leading-relaxed">${escapeHtml(w.narrative || "")}</textarea>
          </div>
        </div>
      `
      )
      .join("");
  }

  function collectMcEditorState() {
    const monthKey = mcMonthSelect.value;
    const [yr] = monthKey.split("-");
    const weekCards = [...mcWeeksEditor.querySelectorAll("[data-mc-week-idx]")];

    const weeks = weekCards.map((card, idx) => {
      const base = (currentMcData?.weeks && currentMcData.weeks[idx]) || {};
      const titleInput = card.querySelector('[data-field="title"]');
      const speakerInput = card.querySelector('[data-field="speaker"]');
      const narrativeInput = card.querySelector('[data-field="narrative"]');
      const newSpeaker = speakerInput ? speakerInput.value.trim() : base.speaker || "";

      return {
        date: base.date || "",
        weekLabel: base.weekLabel || `Minggu ${idx + 1}`,
        title: titleInput ? titleInput.value.trim() : base.title || "",
        speaker: newSpeaker,
        speakerSource: newSpeaker !== (base.speaker || "") ? "manual" : (base.speakerSource || "manual"),
        narrative: narrativeInput ? narrativeInput.value.trim() : base.narrative || ""
      };
    });

    return {
      monthKey,
      year: yr,
      monthThemeTitle: mcThemeRef.value.trim(),
      greeting: mcGreeting.value.trim() || "Shalom,",
      intro: mcIntro.value.trim(),
      weeks,
      reflection: mcReflection.value.trim(),
      closing: mcClosing.value.trim() || "Kiranya Tuhan Yesus memberkati.",
      published: Boolean(mcPublishedCheck.checked)
    };
  }

  function populateMcEditor(data) {
    currentMcData = data;
    toggleVisibility(mcEditorContainer, true);
    mcPublishedCheck.checked = data.published !== false;
    mcGreeting.value = data.greeting || "Shalom,";
    mcThemeRef.value = data.monthThemeTitle || "";
    mcIntro.value = data.intro || "";
    renderMcWeeksEditor(data.weeks || []);
    mcReflection.value = data.reflection || "";
    mcClosing.value = data.closing || "Kiranya Tuhan Yesus memberkati.";
  }

  async function buildFreshMcDraft(monthKey) {
    rosterMapCache = await fetchRosterSpeakerMap();
    const monthDoc = monthlyThemesCache.find(m => String(m.monthKey || m.id || "") === monthKey) || null;
    const monthWeeks = weeklyInsightsCache.filter(w => {
      const mk = String(w.monthKey || w.serviceDate || w.date || w.id || "").slice(0, 7);
      return mk === monthKey;
    });
    return generateMonthlyCompassDraft(monthKey, monthDoc, monthWeeks, rosterMapCache);
  }

  async function handleSelectMcMonth(monthKey, forceAskIfMissing = true) {
    if (!monthKey) return;
    mcStatusMsg.textContent = "Memeriksa data di database...";
    mcDbBadge.textContent = "Checking...";
    mcDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700";

    try {
      const snap = await getDoc(doc(db, "monthly_compass", monthKey));
      if (snap.exists()) {
        const saved = { monthKey, ...snap.data() };
        populateMcEditor(saved);
        mcDbBadge.textContent = saved.published === false ? "Saved (Draft)" : "Published in DB";
        mcDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800";
        mcStatusMsg.textContent = `Data The Monthly Compass untuk ${monthKey} sudah ada di database dan dimuat ke editor.`;
        return;
      }

      toggleVisibility(mcEditorContainer, false);
      mcDbBadge.textContent = "Not Yet in DB";
      mcDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900";
      mcStatusMsg.textContent = `Data The Monthly Compass untuk ${monthKey} belum ada di database.`;

      if (forceAskIfMissing) {
        const ok = window.confirm(
          `Data The Monthly Compass untuk bulan ${monthKey} belum ada di database.\n\nKlik OK untuk men-generate draf awal dari kurikulum & roster ke editor.`
        );
        if (!ok) return;
      }

      const draft = await buildFreshMcDraft(monthKey);
      populateMcEditor(draft);
      mcStatusMsg.textContent = `Draf baru ${monthKey} berhasil di-generate ke editor. Silakan review/edit lalu klik Save & Publish.`;
    } catch (err) {
      mcStatusMsg.textContent = `Gagal memuat ${monthKey}: ${err.message}`;
    }
  }

  // --- ANNUAL ANCHOR HELPERS ---
  function renderAaMonthsEditor(months = []) {
    aaMonthsEditor.innerHTML = months
      .map(
        (m, idx) => `
        <div class="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2" data-aa-month-idx="${idx}">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-900">${escapeHtml(String(m.monthNumber || idx + 1))}. ${escapeHtml(m.monthName || "")}</span>
            <span class="text-[10px] font-mono text-slate-500">${escapeHtml(m.monthKey || "")}</span>
          </div>

          <div>
            <label class="font-semibold text-slate-600">Theme Title</label>
            <input type="text" data-field="theme" value="${escapeHtml(m.theme || "")}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5 font-semibold" />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label class="font-semibold text-slate-600">Fokus</label>
              <input type="text" data-field="focus" value="${escapeHtml(m.focus || "")}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5" />
            </div>
            <div>
              <label class="font-semibold text-slate-600">Bahan Bacaan</label>
              <input type="text" data-field="reading" value="${escapeHtml(m.reading || "")}" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5" />
            </div>
          </div>

          <div>
            <label class="font-semibold text-slate-600">Narasi Bulanan</label>
            <textarea data-field="summary" rows="2" class="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg mt-0.5 leading-relaxed">${escapeHtml(m.summary || "")}</textarea>
          </div>
        </div>
      `
      )
      .join("");
  }

  function collectAaEditorState() {
    const yearStr = aaYearSelect.value;
    const cards = [...aaMonthsEditor.querySelectorAll("[data-aa-month-idx]")];
    const months = cards.map((card, idx) => {
      const base = (currentAaData?.months && currentAaData.months[idx]) || {};
      return {
        monthNumber: base.monthNumber || idx + 1,
        monthKey: base.monthKey || `${yearStr}-${String(idx + 1).padStart(2, "0")}`,
        monthName: base.monthName || MONTH_NAMES_ID[String(idx + 1).padStart(2, "0")],
        theme: card.querySelector('[data-field="theme"]')?.value.trim() || "",
        focus: card.querySelector('[data-field="focus"]')?.value.trim() || "",
        reading: card.querySelector('[data-field="reading"]')?.value.trim() || "",
        summary: card.querySelector('[data-field="summary"]')?.value.trim() || ""
      };
    });

    return {
      year: yearStr,
      annualTitle: aaTitle.value.trim(),
      subtitle: aaSubtitle.value.trim(),
      prologue: aaPrologue.value.trim(),
      greeting: aaGreeting.value.trim() || "Shalom,",
      welcome: aaWelcome.value.trim(),
      months,
      annualReflection: aaReflection.value.trim(),
      closing: aaClosing.value.trim() || "Kiranya Tuhan Yesus memberkati.",
      published: Boolean(aaPublishedCheck.checked)
    };
  }

  function populateAaEditor(data) {
    currentAaData = data;
    toggleVisibility(aaEditorContainer, true);
    aaPublishedCheck.checked = data.published !== false;
    aaTitle.value = data.annualTitle || "";
    aaSubtitle.value = data.subtitle || "";
    aaPrologue.value = data.prologue || "";
    aaGreeting.value = data.greeting || "Shalom,";
    aaWelcome.value = data.welcome || "";
    renderAaMonthsEditor(data.months || []);
    aaReflection.value = data.annualReflection || "";
    aaClosing.value = data.closing || "Kiranya Tuhan Yesus memberkati.";
  }

  function buildFreshAaDraft(yearStr) {
    const yearMonths = monthlyThemesCache.filter(m =>
      String(m.monthKey || m.id || "").startsWith(`${yearStr}-`)
    );
    return generateAnnualAnchorDraft(yearStr, yearMonths);
  }

  async function handleSelectAaYear(yearStr, forceAskIfMissing = true) {
    if (!yearStr) return;
    aaStatusMsg.textContent = "Memeriksa data di database...";
    aaDbBadge.textContent = "Checking...";
    aaDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700";

    try {
      const snap = await getDoc(doc(db, "annual_anchors", yearStr));
      if (snap.exists()) {
        const saved = { year: yearStr, ...snap.data() };
        populateAaEditor(saved);
        aaDbBadge.textContent = saved.published === false ? "Saved (Draft)" : "Published in DB";
        aaDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800";
        aaStatusMsg.textContent = `Data The Annual Anchor tahun ${yearStr} sudah ada di database dan dimuat ke editor.`;
        return;
      }

      toggleVisibility(aaEditorContainer, false);
      aaDbBadge.textContent = "Not Yet in DB";
      aaDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-900";
      aaStatusMsg.textContent = `Data The Annual Anchor tahun ${yearStr} belum ada di database.`;

      if (forceAskIfMissing) {
        const ok = window.confirm(
          `Data The Annual Anchor untuk tahun ${yearStr} belum ada di database.\n\nKlik OK untuk men-generate draf awal dari kurikulum ke editor.`
        );
        if (!ok) return;
      }

      const draft = buildFreshAaDraft(yearStr);
      populateAaEditor(draft);
      aaStatusMsg.textContent = `Draf baru tahun ${yearStr} berhasil di-generate ke editor. Silakan review/edit lalu klik Save & Publish.`;
    } catch (err) {
      aaStatusMsg.textContent = `Gagal memuat tahun ${yearStr}: ${err.message}`;
    }
  }

  // --- EVENT BINDINGS ---
  mcMonthSelect.addEventListener("change", () => {
    handleSelectMcMonth(mcMonthSelect.value, true);
  });

  mcSyncRosterBtn.addEventListener("click", async () => {
    const monthKey = mcMonthSelect.value;
    if (!monthKey) return;
    const currentState = currentMcData ? collectMcEditorState() : await buildFreshMcDraft(monthKey);
    rosterMapCache = await fetchRosterSpeakerMap();
    const updatedWeeks = (currentState.weeks || []).map(w => {
      const rSpeaker = w.date && rosterMapCache[w.date] ? rosterMapCache[w.date].trim() : "";
      if (rSpeaker) {
        return { ...w, speaker: rSpeaker, speakerSource: "roster" };
      }
      return w;
    });
    populateMcEditor({ ...currentState, weeks: updatedWeeks });
    mcStatusMsg.textContent = "Nama pembicara disinkronkan dari Sunday Roster (tetap bisa di-edit manual sebelum Save & Publish).";
  });

  mcRegenerateBtn.addEventListener("click", async () => {
    const monthKey = mcMonthSelect.value;
    if (!monthKey) return;
    const ok = window.confirm(
      `Generate ulang draf The Monthly Compass untuk ${monthKey} dari kurikulum & roster?\nPerubahan di editor saat ini akan diganti dengan draf baru.`
    );
    if (!ok) return;
    const fresh = await buildFreshMcDraft(monthKey);
    populateMcEditor(fresh);
    mcStatusMsg.textContent = `Draf ${monthKey} telah di-generate ulang ke editor. Klik Save & Publish untuk menyimpan ke database.`;
  });

  mcPublishBtn.addEventListener("click", async () => {
    const monthKey = mcMonthSelect.value;
    if (!monthKey) return;
    const payload = collectMcEditorState();
    try {
      await setDoc(
        doc(db, "monthly_compass", monthKey),
        {
          ...payload,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      currentMcData = payload;
      mcDbBadge.textContent = payload.published ? "Published in DB" : "Saved (Draft)";
      mcDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800";
      mcStatusMsg.textContent = `Berhasil disimpan ke database (monthly_compass/${monthKey}).`;
    } catch (err) {
      mcStatusMsg.textContent = `Gagal menyimpan: ${err.message}`;
    }
  });

  aaYearSelect.addEventListener("change", () => {
    handleSelectAaYear(aaYearSelect.value, true);
  });

  aaRegenerateBtn.addEventListener("click", () => {
    const yearStr = aaYearSelect.value;
    if (!yearStr) return;
    const ok = window.confirm(
      `Generate ulang draf The Annual Anchor untuk tahun ${yearStr} dari kurikulum?\nPerubahan di editor saat ini akan diganti dengan draf baru.`
    );
    if (!ok) return;
    const fresh = buildFreshAaDraft(yearStr);
    populateAaEditor(fresh);
    aaStatusMsg.textContent = `Draf tahun ${yearStr} telah di-generate ulang ke editor. Klik Save & Publish untuk menyimpan ke database.`;
  });

  aaPublishBtn.addEventListener("click", async () => {
    const yearStr = aaYearSelect.value;
    if (!yearStr) return;
    const payload = collectAaEditorState();
    try {
      await setDoc(
        doc(db, "annual_anchors", yearStr),
        {
          ...payload,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      currentAaData = payload;
      aaDbBadge.textContent = payload.published ? "Published in DB" : "Saved (Draft)";
      aaDbBadge.className = "inline-block px-3 py-2 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800";
      aaStatusMsg.textContent = `Berhasil disimpan ke database (annual_anchors/${yearStr}).`;
    } catch (err) {
      aaStatusMsg.textContent = `Gagal menyimpan: ${err.message}`;
    }
  });

  // --- INITIAL LOAD OF CURRICULUM OPTIONS ---
  async function loadSelectorsAndInitialData() {
    try {
      const [mSnap, wSnap] = await Promise.all([
        getDocs(collection(db, "monthly_themes")),
        getDocs(collection(db, "weekly_insights"))
      ]);

      monthlyThemesCache = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      weeklyInsightsCache = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const monthKeysSet = new Set([
        ...monthlyThemesCache.map(m => String(m.monthKey || m.id || "").trim()),
        ...weeklyInsightsCache.map(w => String(w.monthKey || w.serviceDate || w.date || w.id || "").slice(0, 7).trim()),
        "2026-11",
        "2026-12",
        "2027-01"
      ]);

      const sortedMonths = [...monthKeysSet]
        .filter(k => /^\d{4}-\d{2}$/.test(k))
        .sort();

      mcMonthSelect.innerHTML = sortedMonths
        .map(k => {
          const [y, m] = k.split("-");
          return `<option value="${k}">${MONTH_NAMES_ID[m] || m} ${y} (${k})</option>`;
        })
        .join("");

      const defaultMonth = sortedMonths.includes("2026-11")
        ? "2026-11"
        : sortedMonths[sortedMonths.length - 1] || "2026-11";
      mcMonthSelect.value = defaultMonth;
      await handleSelectMcMonth(defaultMonth, false);

      const yearsSet = new Set([
        ...sortedMonths.map(k => k.slice(0, 4)),
        "2026",
        "2027"
      ]);
      const sortedYears = [...yearsSet].filter(y => /^\d{4}$/.test(y)).sort();

      aaYearSelect.innerHTML = sortedYears
        .map(y => `<option value="${y}">${y}</option>`)
        .join("");

      const defaultYear = sortedYears.includes("2026") ? "2026" : sortedYears[0];
      aaYearSelect.value = defaultYear;
      await handleSelectAaYear(defaultYear, false);
    } catch (err) {
      mcStatusMsg.textContent = `Gagal memuat daftar bulan/tahun: ${err.message}`;
      aaStatusMsg.textContent = `Gagal memuat daftar tahun: ${err.message}`;
    }
  }

  loadSelectorsAndInitialData();
}
