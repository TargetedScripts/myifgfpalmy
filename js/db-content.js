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
      title: "1. Ruang Tunggu Bukan Penjara yang Sia-Sia",
      desc: shortDesc.length > 180 ? shortDesc.slice(0, 177).trim() + "..." : shortDesc
    });
  }

  if (stickyHook) {
    takeaways.push({
      title: "2. Workshop Tuhan untuk Destinasi Kita",
      desc: stickyHook
    });
  }

  if (paragraphs[1]) {
    const sents = splitSentences(paragraphs[1]);
    const graceFocus =
      sents.find(s => /anugerah|penebusan|kristus|salib/i.test(s)) || sents[0];
    takeaways.push({
      title: `${takeaways.length + 1}. Anugerah Kristus di Tengah Penantian`,
      desc: graceFocus
    });
  }

  if (paragraphs[2]) {
    const sents = splitSentences(paragraphs[2]);
    takeaways.push({
      title: `${takeaways.length + 1}. Menjadi Pembawa Damai & Terang di Palmy`,
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
        /^[“"].*[”"].*[—–-]/.test(cleanLine))
    ) {
      scripture = cleanLine;
      return;
    }

    if (/^shalom[,.!]?$/i.test(cleanLine) || /^tuhan yesus memberkati[.!]?$/i.test(cleanLine)) {
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
        .replace(/\s*tuhan yesus memberkati\.?$/i, "")
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
  const q = query(collection(db, "editors_insights"), orderBy("start_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
const cleanDashUrl = (val = "") => {
  const t = String(val || "").trim();
  return !t || t === "-" ? "" : t;
};

export async function getSundayServices() {
  const q = query(collection(db, "sunday_services"), orderBy("service_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  const q = query(collection(db, "monthly_themes"), orderBy("month_key", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveMonthlyTheme(id, data) {
  const payload = { ...data, updated_at: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, "monthly_themes", id), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "monthly_themes"), payload);
  }
}

// --- 2. WEEKLY INSIGHTS ---
export async function getWeeklyInsights() {
  const q = query(collection(db, "weekly_insights"), orderBy("service_date", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveWeeklyInsight(id, data) {
  const payload = { ...data, updated_at: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, "weekly_insights", id), payload, { merge: true });
  } else {
    payload.created_at = serverTimestamp();
    await addDoc(collection(db, "weekly_insights"), payload);
  }
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

// Backward-compatible aliases
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
  const q = query(collection(db, "media_galleries"), orderBy("event_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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

// --- 5. ONE-CLICK SEED 2027 CURRICULUM ("ALIGN IN PURPOSE — KITAB KELUARAN") ---
export async function seedCurriculum2027() {
  const yearlyTheme = "ALIGN IN PURPOSE — Kitab Keluaran";

  const months = [
    { month_key: "2027-01", phase: "FASE 1: SEE", title: "Begin to See", scripture: "Keluaran 1–2", pillar: "Vision" },
    { month_key: "2027-02", phase: "FASE 1: SEE", title: "Discern & Assess", scripture: "Keluaran 3", pillar: "Discernment" },
    { month_key: "2027-03", phase: "FASE 1: SEE", title: "Source of Confidence", scripture: "Keluaran 4", pillar: "Humility" },
    { month_key: "2027-04", phase: "FASE 1: SEE", title: "The Constant God", scripture: "Keluaran 5–6", pillar: "Faith" },
    { month_key: "2027-05", phase: "FASE 2: WALK", title: "Tests & Testimonies", scripture: "Keluaran 7–11", pillar: "Perseverance" },
    { month_key: "2027-06", phase: "FASE 2: WALK", title: "Celebrating Promises", scripture: "Keluaran 12–13", pillar: "Praise" },
    { month_key: "2027-07", phase: "FASE 2: WALK", title: "New Ground", scripture: "Keluaran 13–14", pillar: "New Door / Courage" },
    { month_key: "2027-08", phase: "FASE 2: WALK", title: "Daily Bread", scripture: "Keluaran 15:22–16:36", pillar: "Dependence" },
    { month_key: "2027-09", phase: "FASE 3: DWELL", title: "Winning Together", scripture: "Keluaran 17–18", pillar: "Relationship / Community" },
    { month_key: "2027-10", phase: "FASE 3: DWELL", title: "Positioned to Honor", scripture: "Keluaran 19–24", pillar: "Lordship" },
    { month_key: "2027-11", phase: "FASE 3: DWELL", title: "Silent Obedience", scripture: "Keluaran 32–34", pillar: "Stillness" },
    { month_key: "2027-12", phase: "FASE 3: DWELL", title: "Presence & Purpose", scripture: "Keluaran 40", pillar: "Presence" }
  ];

  for (const m of months) {
    await setDoc(doc(db, "monthly_themes", m.month_key), {
      ...m,
      yearly_theme: yearlyTheme,
      banner_url: "",
      status: "Published",
      updated_at: serverTimestamp()
    }, { merge: true });
  }

  const weeks = [
    // JANUARI 2027
    { date: "2027-01-03", label: "Minggu 1", title: "Ketika Realitas Menindas Janji", key_verse: "Keluaran 1:12", reading: "Keluaran 1:1–14", focus: "Melihat Tuhan bekerja saat keadaan tampak berlawanan dengan janji-Nya", christ: "Yesus adalah Musa yang lebih besar yang melihat dan membebaskan umat-Nya (Ibr. 4:15–16)", mission: "Melihat dan merespons penderitaan di sekitar kita", diaspora: "Ketika hidup di tanah asing terasa menindas, Tuhan tetap bekerja", need: "Pengharapan di tengah ketidakpastian", refs: "Maz. 73:1–28; Maz. 94:1–23; Yes. 43:1–7; Yer. 29:11–14; Mat. 2:13–15; Yoh. 16:33; Rm. 8:28–39; 1 Pet. 1:6–9; Kis. 7:17–34" },
    { date: "2027-01-10", label: "Minggu 2", title: "Takut akan Tuhan di Tengah Tekanan", key_verse: "Keluaran 1:17", reading: "Keluaran 1:15–22", focus: "Visi yang benar melahirkan keberanian untuk takut akan Tuhan lebih dari manusia", christ: "Yesus takut akan Tuhan dengan sempurna dan taat sampai mati (Flp. 2:8)", mission: "Berdiri untuk kebenaran dan kehidupan meski harus berkorban", diaspora: "Tekanan budaya NZ bisa membuat kita kompromi; takut akan Tuhan lebih besar", need: "Iman di tengah sekularisme", refs: "Ams. 29:25; Mat. 10:28; Kis. 5:29; Ibr. 11:23–27; Dan. 3:16–18; Dan. 6:10–23" },
    { date: "2027-01-17", label: "Minggu 3", title: "Lahir di Tengah Badai", key_verse: "Keluaran 2:10", reading: "Keluaran 2:1–10", focus: "Tuhan bekerja di balik layar, bahkan dalam kelemahan dan kerapuhan", christ: "Yesus lahir dalam bahaya dan diselamatkan untuk misi (Mat. 2:13–15)", mission: "Melindungi yang rentan dan mempercayai pemeliharaan Tuhan", diaspora: "Anak-anak diaspora lahir di antara dua dunia — Tuhan tetap bekerja", need: "Generasi muda, identitas", refs: "Maz. 139:13–16; Yer. 1:5; Yes. 49:1–5; Luk. 1:39–45; Mat. 2:13–15; Gal. 1:15" },
    { date: "2027-01-24", label: "Minggu 4", title: "Dari Istana ke Padang Gurun", key_verse: "Keluaran 2:15", reading: "Keluaran 2:11–15", focus: "Tuhan membentuk visi melalui kegagalan dan masa penantian", christ: "Yesus meninggalkan kemuliaan surga untuk masuk ke padang gurun dunia (Flp. 2:5–7)", mission: "Merangkul kerendahan hati dan persiapan panggilan Tuhan", diaspora: "Masa penantian visa, pekerjaan, panggilan — Tuhan membentuk kita", need: "Ekonomi & pekerjaan, pengharapan", refs: "Kis. 7:20–29; Ibr. 11:24–27; Flp. 3:4–11; Maz. 105:16–22", guard: "Perjelas bahwa ini bukan pembenaran dosa Musa, tetapi kasih karunia Tuhan yang tetap bekerja melalui kesalahan kita." },
    { date: "2027-01-31", label: "Minggu 5", title: "Tuhan Mendengar, Melihat, Tahu", key_verse: "Keluaran 2:24–25", reading: "Keluaran 2:16–25", focus: "Visi yang berakar pada karakter Tuhan yang setia dan peduli", christ: "Yesus adalah respons tertinggi Tuhan atas seruan manusia (Luk. 4:18–19)", mission: "Menjadi tangan dan kaki Tuhan bagi yang berseru", diaspora: "Tuhan mendengar seruan kita yang jauh dari keluarga", need: "Kesepian, kerinduan rumah", refs: "Maz. 34:15–22; Maz. 145:18–19; Kel. 3:7–9; Yak. 5:4; 1 Pet. 3:12" },

    // FEBRUARI 2027
    { date: "2027-02-07", label: "Minggu 1", title: "Api yang Tidak Memakan", key_verse: "Keluaran 3:2–3", reading: "Keluaran 3:1–6", focus: "Discernment dimulai dengan menyadari kehadiran Tuhan di tempat yang tak terduga", christ: "Yesus adalah penyataan sempurna kekudusan Tuhan (Yoh. 1:18; Ibr. 1:1–3)", mission: "Menghampiri Tuhan dengan hormat dan mengundang orang lain berjumpa dengan-Nya", diaspora: "Tuhan hadir di rumah kontrakan, tempat kerja, kota kecil seperti Palmerston North", need: "Doa & disiplin rohani", refs: "Yes. 6:1–8; Yeh. 1:26–28; Why. 1:12–18; Kis. 9:1–9; Ibr. 12:28–29" },
    { date: "2027-02-14", label: "Minggu 2", title: "Panggilan di Tengah Rutinitas", key_verse: "Keluaran 3:7–8", reading: "Keluaran 3:7–10", focus: "Tuhan memanggil kita dari tengah kesibukan sehari-hari untuk melihat karya-Nya yang lebih besar", christ: "Yesus dipanggil dari rutinitas dunia untuk misi Bapa (Luk. 2:49)", mission: "Mengenali panggilan Tuhan dalam pekerjaan dan relasi sehari-hari", diaspora: "Panggilan Tuhan bukan hanya di gereja, tetapi di tempat kerja di NZ", need: "Pekerjaan sebagai misi", refs: "1 Sam. 3:1–10; Yes. 6:8; Mat. 4:18–22; Luk. 5:1–11; Yoh. 1:35–51", guard: "Perjelas bahwa Tuhan memanggil kita di dalam pekerjaan, bukan selalu keluar dari pekerjaan." },
    { date: "2027-02-21", label: "Minggu 3", title: "Siapa Aku? Siapa Engkau?", key_verse: "Keluaran 3:11–12", reading: "Keluaran 3:11–15", focus: "Discernment sejati menilai diri kita di hadapan Tuhan yang Mahakuasa", christ: "Yesus adalah AKU ADALAH AKU yang mengutus Musa (Yoh. 8:58)", mission: "Menemukan identitas dalam hadirat Tuhan, bukan kemampuan diri", diaspora: "Siapa aku di NZ? — identitas bukan dari status visa, tetapi dari Tuhan", need: "Identitas, generasi muda", refs: "Yes. 6:5; Yer. 1:4–10; Hak. 6:11–16; 1 Kor. 15:9–10; 1 Tim. 1:12–17" },
    { date: "2027-02-28", label: "Minggu 4", title: "Rencana yang Lebih Besar", key_verse: "Keluaran 3:16–17", reading: "Keluaran 3:16–22", focus: "Tujuan Tuhan selalu lebih besar dari pembebasan pribadi—yaitu ibadah dan kemuliaan-Nya", christ: "Misi Yesus adalah menebus semua bangsa (Why. 7:9)", mission: "Terlibat dalam misi global Tuhan, bukan hanya keselamatan pribadi", diaspora: "Tuhan memanggil kita bukan hanya untuk sukses pribadi, tetapi untuk misi", need: "Pekerjaan sebagai misi, komunitas", refs: "Kej. 12:1–3; Yes. 49:6; Mat. 28:18–20; Kis. 1:8; Why. 7:9–10" },

    // MARET 2027
    { date: "2027-03-07", label: "Minggu 1", title: "Tanda dari Tuhan", key_verse: "Keluaran 4:5", reading: "Keluaran 4:1–9", focus: "Keyakinan sejati berasal dari kuasa Tuhan, bukan kemampuan diri", christ: "Yesus adalah tanda dari kuasa Tuhan (Yoh. 2:11; Mat. 12:38–40)", mission: "Mempercayai kuasa Tuhan yang dinyatakan melalui salib dan kebangkitan", diaspora: "Keyakinan bukan dari status PR, pekerjaan, atau visa", need: "Identitas, pengharapan", refs: "Yoh. 2:11; Yoh. 20:30–31; Mat. 12:38–40; 1 Kor. 1:22–24" },
    { date: "2027-03-14", label: "Minggu 2", title: "Tuhan Memakai yang Lemah", key_verse: "Keluaran 4:12", reading: "Keluaran 4:10–17", focus: "Kerendahan hati menerima bahwa Tuhan memakai kelemahan kita untuk kemuliaan-Nya", christ: "Yesus memilih orang lemah dan tak terpelajar untuk mengubah dunia (1 Kor. 1:27–29)", mission: "Melayani Tuhan dengan keterbatasan kita, bukan menunggu sampai sempurna", diaspora: "Bekerja di bawah kualifikasi, bahasa terbatas — Tuhan tetap memakai", need: "Ekonomi & pekerjaan, identitas", refs: "1 Kor. 1:26–29; 2 Kor. 12:9–10; Hak. 6:15; Yer. 1:6–9; 1 Sam. 16:7" },
    { date: "2027-03-21", label: "Minggu 3 (Palmarum)", title: "Palmarum: Raja yang Rendah Hati", key_verse: "Filipi 2:8", reading: "Matius 21:1–11; Filipi 2:5–11", focus: "Yesus menunjukkan kerendahan hati sejati—sumber keyakinan kita bukan kekuatan duniawi", christ: "Yesus adalah Raja yang datang dalam kerendahan hati (Zak. 9:9)", mission: "Mengikuti Raja yang rendah hati dalam melayani sesama", diaspora: "Kerendahan hati di tengah budaya kompetitif NZ", need: "Iman di tengah sekularisme", refs: "Zak. 9:9; Yes. 53:1–3; Mat. 21:1–11; Yoh. 12:12–19; Flp. 2:5–11" },
    { date: "2027-03-26", label: "Khusus (Good Friday)", title: "Dia Terluka untuk Kita", key_verse: "Yesaya 53:5", reading: "Yesaya 52:13–53:12; Yohanes 18–19", focus: "Perenungan penderitaan Kristus di kayu salib", christ: "Yesus adalah Anak Domba yang disembelih bagi kita (Why. 5:6–9)", mission: "Merenungkan kasih Kristus yang menyelamatkan", diaspora: "Penderitaan Kristus menjawab penderitaan kita di perantauan", need: "Duka, kehilangan, kesehatan mental", refs: "Yes. 52:13–53:12; Maz. 22; Yoh. 18–19; 1 Pet. 2:21–25; Rm. 5:6–11", guard: "Format: Ibadah malam, pujian, perenungan, perjamuan kudus" },
    { date: "2027-03-28", label: "Minggu 4 (Paskah)", title: "Paskah: Kebangkitan, Sumber Keyakinan Kita", key_verse: "1 Korintus 15:14", reading: "1 Korintus 15:12–20; Matius 28:1–10", focus: "Kebangkitan Kristus adalah dasar keyakinan kita yang tak tergoyahkan", christ: "Yesus bangkit—keyakinan kita pada Tuhan yang hidup", mission: "Memberitakan kebangkitan sebagai pengharapan dunia", diaspora: "Kebangkitan memberi pengharapan di tengah ketidakpastian hidup", need: "Pengharapan, duka", refs: "Mat. 28:1–10; Luk. 24:1–12; Yoh. 20:1–18; 1 Kor. 15:1–58; Rm. 6:1–11" },

    // APRIL 2027
    { date: "2027-04-04", label: "Minggu 1", title: "Ketika Tuhan Tampak Diam", key_verse: "Keluaran 5:22–23", reading: "Keluaran 5:1–23", focus: "Iman tetap percaya bahwa Tuhan tetap bekerja bahkan ketika Dia tampak diam", christ: "Yesus mengalami keheningan Tuhan di kayu salib (Mat. 27:46)", mission: "Berjalan bersama mereka yang mengalami keheningan Tuhan", diaspora: "Ketika doa belum dijawab — visa, pekerjaan, keluarga", need: "Kesehatan mental, pengharapan", refs: "Maz. 13; Maz. 22:1–2; Maz. 42–43; Hab. 1:1–4; Mat. 27:46" },
    { date: "2027-04-11", label: "Minggu 2", title: "Janji yang Tidak Pernah Gagal", key_verse: "Keluaran 6:6", reading: "Keluaran 6:1–8", focus: "Tuhan mengingatkan umat-Nya akan janji-Nya yang kekal", christ: "Yesus adalah Ya dan Amin dari semua janji Tuhan (2 Kor. 1:20)", mission: "Berpegang pada janji Tuhan dan menguatkan orang lain untuk melakukannya", diaspora: "Janji Tuhan tidak bergantung pada lokasi geografis", need: "Pengharapan, kerinduan rumah", refs: "2 Kor. 1:18–22; Ibr. 6:13–20; Rm. 4:18–25; Kej. 15:1–21" },
    { date: "2027-04-18", label: "Minggu 3", title: "Mengenal Tuhan Lebih Dalam", key_verse: "Keluaran 6:7", reading: "Keluaran 6:9–13", focus: "Iman bertumbuh melalui pengenalan yang lebih dalam akan Tuhan", christ: "Yesus menyatakan Bapa dengan sempurna (Yoh. 14:9)", mission: "Bertumbuh dalam intimasi dengan Tuhan dan menolong orang lain mengenal-Nya", diaspora: "Mengenal Tuhan lebih dalam di tengah kesibukan diaspora", need: "Doa & disiplin rohani", refs: "Yoh. 17:3; Yer. 9:23–24; Hos. 6:3; Flp. 3:7–11; 2 Pet. 3:18" },
    { date: "2027-04-25", label: "Minggu 4", title: "Ketika Kekecewaan Menutup Telinga", key_verse: "Keluaran 6:9", reading: "Keluaran 6:14–30", focus: "Kekecewaan dapat menghalangi kita mendengar janji Tuhan", christ: "Yesus menghadapi penolakan tetapi tetap setia (Yes. 53:3; Yoh. 1:11)", mission: "Menolong mereka yang terlalu kecewa untuk mendengar Tuhan", diaspora: "Kekecewaan karena harapan yang tidak terwujud di tanah asing", need: "Duka, kesehatan mental", refs: "Maz. 77; 1 Raj. 19:1–18; Yun. 4:1–11; Luk. 24:13–35", guard: "Akhiri dengan pengharapan: Tuhan tetap bekerja bahkan ketika kita tidak bisa mendengar." },

    // MEI 2027
    { date: "2027-05-02", label: "Minggu 1", title: "Kuasa Tuhan Dinyatakan", key_verse: "Keluaran 7:5", reading: "Keluaran 7:1–13", focus: "Ujian pertama mengajarkan bahwa Tuhan berkuasa atas segala sesuatu", christ: "Yesus adalah Tuhan atas segala kuasa—yang sulung dari segala ciptaan (Kol. 1:15–16)", mission: "Menjadi saksi kuasa Tuhan dalam hidup sehari-hari", diaspora: "Ujian hidup di perantauan menyatakan kuasa Tuhan", need: "Pengharapan, iman sekular", refs: "Rm. 1:16–20; Kol. 1:15–20; Maz. 19:1–4; Why. 15:3–4" },
    { date: "2027-05-09", label: "Minggu 2 (Mother's Day)", title: "Mother's Day: Iman yang Diwariskan", key_verse: "2 Timotius 1:5", reading: "Keluaran 7:14–8:32; 2 Timotius 1:1–7", focus: "Ketekunan seorang ibu menanamkan iman", christ: "Yesus menghargai iman yang diwariskan (Mat. 15:28; 2 Tim. 3:15)", mission: "Menghargai dan melanjutkan warisan iman keluarga", diaspora: "Ibu diaspora menanamkan iman di tengah budaya berbeda", need: "Keluarga lintas generasi, generasi muda", refs: "2 Tim. 1:1–7; 2 Tim. 3:14–15; Ul. 6:4–9; Ams. 22:6; Ef. 6:1–4" },
    { date: "2027-05-16", label: "Minggu 3 (Pentakosta)", title: "Pentakosta: Roh Kudus, Sumber Ketekunan", key_verse: "Kisah 2:4", reading: "Kisah 2:1–13; Keluaran 9:1–12", focus: "Roh Kudus memberi kekuatan untuk bertahan dalam ujian", christ: "Yesus mengutus Roh Kudus seperti yang dijanjikan (Yoh. 14:16–17; Kis. 2:33)", mission: "Bergantung pada Roh untuk kesaksian dan ketekunan", diaspora: "Roh Kudus menolong kita bertahan di tanah asing", need: "Doa, kesehatan mental", refs: "Yoh. 14:15–27; Yoh. 16:5–15; Kis. 1:8; Rm. 8:14–27; Gal. 5:16–25" },
    { date: "2027-05-23", label: "Minggu 4", title: "Peringatan yang Diabaikan", key_verse: "Keluaran 10:3", reading: "Keluaran 9:13–10:29", focus: "Ketekunan juga berarti belajar dari peringatan Tuhan", christ: "Yesus adalah peringatan terakhir dan terbesar dari Tuhan (Ibr. 1:1–2)", mission: "Dengan kasih memperingatkan orang tentang penghakiman dan kasih karunia Tuhan", diaspora: "Peringatan Tuhan melalui Firman dan komunitas", need: "Iman sekular", refs: "Ibr. 3:7–19; Ibr. 12:25–29; Ams. 29:1; Why. 3:14–22", guard: "Bingkai dengan kasih: peringatan Tuhan adalah bentuk kasih, bukan penghakiman." },
    { date: "2027-05-30", label: "Minggu 5", title: "Malam Terakhir, Kemenangan Terbesar", key_verse: "Keluaran 11:7", reading: "Keluaran 11:1–10", focus: "Ketekunan membawa pada kemenangan yang Tuhan janjikan", christ: "Malam terakhir Yesus adalah kemenangan terbesar—salib (Yoh. 19:30)", mission: "Merayakan kemenangan Kristus dan hidup dalam kuasanya", diaspora: "Kemenangan Kristus lebih besar dari kemenangan duniawi", need: "Pengharapan", refs: "Yoh. 19:30; 1 Kor. 5:7; Kol. 2:13–15; Why. 5:6–14" },

    // JUNI 2027
    { date: "2027-06-06", label: "Minggu 1", title: "Darah yang Menyelamatkan", key_verse: "Keluaran 12:13", reading: "Keluaran 12:1–13", focus: "Pujian lahir dari kesadaran akan penebusan Tuhan", christ: "Yesus adalah Anak Domba Allah yang menghapus dosa (Yoh. 1:29; 1 Pet. 1:18–19)", mission: "Memberitakan kuasa penyelamatan darah Kristus", diaspora: "Penebusan Kristus berlaku di mana pun kita berada", need: "Identitas, pengharapan", refs: "Yoh. 1:29; 1 Pet. 1:18–19; Ibr. 9:11–14; Rm. 5:9; Why. 5:9–10" },
    { date: "2027-06-13", label: "Minggu 2", title: "Perjamuan yang Mengingatkan", key_verse: "Keluaran 12:14", reading: "Keluaran 12:14–28", focus: "Pujian yang berakar pada peringatan karya Tuhan", christ: "Yesus menetapkan perjamuan kudus sebagai peringatan (Luk. 22:19–20)", mission: "Secara rutin mengingat dan merayakan pengorbanan Kristus", diaspora: "Perjamuan kudus mengingatkan kita akan rumah sejati", need: "Kerinduan rumah, doa", refs: "Luk. 22:14–20; Yoh. 6:53–58; 1 Kor. 11:23–34", guard: "Fokus makna peringatan, bukan denominasi atau praktik Perjamuan Kudus." },
    { date: "2027-06-20", label: "Minggu 3", title: "Keluar dengan Tangan Terangkat", key_verse: "Keluaran 12:42", reading: "Keluaran 12:29–42", focus: "Pujian adalah respons atas pembebasan Tuhan", christ: "Yesus membebaskan kita dari perbudakan dosa (Gal. 5:1)", mission: "Menolong orang lain mengalami pembebasan dalam Kristus", diaspora: "Pembebasan dari perbudakan dosa — bukan dari tekanan hidup", need: "Identitas, pengharapan", refs: "Gal. 5:1; Rm. 6:15–23; Yoh. 8:31–36; 2 Kor. 5:17" },
    { date: "2027-06-27", label: "Minggu 4", title: "Dibimbing oleh Tuhan", key_verse: "Keluaran 13:21", reading: "Keluaran 13:17–22", focus: "Pujian mengiringi perjalanan yang dipimpin Tuhan", christ: "Yesus adalah tiang awan dan api kita (Yoh. 8:12; Ibr. 12:2)", mission: "Mengikuti dan menolong orang lain mengikuti pimpinan Tuhan", diaspora: "Tuhan memimpin perjalanan diaspora kita", need: "Kerinduan rumah, pengharapan", refs: "Yoh. 8:12; Yoh. 10:1–5; Maz. 23; Yes. 30:21; Ibr. 12:1–2" },

    // JULI 2027
    { date: "2027-07-04", label: "Minggu 1", title: "Jalan yang Tidak Terduga", key_verse: "Keluaran 13:18", reading: "Keluaran 13:17–22", focus: "Keberanian mengikuti jalan Tuhan meskipun tidak seperti yang kita bayangkan", christ: "Yesus mengambil jalan salib yang tak terduga (Luk. 24:26)", mission: "Mempercayai jalan Tuhan yang tak terduga dalam hidup kita", diaspora: "Meninggalkan Indonesia menuju NZ adalah jalan yang tak terduga", need: "Kerinduan rumah, identitas", refs: "Yes. 55:8–9; Ams. 3:5–6; Kej. 12:1–9; Kis. 16:6–10" },
    { date: "2027-07-11", label: "Minggu 2", title: "Terjepit di Antara Dua", key_verse: "Keluaran 14:13", reading: "Keluaran 14:1–14", focus: "Keberanian berdiri teguh ketika berada di posisi yang sulit", christ: "Yesus berdiri teguh saat dikepung musuh (Yoh. 18:4–6)", mission: "Menolong orang lain berdiri teguh di masa sulit", diaspora: "Terjepit antara budaya Indonesia dan NZ — di antara dua dunia", need: "Identitas, generasi muda, keluarga lintas generasi", refs: "Maz. 46; 2 Taw. 20:1–30; Yes. 41:10–14; Rm. 8:31–39", guard: "Berikan contoh konkret: keputusan pekerjaan, keluarga, panggilan." },
    { date: "2027-07-18", label: "Minggu 3", title: "Laut Terbelah", key_verse: "Keluaran 14:21–22", reading: "Keluaran 14:15–31", focus: "Tuhan membuka jalan baru ketika kita melangkah dengan iman", christ: "Yesus adalah jalan melalui yang mustahil (Yoh. 14:6)", mission: "Memimpin orang melewati situasi mustahil dengan iman", diaspora: "Tuhan membuka jalan di tanah baru — pekerjaan, komunitas, panggilan", need: "Ekonomi & pekerjaan, pengharapan", refs: "Yes. 43:1–7; Maz. 77:16–20; 1 Kor. 10:1–4; Rm. 6:1–4" },
    { date: "2027-07-25", label: "Minggu 4", title: "Nyanyian Kemenangan", key_verse: "Keluaran 15:2", reading: "Keluaran 15:1–21", focus: "Keberanian melahirkan pujian atas teritori baru yang Tuhan berikan", christ: "Yesus menyanyikan kemenangan atas dosa dan maut (Ibr. 2:12; Why. 15:3)", mission: "Menyanyikan pujian Tuhan di antara segala bangsa", diaspora: "Pujian di tanah asing — menyanyikan kemenangan Tuhan", need: "Kerinduan rumah, komunitas", refs: "Maz. 118; Why. 15:1–4; Kel. 15:1–21; 2 Sam. 22" },

    // AGUSTUS 2027
    { date: "2027-08-01", label: "Minggu 1", title: "Dari Pahit ke Manis", key_verse: "Keluaran 15:25", reading: "Keluaran 15:22–27", focus: "Tuhan menyembuhkan yang pahit sebelum memberi roti", christ: "Yesus mengubah pahitnya salib menjadi manisnya kebangkitan (Ibr. 12:2)", mission: "Menghibur orang lain dengan penghiburan yang kita terima", diaspora: "Kepahitan hidup di perantauan — Tuhan menyembuhkan", need: "Duka, kesehatan mental", refs: "Rm. 5:3–5; Yak. 1:2–4; 1 Pet. 1:6–9; 2 Kor. 4:16–18", guard: "M1 (Mara) adalah pendahuluan — sebelum roti, Tuhan menyembuhkan. Pemeliharaan Tuhan holistik." },
    { date: "2027-08-08", label: "Minggu 2", title: "Bersungut-sungut di Padang Gurun", key_verse: "Keluaran 16:3", reading: "Keluaran 16:1–3", focus: "Tuhan mendengar keluhan umat-Nya", christ: "Yesus tidak pernah bersungut-sungut tetapi percaya Bapa (1 Pet. 2:22–23)", mission: "Menjadi teladan kepercayaan, bukan keluhan, bagi komunitas", diaspora: "Keluhan tentang hidup di NZ — Tuhan mendengar", need: "Kesehatan mental, pengharapan", refs: "Flp. 2:14–16; 1 Kor. 10:1–13; Maz. 106:6–33; Ibr. 3:7–19" },
    { date: "2027-08-15", label: "Minggu 3", title: "Roti dari Surga", key_verse: "Keluaran 16:4", reading: "Keluaran 16:4–12", focus: "Tuhan menyediakan kebutuhan kita dengan cara yang ajaib", christ: "Yesus adalah Roti Hidup yang sejati (Yoh. 6:35, 48–51)", mission: "Membagikan Roti Hidup kepada dunia yang lapar", diaspora: "Tuhan menyediakan kebutuhan di tanah asing", need: "Ekonomi & pekerjaan, pekerjaan sebagai misi", refs: "Yoh. 6:25–58; 1 Kor. 10:1–4; Mat. 6:11; Luk. 11:1–4" },
    { date: "2027-08-22", label: "Minggu 4", title: "Cukup untuk Hari Ini", key_verse: "Keluaran 16:18", reading: "Keluaran 16:13–21", focus: "Ketergantungan harian pada pemeliharaan Tuhan", christ: "Yesus mengajarkan kita berdoa untuk roti hari ini (Mat. 6:11)", mission: "Hidup cukup dan menolong orang lain menemukan kecukupan dalam Kristus", diaspora: "Cukup untuk hari ini — melawan kecemasan akan masa depan", need: "Kesehatan mental, ekonomi", refs: "Mat. 6:25–34; Flp. 4:10–20; 1 Tim. 6:6–10; Ams. 30:7–9", guard: "Perjelas: cukup untuk hari ini bukan berarti tidak merencanakan, tetapi tidak kuatir." },
    { date: "2027-08-29", label: "Minggu 5", title: "Manna yang Tidak Pernah Berhenti", key_verse: "Keluaran 16:35", reading: "Keluaran 16:22–36", focus: "Kesetiaan Tuhan dalam menyediakan dari generasi ke generasi", christ: "Yesus tetap sama kemarin, hari ini, dan selamanya (Ibr. 13:8)", mission: "Mewariskan kesetiaan Tuhan kepada generasi berikutnya", diaspora: "Kesetiaan Tuhan bagi generasi diaspora berikutnya", need: "Keluarga lintas generasi, generasi muda", refs: "Ibr. 13:8; Maz. 105; Ul. 8:1–20; Rat. 3:22–24" },

    // SEPTEMBER 2027
    { date: "2027-09-05", label: "Minggu 1 (Father's Day)", title: "Father's Day: Teladan Iman Seorang Ayah", key_verse: "Efesus 6:4", reading: "Keluaran 17:8–16; Efesus 6:1–4", focus: "Peran ayah membangun komunitas iman di keluarga", christ: "Yesus menunjukkan Bapa yang memimpin dengan kasih (Yoh. 5:19–20)", mission: "Ayah membangun iCare pertama di rumah", diaspora: "Ayah diaspora memimpin keluarga di tengah tekanan budaya", need: "Keluarga lintas generasi, generasi muda", refs: "Ul. 6:4–9; Ams. 22:6; Yos. 24:14–15; Maz. 78:1–8; Kol. 3:21" },
    { date: "2027-09-12", label: "Minggu 2", title: "Ketika Kesaksian Membangun Komunitas", key_verse: "Keluaran 18:8", reading: "Keluaran 18:1–12", focus: "Berbagi kesaksian memperluas dan membangun komunitas", christ: "Karya Yesus bersaksi bahwa Bapa mengutus Dia (Yoh. 5:36)", mission: "Membagikan kesaksian untuk membangun iman orang lain", diaspora: "Kesaksian tentang Tuhan yang setia di perantauan", need: "Kesepian, komunitas", refs: "Kis. 1:8; 1 Pet. 3:15–16; Why. 12:11; Maz. 66:16; Yoh. 4:28–30" },
    { date: "2027-09-19", label: "Minggu 3", title: "Bijak dalam Membagi Beban", key_verse: "Keluaran 18:21–22", reading: "Keluaran 18:13–27", focus: "Kepemimpinan yang melibatkan orang lain adalah kunci kemenangan bersama", christ: "Yesus mendelegasikan pelayanan kepada murid-murid-Nya (Luk. 9:1–6)", mission: "Memperlengkapi dan memberdayakan orang lain untuk pelayanan", diaspora: "Membangun iCare yang sehat di tengah kesibukan diaspora", need: "Komunitas, kesehatan mental", refs: "Kis. 6:1–7; 2 Tim. 2:2; 1 Kor. 12:12–31; Ef. 4:11–16" },
    { date: "2027-09-26", label: "Minggu 4", title: "Satu Tubuh, Satu Tujuan", key_verse: "Keluaran 18:24", reading: "Keluaran 18:24–27", focus: "Hubungan yang kuat menghasilkan dampak yang berkelanjutan", christ: "Yesus mendoakan kesatuan pengikut-Nya (Yoh. 17:20–23)", mission: "Membangun komunitas yang bersatu yang mencerminkan kasih Kristus", diaspora: "Gereja Indonesia di NZ adalah keluarga rohani", need: "Kesepian, komunitas", refs: "Yoh. 17:20–23; Ef. 4:1–6; 1 Kor. 1:10–17; Flp. 2:1–11" },

    // OKTOBER 2027
    { date: "2027-10-03", label: "Minggu 1", title: "Bertemu dengan Tuhan", key_verse: "Keluaran 19:5–6", reading: "Keluaran 19:1–15", focus: "Posisi yang benar di hadapan Tuhan menuntut kekudusan", christ: "Yesus membuka tabir yang memisahkan kita dari Tuhan (Mat. 27:51; Ibr. 10:19–20)", mission: "Menolong orang lain berjumpa dengan Tuhan yang hidup", diaspora: "Bertemu Tuhan di tengah masyarakat sekuler", need: "Iman sekular, doa", refs: "Ibr. 12:18–29; 1 Pet. 2:9–10; Ibr. 10:19–25; Why. 1:5–6" },
    { date: "2027-10-10", label: "Minggu 2", title: "Tuhan yang Kudus", key_verse: "Keluaran 19:21", reading: "Keluaran 19:16–25", focus: "Mengakui kedaulatan Tuhan atas hidup kita", christ: "Yesus adalah Raja yang kudus yang memerintah dengan adil (Why. 15:3–4; Ibr. 1:8)", mission: "Mengejar kekudusan dan mengundang orang lain melakukannya", diaspora: "Kedaulatan Tuhan atas hidup di tanah asing", need: "Iman sekular, identitas", refs: "Yes. 6:1–8; Why. 4:1–11; Ibr. 12:28–29; 1 Pet. 1:13–21" },
    { date: "2027-10-17", label: "Minggu 3", title: "Hukum Pertama", key_verse: "Keluaran 20:3", reading: "Keluaran 20:1–11", focus: "Tuhan harus menjadi yang pertama dan utama", christ: "Yesus adalah Tuhan atas hari Sabat (Mat. 12:8)", mission: "Menempatkan Tuhan pertama dan menolong orang lain melakukannya", diaspora: "Tuhan pertama di atas pekerjaan, keluarga, visa", need: "Prioritas, pekerjaan sebagai misi", refs: "Mat. 22:34–40; Mat. 4:10; Ul. 6:4–5; 1 Kor. 8:4–6" },
    { date: "2027-10-24", label: "Minggu 4", title: "Hukum Kedua & Keadilan Sosial", key_verse: "Keluaran 20:12", reading: "Keluaran 20:12–17; 22:21–27", focus: "Menghormati Tuhan terwujud dalam keadilan bagi sesama, terutama yang lemah", christ: "Yesus merangkum hukum sebagai kasih kepada Tuhan dan sesama (Mat. 22:37–40)", mission: "Menghormati orang lain sebagai gambar Allah, terutama yang rentan", diaspora: "Keadilan bagi orang asing — kita sendiri orang asing di NZ", need: "Komunitas, keadilan", refs: "Mat. 22:39; Im. 19:9–18; Yak. 1:27; Mi. 6:8; Ams. 31:8–9" },
    { date: "2027-10-31", label: "Minggu 5", title: "Perjanjian yang Dimeteraikan", key_verse: "Keluaran 24:7", reading: "Keluaran 24:1–18", focus: "Komitmen perjanjian adalah wujud kedaulatan Tuhan atas hidup kita", christ: "Yesus adalah perantara perjanjian baru yang dimeteraikan dengan darah-Nya (Luk. 22:20; Ibr. 9:15)", mission: "Hidup dalam komitmen perjanjian dan memimpin orang lain melakukannya", diaspora: "Komitmen pernikahan, keluarga, gereja di tengah tekanan diaspora", need: "Pernikahan, keluarga lintas generasi", refs: "Ibr. 9:15–22; Ibr. 8:6–13; Luk. 22:20; Yer. 31:31–34", guard: "Berikan aplikasi praktis: kedaulatan Tuhan dalam keputusan sehari-hari dan komitmen gerejawi." },

    // NOVEMBER 2027
    { date: "2027-11-07", label: "Minggu 1", title: "Menanti di Kaki Gunung", key_verse: "Keluaran 32:1", reading: "Keluaran 32:1–14", focus: "Menanti dengan sabar tanpa berpaling kepada berhala", christ: "Yesus menanti waktu Bapa dengan sabar (Yoh. 7:6)", mission: "Menolong orang menanti tanpa berpaling kepada berhala modern", diaspora: "Berhala modern diaspora: uang, status, hiburan, pekerjaan", need: "Iman sekular, pengharapan", refs: "Maz. 27:14; Yes. 40:28–31; Rat. 3:25–26; Yak. 5:7–11" },
    { date: "2027-11-14", label: "Minggu 2", title: "Murka yang Kudus", key_verse: "Keluaran 32:19", reading: "Keluaran 32:15–35", focus: "Dosa mendukakan hati Tuhan; bertobat dengan sungguh", christ: "Yesus menyucikan Bait Suci dalam murka yang kudus (Yoh. 2:13–17)", mission: "Menghadapi dosa dengan kasih dan memulihkan yang jatuh", diaspora: "Pertobatan dari dosa yang tersembunyi di tanah asing", need: "Pengampunan, kesehatan mental", refs: "Rm. 1:18–32; Why. 6:15–17; Yoh. 2:13–22; 1 Tes. 1:9–10", guard: "Tekankan: murka Tuhan selalu adil dan terarah pada dosa, bukan pada pribadi manusia. Yesus menanggung murka itu bagi kita." },
    { date: "2027-11-21", label: "Minggu 3", title: "Hadirat yang Menyertai", key_verse: "Keluaran 33:14", reading: "Keluaran 33:1–23", focus: "Hadirat Tuhan adalah sumber ketenangan sejati", christ: "Yesus adalah penyertaan Tuhan yang sempurna—Aku menyertai kamu senantiasa (Mat. 28:20)", mission: "Membawa hadirat Tuhan ke setiap bidang kehidupan", diaspora: "Tuhan menyertai kita di mana pun — di NZ, di Indonesia, di mana saja", need: "Kesepian, kerinduan rumah", refs: "Mat. 28:18–20; Yos. 1:5–9; Maz. 23; Rm. 8:38–39" },
    { date: "2027-11-28", label: "Minggu 4 (Advent 1)", title: "Advent 1: Wajah yang Bercahaya", key_verse: "Keluaran 34:29", reading: "Keluaran 34:1–35; Yesaya 40:1–5", focus: "Ketaatan yang tenang memancarkan kemuliaan Tuhan", christ: "Yesus adalah cahaya kemuliaan Tuhan (Ibr. 1:3; 2 Kor. 4:6)", mission: "Memancarkan kemuliaan Tuhan kepada dunia", diaspora: "Ketaatan di tengah tekanan budaya memancarkan kemuliaan Tuhan", need: "Iman sekular, identitas", refs: "2 Kor. 3:7–18; Mat. 17:1–8; Yes. 60:1–5; Why. 21:22–27", guard: "Catatan Kalender: 28 November 2027 adalah Advent 1." },

    // DESEMBER 2027
    { date: "2027-12-05", label: "Minggu 1", title: "Tuhan Memerintah dengan Detail", key_verse: "Keluaran 40:16", reading: "Keluaran 40:1–16", focus: "Ketaatan dalam hal-hal kecil mencerminkan hadirat Tuhan", christ: "Yesus taat kepada Bapa dalam setiap detail (Yoh. 8:29)", mission: "Taat kepada Tuhan dalam hal-hal kecil", diaspora: "Tuhan peduli detail hidup kita — pekerjaan, keluarga, visa", need: "Ekonomi & pekerjaan, iman sekular", refs: "Luk. 16:10; Mat. 25:21; Kol. 3:23–24; 1 Kor. 10:31" },
    { date: "2027-12-12", label: "Minggu 2", title: "Kemuliaan Tuhan Memenuhi", key_verse: "Keluaran 40:34", reading: "Keluaran 40:17–38", focus: "Tujuan Tuhan digenapi ketika kemuliaan-Nya memenuhi hidup kita", christ: "Yesus adalah tabernakel sejati tempat kemuliaan Tuhan berdiam (Yoh. 1:14)", mission: "Mengundang hadirat Tuhan masuk ke dalam komunitas kita", diaspora: "Kemuliaan Tuhan memenuhi rumah, keluarga, komunitas diaspora", need: "Kerinduan rumah, komunitas", refs: "Yoh. 1:14; 1 Raj. 8:10–11; Yes. 6:1–4; 2 Kor. 3:18" },
    { date: "2027-12-19", label: "Minggu 3 (Advent 4)", title: "Advent 4: Persiapan untuk Hadirat", key_verse: "Yesaya 40:3", reading: "Yesaya 40:1–5; Lukas 1:76–79; Keluaran 40:34–38", focus: "Advent adalah masa persiapan hati untuk menyambut kedatangan Kristus", christ: "Yesus adalah Raja yang datang yang kita persiapkan", mission: "Mempersiapkan hati untuk kedatangan Kristus dan kembali-Nya", diaspora: "Mempersiapkan hati menyambut Kristus di tengah kesibukan Natal", need: "Doa, pengharapan", refs: "Mal. 3:1–4; Yes. 40:1–11; Mat. 3:1–12; Luk. 1:76–79" },
    { date: "2027-12-26", label: "Minggu 4 (Natal)", title: "Natal: Imanuel, Tuhan Beserta Kita", key_verse: "Matius 1:23", reading: "Matius 1:18–25; Lukas 2:1–20; Keluaran 40:34–38", focus: "Tuhan datang tinggal bersama kita", christ: "Yesus adalah Imanuel—Tuhan beserta kita", mission: "Merayakan dan membagikan karunia hadirat Tuhan", diaspora: "Imanuel — Tuhan beserta kita di NZ, jauh dari rumah", need: "Kerinduan rumah, duka, kesepian, pengharapan", refs: "Yes. 7:14; Yes. 9:6–7; Luk. 2:1–20; Yoh. 1:1–18; Flp. 2:5–11" }
  ];

  for (const w of weeks) {
    const monthKey = w.date.slice(0, 7);
    await setDoc(doc(db, "weekly_insights", w.date), {
      service_date: w.date,
      month_key: monthKey,
      week_label: w.label,
      title: w.title,
      key_verse: w.key_verse,
      scripture_reading: w.reading,
      weekly_focus: w.focus,
      christ_connection: w.christ,
      mission_application: w.mission,
      diaspora_lens: w.diaspora,
      pastoral_need: w.need,
      cross_references: w.refs,
      guardrail_notes: w.guard || "",
      sermon_summary: "",
      icare_questions: "",
      status: "Scheduled",
      updated_at: serverTimestamp()
    }, { merge: true });
  }
}
