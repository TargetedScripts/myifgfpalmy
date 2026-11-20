// js/seed-2027.js
import { db } from "./firebase-config.js";
import {
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const MONTHS_2027 = [
  { month_key: "2027-01", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "GOD SEES OUR CRY", subtitle: "Tuhan Melihat & Mendengar Seruan Umat-Nya", pillar: "Compassionate Awareness", scripture: "Keluaran 1–3" },
  { month_key: "2027-02", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "CALLED BY NAME", subtitle: "Dipanggil & Diutus dari Semak Berduri", pillar: "Identity & Calling", scripture: "Keluaran 3–4" },
  { month_key: "2027-03", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "LET MY PEOPLE GO", subtitle: "Kuasa Tuhan Mengalahkan Setiap Belenggu", pillar: "Spiritual Breakthrough", scripture: "Keluaran 5–11" },
  { month_key: "2027-04", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "THE PASSOVER LAMB", subtitle: "Darah Anak Domba & Pembebasan Sejati", pillar: "Redemption in Christ", scripture: "Keluaran 12–13" },
  { month_key: "2027-05", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "CROSSING THE RED SEA", subtitle: "Melangkah dengan Iman di Tengah Jalan Buntu", pillar: "Faith in Action", scripture: "Keluaran 14–15" },
  { month_key: "2027-06", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "BREAD FROM HEAVEN", subtitle: "Pemeliharaan Tuhan Sehari demi Sehari di Padang Gurun", pillar: "Daily Dependence", scripture: "Keluaran 16–17" },
  { month_key: "2027-07", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "SHARED LEADERSHIP", subtitle: "Membangun Komunitas yang Saling Menopang", pillar: "Healthy Community", scripture: "Keluaran 18" },
  { month_key: "2027-08", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "COVENANT AT SINAI", subtitle: "Hidup Kudus sebagai Umat Perjanjian", pillar: "Obedience & Holiness", scripture: "Keluaran 19–24" },
  { month_key: "2027-09", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "A PLACE TO DWELL", subtitle: "Membangun Rumah Tempat Tuhan Berdiam", pillar: "God's Presence", scripture: "Keluaran 25–31" },
  { month_key: "2027-10", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "GRACE AFTER FAILURE", subtitle: "Pemulihan & Kasih Karunia di Balik Anak Lembu Emas", pillar: "Restoration & Mercy", scripture: "Keluaran 32–34" },
  { month_key: "2027-11", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "WILLING HEARTS", subtitle: "Memberi yang Terbaik untuk Pekerjaan Tuhan", pillar: "Generous Stewardship", scripture: "Keluaran 35–39" },
  { month_key: "2027-12", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "GLORY FILLS THE HOUSE", subtitle: "Kemuliaan Tuhan Memenuhi Kemah Suci & Hidup Kita", pillar: "Spirit-Filled Mission", scripture: "Keluaran 40" }
];

function getSundaysOf2027() {
  const sundays = [];
  const d = new Date(Date.UTC(2027, 0, 3)); // Sunday, 3 Jan 2027
  while (d.getUTCFullYear() === 2027) {
    sundays.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return sundays;
}

export async function seed2027Curriculum() {
  const batch = writeBatch(db);
  const monthMap = Object.fromEntries(MONTHS_2027.map(m => [m.month_key, m]));

  MONTHS_2027.forEach(m => {
    batch.set(
      doc(db, "monthly_themes", m.month_key),
      {
        ...m,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  });

  const sundays = getSundaysOf2027();
  sundays.forEach((dateStr, idx) => {
    const monthKey = dateStr.slice(0, 7);
    const mInfo = monthMap[monthKey] || MONTHS_2027[0];
    const weekNum = idx + 1;

    batch.set(
      doc(db, "weekly_insights", dateStr),
      {
        service_date: dateStr,
        month_key: monthKey,
        week_label: `Week ${weekNum} • 2027`,
        title: `${mInfo.title} (Part ${(idx % 4) + 1})`,
        key_verse: mInfo.scripture,
        scripture_reading: mInfo.scripture,
        weekly_focus: mInfo.subtitle,
        christ_connection: "",
        mission_application: "",
        diaspora_lens: "Align in Purpose — IFGF Palmerston North",
        sermon_summary: "",
        icare_questions: "",
        status: "Scheduled",
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  });

  await batch.commit();
  return { months: MONTHS_2027.length, weeks: sundays.length };
}
