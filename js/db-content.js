// js/db-content.js
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { seedNov20toDec31Devotions } from "./seed-devotions-nov2026.js";

export { seedNov20toDec31Devotions };

const ID_MONTH_MAP = {
  januari: "01", january: "01",
  februari: "02", february: "02",
  maret: "03", march: "03",
  april: "04",
  mei: "05", may: "05",
  juni: "06", june: "06",
  juli: "07", july: "07",
  agustus: "08", august: "08",
  september: "09",
  oktober: "10", october: "10",
  november: "11",
  desember: "12", december: "12"
};

const cleanDashUrl = (val = "") => {
  const t = String(val || "").trim();
  return !t || t === "-" ? "" : t;
};

function cleanMd(str = "") {
  return String(str || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^#+\s*/, "")
    .replace(/^[“"]|[”"]$/g, "")
    .trim();
}

function parseIndoDateToIso(dateStr = "", fallbackMonthKey = "") {
  const isoMatch = String(dateStr).match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  const m = String(dateStr).match(
    /\b(\d{1,2})\s+(januari|january|februari|february|maret|march|april|mei|may|juni|june|juli|july|agustus|august|september|oktober|october|november|desember|december)\s+(\d{4})\b/i
  );
  if (m) {
    const day = String(Number(m[1])).padStart(2, "0");
    const month = ID_MONTH_MAP[m[2].toLowerCase()] || "01";
    const year = m[3];
    return `${year}-${month}-${day}`;
  }

  if (fallbackMonthKey && /^\d{4}-\d{2}$/.test(fallbackMonthKey)) {
    const dayMatch = String(dateStr).match(/\b(\d{1,2})\b/);
    const day = dayMatch ? String(Number(dayMatch[1])).padStart(2, "0") : "01";
    return `${fallbackMonthKey}-${day}`;
  }
  return "";
}

function extractLabelValue(text = "", labels = []) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      `(?:^|\\n)\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*:?\\s*(.+?)(?=\\n\\s*(?:\\*\\*)?(?:FOKUS BULANAN|Posisi dalam Alur|Tema|Ayat Emas|Ayat Kunci|Bacaan Alkitab|Koneksi ke Tema Bulanan|Winning Point|Pertanyaan iCare|Pembicara|Preacher|Speaker|Poster URL|YouTube URL)(?:\\*\\*)?\\s*:|\\n---|$)`,
      "is"
    );
    const match = text.match(re);
    if (match && match[1]) {
      return cleanMd(match[1].replace(/\n+/g, " "));
    }
  }
  return "";
}

function extractWinningPoint(text = "") {
  const m = text.match(
    /(?:^|\n)\s*(?:\*\*)?(?:winning\s*point|ringkasan\s*khotbah|sermon\s*summary|poin\s*utama)(?:\*\*)?\s*:?\s*([\s\S]+?)(?=\n\s*(?:\*\*)?(?:pertanyaan\s*icare|icare|catatan|speaker|preacher|pembicara|youtube|poster)(?:\*\*)?\s*:|\n---|$)/i
  );
  if (!m || !m[1]) return "";
  return m[1]
    .split(/\n\s*\n/)
    .map(p => cleanMd(p.replace(/\n+/g, " ")))
    .filter(Boolean)
    .join("\n\n");
}

function extractMonthHeaderInfo(rawText = "", fallbackMonthKey = "") {
  let monthKey = fallbackMonthKey || "";
  const monthMatch = String(rawText).match(
    /\b(januari|january|februari|february|maret|march|april|mei|may|juni|june|juli|july|agustus|august|september|oktober|october|november|desember|december)\s+(\d{4})\b/i
  );
  if (monthMatch) {
    monthKey = `${monthMatch[2]}-${ID_MONTH_MAP[monthMatch[1].toLowerCase()] || "01"}`;
  }

  let title = "";
  let scripture = "";
  const headerLineMatch = String(rawText).match(
    /\*\*(?:Bulan\s+[A-Za-z]+\s+\d{4})\*\*\s*\(\*([^|*]+?)\*\s*\|\s*([^)]+)\)/i
  );
  if (headerLineMatch) {
    title = cleanMd(headerLineMatch[1]);
    scripture = cleanMd(headerLineMatch[2]);
  }

  const fokusBulanan = extractLabelValue(rawText, ["FOKUS BULANAN", "Fokus Bulanan"]);
  if (!title && fokusBulanan) {
    const parenMatch = fokusBulanan.match(/\(([^()]+)\)\s*\.?$/);
    if (parenMatch) title = cleanMd(parenMatch[1]);
  }

  return {
    month_key: monthKey || "2027-01",
    title: title || "",
    scripture: scripture || "",
    narrative: fokusBulanan || ""
  };
}

