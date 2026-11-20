// js/seed-2026-compass.js
import { db } from "./firebase-config.js";
import {
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COMPASS_2026_MONTHS = [
  {
    month_key: "2026-10",
    phase: "2026 — ALIGN IN PROMISE",
    title: "LABOR AND PURPOSE",
    subtitle: "Kerja dan Tujuan — Menemukan Makna Ilahi dan Panggilan dalam Pekerjaan",
    pillar: "Faithfulness in Work",
    scripture: "Kejadian 29–31",
    compass_intro:
      "Bulan Oktober ini kita memasuki tema “Labor and Purpose” — kerja dan tujuan. Fokus kita: Makna ilahi dalam pekerjaan. Kita akan belajar dari perjalanan Yakub: dari bekerja 14 tahun untuk cinta, menghadapi mertua yang curang, hingga akhirnya pulang dengan berkat. Bulan ini adalah tentang menemukan bahwa pekerjaan kita—studi, karir, pelayanan—bukan sekadar rutinitas, tetapi panggilan ilahi yang memiliki tujuan kekal.",
    monthly_reflection:
      "Kamu pikir ini bulan tentang pekerjaan yang melelahkan dan tidak dihargai. Ternyata ini bulan tentang Tuhan yang melihat setiap jerih payahmu. Kamu pikir kerja kerasmu hanya untuk bertahan hidup. Ternyata kerja kerasmu adalah bagian dari panggilan yang lebih besar. Kamu pikir ini tentang berapa banyak yang kamu dapatkan. Ternyata ini tentang siapa yang kamu percayai di tengah ketidakadilan. Yakub bekerja untuk Laban, tapi Tuhan yang bekerja untuk Yakub. Bukan tentang apa yang kamu kerjakan. Tapi tentang siapa yang menjadi saksi dalam setiap langkahmu. Tuhan melihat. Tuhan membela. Dan pada waktu-Nya, Dia akan memanggilmu pulang—dengan berkat yang tidak pernah kamu duga."
  },
  {
    month_key: "2026-11",
    phase: "2026 — ALIGN IN PROMISE",
    title: "DREAMS AND VISIONS",
    subtitle: "Mimpi dan Visi — Percaya Bahwa Tuhan Masih Berbicara di Masa Sulit",
    pillar: "Trust in God's Timing",
    scripture: "Kejadian 40–41",
    compass_intro:
      "Bulan November ini kita memasuki tema “Dreams and Visions” — mimpi dan visi. Fokus kita: Mimpi di masa sulit. Kita akan belajar dari perjalanan Yusuf: dari penjara yang gelap, dari mimpi yang terasa mati, hingga ia naik ke istana. Bulan ini adalah tentang percaya bahwa Tuhan masih berbicara bahkan ketika semua pintu terasa tertutup.",
    monthly_reflection:
      "Kamu pikir ini bulan tentang mimpi yang mati dan doa yang tidak dijawab. Ternyata ini bulan tentang Tuhan yang bekerja dalam diam—ketika semua orang lupa, Dia tetap mengingat. Kamu pikir penjara adalah akhir dari ceritamu. Ternyata penjara adalah ruang persiapan untuk istana. Kamu pikir dua tahun yang terbuang sia-sia. Ternyata dua tahun itu adalah dua tahun yang membentuk karaktermu. Bukan tentang seberapa cepat mimpimu terwujud. Tapi tentang siapa yang tetap setia ketika mimpimu terasa mati. Yusuf tidak mengejar istana. Dia tetap setia di penjara. Dan pada waktu-Nya, Tuhan sendiri yang membawanya naik. Mimpimu belum mati. Tuhan masih berbicara. Dan Dia tidak pernah lupa."
  },
  {
    month_key: "2026-12",
    phase: "2026 — ALIGN IN PROMISE",
    title: "LIVING IN ABUNDANCE",
    subtitle: "Hidup dalam Kelimpahan — Menerima dan Mengelola Berkat untuk Menjadi Saluran bagi Sesama",
    pillar: "Stewardship & Generosity",
    scripture: "Kejadian 41:46–57 & Lukas 2",
    compass_intro:
      "Bulan Desember ini kita memasuki tema “Living in Abundance” — hidup dalam kelimpahan. Fokus kita: Kelimpahan untuk menjadi berkat. Kita akan melihat bagaimana Yusuf mengelola tujuh tahun kelimpahan dan tujuh tahun kelaparan—bukan untuk menimbun bagi dirinya sendiri, tetapi untuk menyelamatkan seluruh negeri. Bulan ini adalah tentang bersyukur atas setiap pemeliharaan Tuhan sepanjang tahun dan menjadi saluran berkat di musim Natal ini.",
    monthly_reflection:
      "Kamu pikir kelimpahan hanya diukur dari angka di rekening atau kemewahan yang terlihat mata. Ternyata kelimpahan sejati adalah ketika Tuhan mencukupkan hidupmu di tengah musim yang kering, dan memampukan tanganmu terbuka untuk memberi. Yusuf diberkati bukan agar lumbungnya penuh sendiri, tetapi agar banyak nyawa terpelihara. Dan di musim Natal ini, kita melihat kelimpahan terbesar surga hadir dalam palungan—Yesus Kristus yang memberikan diri-Nya bagi kita. Terima kasih untuk setiap langkah sepanjang 2026. Hidupmu diberkati untuk menjadi berkat."
  }
];

const COMPASS_2026_WEEKS = [
  // NOVEMBER 2026
  {
    service_date: "2026-11-01",
    month_key: "2026-11",
    week_label: "Minggu 1 • Nov 2026",
    speaker: "Sendiron Enumbi",
    title: "Yusuf di Penjara: Mimpi Masih Hidup",
    key_verse: "Kejadian 40:8",
    scripture_reading: "Kejadian 40:1–23",
    weekly_focus:
      "Yusuf bisa saja berkata, “Mimpiku mati di penjara ini.” Tapi Tuhan masih memberi mimpi kepada kepala juru minuman dan kepala juru roti. Dan Yusuf masih bisa menafsirkannya. Di tengah studimu yang berat, pekerjaan yang melelahkan, atau proses yang tidak pasti: Tuhan masih berbicara. Mimpi-mu belum mati.",
    diaspora_lens: "Tetap setia melayani sesama meski sedang berada di musim studi atau karir yang penuh ketidakpastian di NZ.",
    status: "Published"
  },
  {
    service_date: "2026-11-08",
    month_key: "2026-11",
    week_label: "Minggu 2 • Nov 2026",
    speaker: "Ps. Jack Christi Nussi",
    title: "Dua Tahun yang Terasa Abadi",
    key_verse: "Kejadian 40:23",
    scripture_reading: "Kejadian 40:14–23; 41:1",
    weekly_focus:
      "Yusuf berkata pada kepala juru minuman: “Ingatlah aku.” Tapi sesudah dipulihkan, orang itu lupa. Dua tahun lagi Yusuf di penjara. Bagi yang merasa “dilupakan” oleh orang yang pernah berjanji: Tuhan tidak lupa. Waktu Tuhan berbeda. Dua tahun bagi Tuhan adalah persiapan untuk satu malam yang mengubah segalanya.",
    diaspora_lens: "Menunggu proses visa, kelulusan, atau panggilan kerja yang tertunda dengan iman bahwa Tuhan tidak pernah melupakan anak-Nya.",
    status: "Published"
  },
  {
    service_date: "2026-11-15",
    month_key: "2026-11",
    week_label: "Minggu 3 • Nov 2026",
    speaker: "Tedy Sutedja",
    title: "Firaun Bermimpi: Dari Penjara ke Istana",
    key_verse: "Kejadian 41:14",
    scripture_reading: "Kejadian 41:1–32",
    weekly_focus:
      "Dua tahun setelah dilupakan, Yusuf dipanggil ke istana. Bukan karena dia hebat, tapi karena Tuhan masih bicara. Bagi yang merasa “terlambat” dibanding teman-temanmu: ingatlah bahwa Tuhan bekerja dalam timing-Nya sendiri. Tidak terlambat. Tidak pernah terlambat.",
    diaspora_lens: "Berhenti membandingkan garis waktu hidup kita dengan orang lain; Tuhan punya waktu yang tepat untuk setiap panggilan.",
    status: "Published"
  },
  {
    service_date: "2026-11-22",
    month_key: "2026-11",
    week_label: "Minggu 4 • Nov 2026",
    speaker: "Tikva Mooy",
    title: "Kaus Mesir: Hidup yang Berubah dalam Semalam",
    key_verse: "Kejadian 41:39–41",
    scripture_reading: "Kejadian 41:33–45",
    weekly_focus:
      "Dalam satu malam, Yusuf naik dari penjara ke istana. Masa-masa gelap penjara, tahun-tahun yang terasa sia-sia, bukanlah buang-buang waktu. Itu adalah persiapan untuk panggilan yang lebih besar. Bagi yang sedang dalam “penjara”—percayalah, suatu saat Tuhan akan berkata, “Sekarang waktunya.”",
    diaspora_lens: "Setiap musim tersembunyi di Palmerston North sedang membentuk kapasitas kepemimpinan kita untuk masa depan.",
    status: "Published"
  },
  {
    service_date: "2026-11-29",
    month_key: "2026-11",
    week_label: "Minggu 5 • Nov 2026",
    speaker: "Tedy Sutedja",
    title: "Tujuh Tahun Kelimpahan, Tujuh Tahun Kelaparan",
    key_verse: "Kejadian 41:48–49",
    scripture_reading: "Kejadian 41:46–57",
    weekly_focus:
      "Yusuf tidak menimbun gandum untuk dirinya sendiri. Dia mengelola kelimpahan untuk menyelamatkan Mesir dan seluruh dunia dari kelaparan. Inilah puncak mimpi Yusuf: bukan sekadar sukses pribadi, tapi menjadi berkat bagi banyak orang. Kesuksesanmu bukan hanya untukmu. Tuhan memberkatimu agar kamu menjadi berkat.",
    diaspora_lens: "Mengubah orientasi keberhasilan dari sekadar pencapaian pribadi menjadi saluran berkat bagi komunitas dan keluarga.",
    status: "Published"
  },

  // DESEMBER 2026
  {
    service_date: "2026-12-06",
    month_key: "2026-12",
    week_label: "Minggu 1 • Des 2026",
    speaker: "Ps. Simon Luhur",
    title: "Negeri Mesir Lapar, Tetapi Rumahku Penuh",
    key_verse: "Kejadian 41:54–55",
    scripture_reading: "Kejadian 41:53–57",
    weekly_focus:
      "Seluruh dunia mengalami kelaparan, tetapi Mesir berkelimpahan karena Tuhan sudah berfirman lebih dulu melalui Yusuf. Di tengah krisis ekonomi, tekanan studi, atau ketidakpastian global: Tuhan sanggup memberi kelimpahan yang tidak dapat dijelaskan oleh logika. Bukan berarti tidak ada masalah, tetapi ada kecukupan dari Tuhan di tengah kekurangan dunia.",
    diaspora_lens: "Mengalami pemeliharaan Tuhan yang nyata di tengah biaya hidup dan tantangan ekonomi di New Zealand.",
    status: "Published"
  },
  {
    service_date: "2026-12-13",
    month_key: "2026-12",
    week_label: "Minggu 2 • Des 2026",
    speaker: "Sendiron Enumbi",
    title: "Menabung untuk Masa Sulit",
    key_verse: "Amsal 21:20",
    scripture_reading: "Kejadian 41:34–36, 48–49",
    weekly_focus:
      "Yusuf tidak menghabiskan semua hasil panen selama tujuh tahun kelimpahan, melainkan menyimpannya untuk masa depan. Bagi mahasiswa yang mengelola uang saku maupun pekerja yang menerima gaji: persiapan dan hikmat dalam mengelola keuangan adalah bagian dari penatalayanan berkat yang berkenan kepada Tuhan.",
    diaspora_lens: "Hikmat mengelola gaji dan beasiswa secara bertanggung jawab sebagai penatalayan berkat Tuhan.",
    status: "Published"
  },
  {
    service_date: "2026-12-20",
    month_key: "2026-12",
    week_label: "Minggu 3 • Natal • Des 2026",
    speaker: "Tikva Mooy",
    title: "Dari Kemuliaan ke Kandang (Natal)",
    key_verse: "Lukas 2:7",
    scripture_reading: "Lukas 2:1–20; Filipi 2:6–8",
    weekly_focus:
      "Dunia mendefinisikan kelimpahan sebagai kekayaan, kemewahan, dan istana. Namun Natal mengubah segalanya: kelimpahan kasih Allah tidak turun di istana megah, melainkan di palungan yang sederhana. Kelimpahan sejati bukan tentang seberapa banyak harta yang kita miliki, tetapi tentang Immanuel—Allah yang hadir menyertai kita.",
    diaspora_lens: "Menemukan kehangatan keluarga Allah di perantauan melalui kehadiran Kristus Sang Immanuel.",
    status: "Published"
  },
  {
    service_date: "2026-12-25",
    month_key: "2026-12",
    week_label: "Ibadah Natal • 25 Des 2026",
    speaker: "Tedy Sutedja",
    title: "Kasih Karunia yang Berlimpah",
    key_verse: "2 Korintus 8:9",
    scripture_reading: "Yohanes 1:14–16; 2 Korintus 8:9",
    weekly_focus:
      "Selaras dengan tema tahunan kita “Align in Promise”, di hari Natal ini kita diingatkan bahwa kelimpahan rohani, sukacita, maupun berkat materi tidak pernah dimaksudkan untuk berhenti pada diri sendiri. Seperti Yusuf yang membuka lumbung gandum bagi bangsa-bangsa, kita dipanggil menjadi saluran kasih karunia Kristus bagi sesama.",
    diaspora_lens: "Membagikan kasih karunia Natal kepada tetangga, rekan kerja, dan sesama perantau di Palmerston North.",
    status: "Published"
  },
  {
    service_date: "2026-12-31",
    month_key: "2026-12",
    week_label: "Ibadah Tutup Tahun • 31 Des 2026",
    speaker: "Tim Pastoral & Jemaat IFGF Palmy",
    title: "Dari Tahun ke Tahun: Tuhan Setia",
    key_verse: "Ratapan 3:22–23",
    scripture_reading: "Mazmur 103:1–5; Ratapan 3:22–24",
    weekly_focus:
      "Menutup perjalanan tahun 2026 dengan hati penuh syukur. Dari musim menunggu, menghadapi konflik, kerja keras, melewati penjara pergumulan, hingga melihat penggenapan janji dan kelimpahan—Tuhan terbukti setia dari awal hingga akhir tahun. Tuhan yang sama akan terus memimpin langkah kita memasuki tahun 2027.",
    diaspora_lens: "Mengucap syukur bersama sebagai satu keluarga rohani sebelum melangkah memasuki tahun 2027.",
    status: "Published"
  }
];

export async function seedNovDec2026Compass() {
  const batch = writeBatch(db);

  COMPASS_2026_MONTHS.forEach(m => {
    batch.set(
      doc(db, "monthly_themes", m.month_key),
      {
        ...m,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  });

  COMPASS_2026_WEEKS.forEach(w => {
    batch.set(
      doc(db, "weekly_insights", w.service_date),
      {
        ...w,
        christ_connection: w.christ_connection || "",
        mission_application: w.mission_application || "",
        sermon_summary: w.sermon_summary || "",
        icare_questions: w.icare_questions || "",
        updated_at: serverTimestamp()
      },
      { merge: true }
    );

    batch.set(
      doc(db, "sunday_services", w.service_date),
      {
        service_date: w.service_date,
        service_time: "10:30 AM",
        title: w.title,
        key_verse: w.key_verse,
        speaker: w.speaker,
        status: "Published",
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  });

  await batch.commit();
  return { months: COMPASS_2026_MONTHS.length, weeks: COMPASS_2026_WEEKS.length };
}