function parseSingleWeeklyBlock(blockText = "", defaultMonthKey = "", defaultSpeaker = "", monthContext = {}) {
  const raw = String(blockText || "").trim();
  if (!raw) return null;

  const headerMatch = raw.match(
    /(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?(MINGGU\s*\d+[^:\n]*|IBADAH\s+[^\n:]+|KHUSUS[^\n:]*)\s*:?\s*([^\n]*)/i
  );
  const weekLabelRaw = headerMatch ? cleanMd(headerMatch[1]) : "";
  const datePartRaw = headerMatch ? cleanMd(headerMatch[2] || raw) : raw;

  const explicitDate = extractLabelValue(raw, ["Tanggal", "Service Date", "Date"]);
  const serviceDate =
    parseIndoDateToIso(explicitDate, defaultMonthKey) ||
    parseIndoDateToIso(datePartRaw, defaultMonthKey) ||
    parseIndoDateToIso(raw, defaultMonthKey);

  const monthKey = serviceDate
    ? serviceDate.slice(0, 7)
    : (defaultMonthKey || "2027-01");

  const weekNumMatch = weekLabelRaw.match(/(\d+)/);
  const weekLabel = weekNumMatch ? `Week ${Number(weekNumMatch[1])}` : (weekLabelRaw || "Week 1");

  const title = extractLabelValue(raw, ["Tema", "Judul", "Weekly Theme Title", "Title"]);
  const keyVerse = extractLabelValue(raw, ["Ayat Emas", "Ayat Kunci", "Key Verse", "Ayat"]);
  const scriptureReading = extractLabelValue(raw, ["Bacaan Alkitab", "Bacaan", "Scripture Reading"]);
  const connection = extractLabelValue(raw, ["Koneksi ke Tema Bulanan", "Koneksi Tema", "Christ Connection"]);
  const flowPos = extractLabelValue(raw, ["Posisi dalam Alur", "Posisi"]);
  const monthlyFocus = extractLabelValue(raw, ["FOKUS BULANAN", "Fokus Bulanan", "Weekly Focus", "Fokus"]) || monthContext.narrative || "";
  const speaker = extractLabelValue(raw, ["Pembicara", "Preacher", "Speaker", "Pengkhotbah"]) || defaultSpeaker;
  const diasporaLens = extractLabelValue(raw, ["Lensa Diaspora", "Diaspora Lens", "Diaspora"]);
  const posterUrl = extractLabelValue(raw, ["Poster URL", "Poster"]);
  const youtubeUrl = extractLabelValue(raw, ["YouTube URL", "YouTube"]);
  const icareQuestions = extractLabelValue(raw, ["Pertanyaan iCare", "iCare Questions", "iCare"]);
  const winningPoint = extractWinningPoint(raw);

  const weeklyFocus = connection || monthlyFocus || flowPos || "";
  const sermonSummary = winningPoint || [flowPos, connection].filter(Boolean).join(" — ");

  if (!title && !keyVerse && !serviceDate) return null;

  return {
    service_date: serviceDate,
    month_key: monthKey,
    week_label: weekLabel,
    title: title || `Service ${weekLabel}`,
    key_verse: keyVerse,
    scripture_reading: scriptureReading,
    speaker: speaker || "",
    poster_url: cleanDashUrl(posterUrl),
    youtube_url: cleanDashUrl(youtubeUrl),
    weekly_focus: weeklyFocus,
    monthly_focus: monthlyFocus,
    christ_connection: connection,
    mission_application: flowPos,
    diaspora_lens: diasporaLens,
    sermon_summary: sermonSummary,
    icare_questions: icareQuestions,
    status: "Published"
  };
}

export function parseWeeklyInsightsRawText(rawText = "", fallbackMeta = {}) {
  const cleanedInput = String(rawText || "")
    .replace(/\r\n/g, "\n")
    .replace(/^Berikut adalah rincian lengkap perencanaan ibadah minggu[^\n]*\n*/i, "")
    .replace(/\n###\s*Ringkasan Verifikasi[\s\S]*$/i, "")
    .replace(/\n💡\s*Apakah Anda ingin[\s\S]*$/i, "")
    .trim();

  if (!cleanedInput) return [];

  const monthCtx = extractMonthHeaderInfo(rawText, fallbackMeta.month_key || "");
  const effectiveMonthKey = fallbackMeta.month_key || monthCtx.month_key || "";

  const splitRegex =
    /(?=(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?(?:MINGGU\s*\d+|IBADAH\s+(?:NATAL|TUTUP\s+TAHUN)|KHUSUS\s*\([^)]+\)))/gi;
  const parts = cleanedInput
    .split(splitRegex)
    .map(p => p.replace(/^---\s*$/gm, "").trim())
    .filter(Boolean);

  const parsedList = parts
    .map(part => parseSingleWeeklyBlock(part, effectiveMonthKey, fallbackMeta.speaker || "", monthCtx))
    .filter(Boolean);

  if (parsedList.length > 0) return parsedList;

  const single = parseSingleWeeklyBlock(
    cleanedInput,
    effectiveMonthKey,
    fallbackMeta.speaker || "",
    monthCtx
  );
  return single ? [single] : [];
}

export function parseMonthlyBundleRawText(rawText = "", fallbackMeta = {}) {
  const raw = String(rawText || "").replace(/\r\n/g, "\n").trim();
  const headerInfo = extractMonthHeaderInfo(raw, fallbackMeta.month_key || "2027-01");
  const weeks = parseWeeklyInsightsRawText(raw, {
    month_key: headerInfo.month_key,
    speaker: fallbackMeta.speaker || ""
  });

  const firstWeekVerse = weeks[0]?.key_verse || weeks[0]?.scripture_reading || "";
  const monthData = {
    month_key: headerInfo.month_key,
    phase: fallbackMeta.phase || "",
    title: fallbackMeta.title || headerInfo.title || `Theme ${headerInfo.month_key}`,
    subtitle: fallbackMeta.subtitle || (headerInfo.narrative ? headerInfo.narrative.split(".")[0] : ""),
    scripture: fallbackMeta.scripture || headerInfo.scripture || firstWeekVerse,
    pillar: fallbackMeta.pillar || "",
    yearly_theme: fallbackMeta.yearly_theme || "ALIGN IN PURPOSE — Exodus",
    narrative: fallbackMeta.narrative || headerInfo.narrative || "",
    reflection: fallbackMeta.reflection || "",
    closing: fallbackMeta.closing || "God bless you.",
    banner_url: fallbackMeta.banner_url || "",
    status: "Published"
  };

  return { monthData, weeks };
}

export function parseMonthlyThemeRawText(rawText = "", fallbackMeta = {}) {
  const { monthData } = parseMonthlyBundleRawText(rawText, fallbackMeta);
  return monthData;
}

// --- CURRICULUM TO COMPASS, EDITOR & DAILY REFLECTION DRAFTS ---
export function buildCompassDraftFromCurriculum(monthObj = {}, weeksInMonth = []) {
  const yearlyTheme = monthObj.yearly_theme || "ALIGN IN PURPOSE — Exodus";
  const monthKey = monthObj.month_key || "2027-01";
  const phase = monthObj.phase || "";
  const title = monthObj.title || "Begin to See";
  const scripture = monthObj.scripture || "Exodus 1–2";
  const pillar = monthObj.pillar || "";
  const weekHighlights = weeksInMonth
    .map(w => {
      const preacherNote = w.speaker ? ` — Preacher: ${w.speaker}` : "";
      return `• ${w.week_label || w.service_date} (${w.title || ""}${preacherNote}): ${w.weekly_focus || w.christ_connection || ""}`;
    })
    .join("\n");

  const narrative =
    monthObj.narrative ||
    `Within the annual curriculum ${yearlyTheme}${phase ? ` (${phase})` : ""}, ${monthKey} leads us through "${title}" (${scripture})${pillar ? ` with pillar ${pillar}` : ""}.\n\n${weekHighlights}`;

  const reflection =
    monthObj.reflection ||
    `How is our spiritual vision shaped by "${title}" (${scripture}) in daily life and ministry?`;

  return {
    month_key: monthKey,
    phase,
    title,
    subtitle: monthObj.subtitle || (pillar ? `Monthly Guide • ${pillar}` : "Monthly Guide"),
    scripture,
    pillar,
    yearly_theme: yearlyTheme,
    narrative,
    reflection,
    closing: monthObj.closing || "God bless you."
  };
}

export function buildEditorInsightDraftFromCurriculum(weekObj = {}, monthObj = {}) {
  const yearlyTheme = monthObj.yearly_theme || "ALIGN IN PURPOSE — Exodus";
  const monthTitle = monthObj.title || "Begin to See";
  const pillar = monthObj.pillar || "";
  const title = weekObj.title || "Weekly Insight";
  const keyVerse = weekObj.key_verse || monthObj.scripture || "Exodus 1:12";
  const reading = weekObj.scripture_reading || keyVerse;
  const preacherLine = weekObj.speaker ? `Preacher: ${weekObj.speaker}. ` : "";
  const focus = weekObj.weekly_focus || `Aligning our hearts with the monthly theme ${monthTitle}.`;
  const christ = weekObj.christ_connection || `Christ fulfills God's purpose across ${yearlyTheme}.`;
  const diaspora = weekObj.diaspora_lens || `Living faithfully with impact in Palmerston North, New Zealand.`;

  const rawText = [
    `**${title}**`,
    `${keyVerse} (Reading: ${reading})`,
    "Shalom,",
    `${preacherLine}In the ${yearlyTheme} series and monthly theme "${monthTitle}"${pillar ? ` (${pillar})` : ""}, ${focus} **Anchored in Purpose**`,
    `${christ} ${weekObj.mission_application ? `Mission call: ${weekObj.mission_application}.` : ""}`,
    `${diaspora}`,
    "God Bless You."
  ].join("\n\n");

  return parseEditorInsightRawText(rawText, {
    start_date: weekObj.service_date || "2027-01-03",
    edition_no: weekObj.week_label ? `WEEKLY • ${weekObj.week_label.toUpperCase()}` : "WEEKLY INSIGHT",
    date_label: weekObj.service_date || "",
    header_date: weekObj.service_date || ""
  });
}

export function buildDailyReflectionDraftFromCurriculum(weekObj = {}, monthObj = {}, reflectionDate = "") {
  const targetDate = reflectionDate || weekObj.service_date || "2027-01-03";
  const monthTitle = monthObj.title || "Begin to See";
  const pillar = monthObj.pillar || "";
  const verse = weekObj.key_verse || monthObj.scripture || "Exodus 1:12";
  const title = `${weekObj.title || "Daily Reflection"} — ${monthTitle}`;

  const parts = [
    weekObj.weekly_focus ? `Theme Focus${pillar ? ` (${pillar})` : ""}: ${weekObj.weekly_focus}` : "",
    weekObj.christ_connection ? `Christ Connection: ${weekObj.christ_connection}` : "",
    weekObj.diaspora_lens ? `Diaspora Lens: ${weekObj.diaspora_lens}` : "",
    weekObj.icare_questions ? `iCare / Reflection Questions:\n${weekObj.icare_questions}` : ""
  ].filter(Boolean);

  return {
    reflection_date: targetDate,
    title,
    scripture: verse,
    reflection: parts.join("\n\n") || `Reflecting on ${verse} in light of "${monthTitle}".`,
    prayer: `Lord Jesus, help us walk in the truth of ${verse}${pillar ? ` and ${pillar}` : ""} today. Amen.`
  };
}

// --- 0. THE EDITOR'S INSIGHT PARSER & CRUD (editors_insights) ---
function cleanMarkdown(str = "") {
  return str
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[#>\-\s]+/, "")
    .trim();
}

function splitSentences(text = "") {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/)
    .map(s => s.trim())
    .filter(Boolean);
}

function buildAutoTakeaways(paragraphs = [], stickyHook = "") {
  const takeaways = [];

  if (paragraphs[0]) {
    const sents = splitSentences(paragraphs[0]);
    const shortDesc = sents.slice(1).join(" ") || sents[0];
    takeaways.push({
      title: "1. Core Message Focus",
      desc: shortDesc.length > 180 ? shortDesc.slice(0, 177).trim() + "..." : shortDesc
    });
  }

  if (stickyHook) {
    takeaways.push({
      title: "2. Key Anchor",
      desc: stickyHook
    });
  }

  if (paragraphs[1]) {
    const sents = splitSentences(paragraphs[1]);
    const graceFocus =
      sents.find(s => /grace|redemption|christ|cross|mission|anugerah|penebusan|kristus|misi/i.test(s)) || sents[0];
    takeaways.push({
      title: `${takeaways.length + 1}. Christ & Application`,
      desc: graceFocus
    });
  }

  if (paragraphs[2]) {
    const sents = splitSentences(paragraphs[2]);
    takeaways.push({
      title: `${takeaways.length + 1}. Action & Community`,
      desc: sents.join(" ")
    });
  }

  return takeaways.slice(0, 4);
}

export function parseEditorInsightRawText(rawText = "", meta = {}) {
  const blocks = rawText
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  let title = "";
  let scripture = "";
  let stickyHook = "";
  const bodyBlocks = [];

  blocks.forEach((block, idx) => {
    const cleanLine = cleanMarkdown(block);

    if (!title && idx === 0 && /\*\*.*\*\*/.test(block) && block.length < 120) {
      title = cleanLine;
      return;
    }

    if (
      !scripture &&
      (/[—–-]\s*[1-3]?\s*[A-Za-zÀ-ÿ]+\s+\d+:\d+/.test(cleanLine) ||
        /^[“"].*[”"].*[—–-]/.test(cleanLine) ||
        /^[1-3]?\s*[A-Za-zÀ-ÿ]+\s+\d+:\d+/.test(cleanLine))
    ) {
      scripture = cleanLine;
      return;
    }

    if (/^shalom[,.!]?$/i.test(cleanLine) || /^(tuhan yesus memberkati|god bless you)[.!]?$/i.test(cleanLine)) {
      return;
    }

    bodyBlocks.push(block);
  });

  if (!title && bodyBlocks.length > 0) {
    title = cleanMarkdown(bodyBlocks.shift());
  }

  const paragraphs = bodyBlocks
    .map(block => {
      const boldMatches = [...block.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].trim());
      const englishHook = boldMatches.find(
        txt =>
          /[a-zA-Z]{3,}/.test(txt) &&
          !/\b(yang|dan|di|ke|dari|untuk|dengan|pada|allah|tuhan|yusuf|firaun)\b/i.test(txt)
      );

      let cleanedBlock = block;
      if (englishHook) {
        stickyHook = englishHook;
        cleanedBlock = cleanedBlock
          .replace(/\*\*[^*]+\*\*/g, match => (cleanMarkdown(match) === englishHook ? " " : match))
          .replace(/\s{2,}/g, " ")
          .trim();
      }

      return cleanMarkdown(cleanedBlock)
        .replace(/^shalom,\s*/i, "")
        .replace(/\s*(tuhan yesus memberkati|god bless you)\.?$/i, "")
        .trim();
    })
    .filter(Boolean);

  const takeaways = buildAutoTakeaways(paragraphs, stickyHook);

  return {
    start_date: (meta.start_date || "").trim(),
    edition_no: (meta.edition_no || "").trim().toUpperCase(),
    date_label: (meta.date_label || "").trim().toUpperCase(),
    header_date: (meta.header_date || "").trim().toUpperCase(),
    title,
    scripture,
    sticky_hook: stickyHook,
    paragraphs,
    takeaways
  };
}

export async function getEditorsInsights() {
  const snap = await getDocs(collection(db, "editors_insights"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.start_date || b.id || "").localeCompare(a.start_date || a.id || ""));
}

export async function saveEditorsInsight(id, data) {
  const docId = id || data.start_date || undefined;
  const payload = {
    ...data,
    start_date: (data.start_date || "").trim(),
    edition_no: (data.edition_no || "").trim().toUpperCase(),
    date_label: (data.date_label || "").trim().toUpperCase(),
    header_date: (data.header_date || "").trim().toUpperCase(),
    status: data.status || "Published",
    updated_at: serverTimestamp()
  };

  if (docId) {
    await setDoc(doc(db, "editors_insights", docId), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "editors_insights"), payload);
  }
}

export async function deleteEditorsInsight(id) {
  if (!id) return;
  await deleteDoc(doc(db, "editors_insights", id));
}

// --- 0B. SUNDAY SERVICES CINEMA GALLERY CRUD (sunday_services) ---
export async function getSundayServices() {
  const snap = await getDocs(collection(db, "sunday_services"));
  return snap.docs
    .map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        service_date: (data.service_date || d.id || "").trim(),
        title: (data.title || "Sunday Service").trim(),
        speaker: (data.speaker || "").trim(),
        poster_url: cleanDashUrl(data.poster_url),
        youtube_url: cleanDashUrl(data.youtube_url),
        post_url: cleanDashUrl(data.post_url),
        published: data.published !== undefined ? Boolean(data.published) : true
      };
    })
    .sort((a, b) => (b.service_date || b.id || "").localeCompare(a.service_date || a.id || ""));
}

export async function saveSundayService(id, data) {
  const serviceDate = (data.service_date || id || "").trim();
  const docId = (id || serviceDate) || undefined;
  const payload = {
    service_date: serviceDate,
    title: (data.title || "Sunday Service").trim(),
    speaker: (data.speaker || "").trim(),
    poster_url: cleanDashUrl(data.poster_url),
    youtube_url: cleanDashUrl(data.youtube_url),
    post_url: cleanDashUrl(data.post_url),
    published: data.published !== undefined ? Boolean(data.published) : true,
    updated_at: serverTimestamp()
  };

  if (docId) {
    await setDoc(doc(db, "sunday_services", docId), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "sunday_services"), payload);
  }
}

export async function deleteSundayService(id) {
  if (!id) return;
  await deleteDoc(doc(db, "sunday_services", id));
}

export async function seedSundayServicesFromList(items = []) {
  let count = 0;
  for (const item of items) {
    const docId = (item.service_date || "").trim();
    if (!docId) continue;
    await saveSundayService(docId, item);
    count += 1;
  }
  return count;
}

// --- 1. MONTHLY THEMES ---
export async function getMonthlyThemes() {
  const snap = await getDocs(collection(db, "monthly_themes"));
  return snap.docs
    .map(d => {
      const data = d.data();
      const monthKey = (data.month_key || data.monthKey || d.id || "").trim();
      return {
        id: d.id,
        ...data,
        month_key: monthKey,
        title: data.title || data.theme_title || data.name || d.id,
        scripture: data.scripture || data.verse || "",
        narrative: data.narrative || data.description || data.focus || ""
      };
    })
    .sort((a, b) => (a.month_key || "").localeCompare(b.month_key || ""));
}

export async function saveMonthlyTheme(id, data) {
  const docId = (id || data.month_key || "").trim();
  const payload = {
    ...data,
    month_key: (data.month_key || docId || "").trim(),
    updated_at: serverTimestamp()
  };
  if (docId) {
    await setDoc(doc(db, "monthly_themes", docId), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "monthly_themes"), payload);
  }
}

export async function deleteMonthlyTheme(id) {
  if (!id) return;
  await deleteDoc(doc(db, "monthly_themes", id));
}

// --- 2. WEEKLY INSIGHTS ---
export async function getWeeklyInsights() {
  const snap = await getDocs(collection(db, "weekly_insights"));
  return snap.docs
    .map(d => {
      const data = d.data();
      const serviceDate = (data.service_date || data.date || data.week_date || d.id || "").trim();
      const monthKey = (data.month_key || data.monthKey || serviceDate.slice(0, 7) || "").trim();
      return {
        id: d.id,
        ...data,
        service_date: serviceDate,
        month_key: monthKey,
        week_label: data.week_label || data.week || "",
        title: data.title || data.theme || data.weekly_theme || serviceDate,
        key_verse: data.key_verse || data.verse || "",
        speaker: data.speaker || data.preacher || ""
      };
    })
    .sort((a, b) => (a.service_date || "").localeCompare(b.service_date || ""));
}

export async function saveWeeklyInsight(id, data) {
  const docId = (id || data.service_date || "").trim();
  const payload = {
    ...data,
    service_date: (data.service_date || docId || "").trim(),
    month_key: (data.month_key || (data.service_date || docId || "").slice(0, 7)).trim(),
    updated_at: serverTimestamp()
  };
  if (docId) {
    await setDoc(doc(db, "weekly_insights", docId), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "weekly_insights"), payload);
  }
}

export async function deleteWeeklyInsight(id) {
  if (!id) return;
  await deleteDoc(doc(db, "weekly_insights", id));
}

// --- 2B. SERMON ARCHIVES (sermon_archives) ---
export async function getSermonArchives() {
  const snap = await getDocs(collection(db, "sermon_archives"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.service_date || "").localeCompare(a.service_date || ""));
}

export async function saveSermonArchive(id, data) {
  const serviceDate = (data.service_date || "").trim();
  const docId = (id || "").trim() || undefined;
  const payload = {
    service_date: serviceDate,
    service_time: (data.service_time || "").trim(),
    service_type: (data.service_type || "Sunday Service").trim(),
    title: (data.title || "").trim(),
    speaker: (data.speaker || "").trim(),
    youtube_url: cleanDashUrl(data.youtube_url),
    post_url: cleanDashUrl(data.post_url),
    poster_url: cleanDashUrl(data.poster_url),
    linked_week_date: (data.linked_week_date || "").trim(),
    notes: (data.notes || "").trim(),
    updated_at: serverTimestamp()
  };

  if (docId) {
    await setDoc(doc(db, "sermon_archives", docId), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "sermon_archives"), payload);
  }
}

export async function deleteSermonArchive(id) {
  if (!id) return;
  await deleteDoc(doc(db, "sermon_archives", id));
}

// --- 3. DAILY REFLECTIONS (with daily_devotions fallback) ---
export async function getDailyReflections() {
  const [refSnap, devSnap] = await Promise.all([
    getDocs(query(collection(db, "daily_reflections"), orderBy("reflection_date", "desc"))).catch(() => null),
    getDocs(query(collection(db, "daily_devotions"), orderBy("devotion_date", "desc"))).catch(() => null)
  ]);

  const byDate = new Map();

  if (devSnap) {
    devSnap.docs.forEach(d => {
      const data = d.data();
      const dateKey = data.reflection_date || data.devotion_date || d.id;
      byDate.set(dateKey, {
        id: d.id,
        ...data,
        reflection_date: dateKey
      });
    });
  }

  if (refSnap) {
    refSnap.docs.forEach(d => {
      const data = d.data();
      const dateKey = data.reflection_date || data.devotion_date || d.id;
      byDate.set(dateKey, {
        id: d.id,
        ...data,
        reflection_date: dateKey
      });
    });
  }

  return Array.from(byDate.values()).sort((a, b) =>
    (b.reflection_date || "").localeCompare(a.reflection_date || "")
  );
}

export async function saveDailyReflection(id, data) {
  const dateKey = data.reflection_date || data.devotion_date || id;
  const docId = id || dateKey || undefined;
  const payload = {
    ...data,
    reflection_date: dateKey || "",
    devotion_date: dateKey || "",
    status: data.status || "Published",
    updated_at: serverTimestamp()
  };

  if (docId) {
    await setDoc(doc(db, "daily_reflections", docId), payload, { merge: true });
    await setDoc(doc(db, "daily_devotions", docId), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "daily_reflections"), payload);
  }
}

export const getDailyDevotions = getDailyReflections;
export const saveDailyDevotion = saveDailyReflection;

export async function seedNov20toDec31Reflections() {
  const count = await seedNov20toDec31Devotions();
  const snap = await getDocs(collection(db, "daily_devotions"));
  await Promise.all(
    snap.docs.map(d => {
      const data = d.data();
      const dateKey = data.reflection_date || data.devotion_date || d.id;
      return setDoc(
        doc(db, "daily_reflections", dateKey),
        {
          ...data,
          reflection_date: dateKey,
          devotion_date: dateKey,
          status: data.status || "Published",
          updated_at: serverTimestamp()
        },
        { merge: true }
      );
    })
  );
  return count;
}

// --- 4. MEDIA GALLERIES ---
export async function getMediaGalleries() {
  const snap = await getDocs(collection(db, "media_galleries"));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.event_date || "").localeCompare(a.event_date || ""));
}

export async function saveMediaGallery(id, data) {
  const payload = { ...data, updated_at: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, "media_galleries", id), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "media_galleries"), payload);
  }
}

export async function deleteContentItem(colName, id) {
  await deleteDoc(doc(db, colName, id));
}
