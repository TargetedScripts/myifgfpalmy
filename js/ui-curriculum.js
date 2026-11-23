// js/ui-curriculum.js
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const COLLECTION_MONTHLY = "monthly_themes";
const COLLECTION_WEEKLY = "weekly_insights";

export const MONTHLY_THEMES_2026 = [
  {
    month_key: "2026-01",
    month_name: "January",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Begin with the end in mind",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 1-3",
    scripture: "Gen 3:14-20",
    synopsis: "In the midst of pain and suffering caused by the fall, God's promises for His people still stand. Having the promises as the end in mind will get us aligned in the new journey of 2026.",
    topic: "Resolution",
    notable_events: "New Year, iDeclare, 21 days of prayer and fasting",
    keyword: "Planning, Reflection",
    preacher_guide: "Arahkan khotbah pada ketetapan janji Tuhan di tengah kejatuhan & awal tahun baru.",
    status: "Published"
  },
  {
    month_key: "2026-02",
    month_name: "February",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "God who restores",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 6-9",
    scripture: "Gen 6:9-18",
    synopsis: "God re-established His covenant with Noah and restored the circumstances for Noah to start again. God does not only keep His promise, He restores the circumstances for His people to walk in the promise.",
    topic: "Restoration",
    notable_events: "Chinese New Year",
    keyword: "Restoration",
    preacher_guide: "Soroti pemulihan perjanjian dan keadaan oleh Tuhan untuk memulai kembali.",
    status: "Published"
  },
  {
    month_key: "2026-03",
    month_name: "March",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Overcoming pride",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 11:1-8",
    scripture: "Gen 11:6-7",
    synopsis: "While God calls His people to be fruitful and fill the earth, they chose to gather and build their own name. Pride is the killer of man's potential to operate in the promise of God.",
    topic: "Humility",
    notable_events: "",
    keyword: "Pride",
    preacher_guide: "Tekankan kerendahan hati dan ketaatan pada amanat Tuhan dibanding membangun nama sendiri.",
    status: "Published"
  },
  {
    month_key: "2026-04",
    month_name: "April",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Something different",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 12:1-5",
    scripture: "Gen 12:4-5",
    synopsis: "As God called Abraham to go from his countrymen, he was willing to be separated completely. Living in God's promise calls for a separation from the world.",
    topic: "Separated",
    notable_events: "Good Friday, Easter",
    keyword: "Separated, Holiness",
    preacher_guide: "Arahkan pembicara pada panggilan pengudusan & melangkah keluar dari zona nyaman.",
    status: "Published"
  },
  {
    month_key: "2026-05",
    month_name: "May",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "The fire and the altar",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 12:6-8, Gen 13:14-18, Gen 22",
    scripture: "Gen 12:7",
    synopsis: "Whenever God confirms His promises to Abraham, Abraham built an altar of sacrifice. Worship and sacrifices are the evidence of faith towards the promises of God.",
    topic: "Worship and sacrifice",
    notable_events: "Ascension Day, Pentecost, Mother's Day",
    keyword: "Worship, Sacrifice",
    preacher_guide: "Fokuskan khotbah pada mezbah penyembahan dan penyerahan diri sebagai respons iman.",
    status: "Published"
  },
  {
    month_key: "2026-06",
    month_name: "June",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Building a legacy",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 17",
    scripture: "Gen 17:7,9",
    synopsis: "As the God of Abraham, Isaac, and Jacob, God established His promises with Abraham and his generations. The promises are not only to be received, but also to be kept by more than one generation.",
    topic: "Generations",
    notable_events: "Father's Day",
    keyword: "Generations",
    preacher_guide: "Bantu pembicara mengarahkan jemaat pada warisan iman lintas generasi.",
    status: "Published"
  },
  {
    month_key: "2026-07",
    month_name: "July",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "In between",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 16,18,21",
    scripture: "Gen 16:1-2",
    synopsis: "Conflicts arose when Sarah didn't agree with the waiting season. On the other hand, Abraham stayed active in the waiting season of the promise. The “in between” moments are as important as the promise itself.",
    topic: "Waiting period",
    notable_events: "",
    keyword: "Transitions, Seasons",
    preacher_guide: "Soroti kesetiaan & pembentukan iman selama masa penantian sebelum janji digenapi.",
    status: "Published"
  },
  {
    month_key: "2026-08",
    month_name: "August",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "A new well",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 26",
    scripture: "Gen 26:25",
    synopsis: "With the agreement to the promise of God, Isaac met the providence of God. Worship and faith precedes providence for the promise.",
    topic: "Providence",
    notable_events: "Independence Day",
    keyword: "Providence",
    preacher_guide: "Tekankan bahwa ibadah & kesepakatan pada janji mendahului pemeliharaan/penyediaan Tuhan.",
    status: "Published"
  },
  {
    month_key: "2026-09",
    month_name: "September",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Equal unequal",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 25,27",
    scripture: "Gen 25:23",
    synopsis: "Esau and Jacob have both similar and unique promises from God. The key to be aligned in the promise is to make peace with both of those types of promises.",
    topic: "Identity",
    notable_events: "",
    keyword: "Identity",
    preacher_guide: "Arahkan pembicara pada keunikan panggilan tiap pribadi tanpa membandingkan secara tidak sehat.",
    status: "Published"
  },
  {
    month_key: "2026-10",
    month_name: "October",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Labor and purpose",
    subtitle: "Genesis • Align in Promise",
    passages: "Gen 30-31",
    scripture: "Gen 31:1-3",
    synopsis: "There are times that God led Jacob to Padan-Aran to be fruitful and there are times that God called Jacob to go back to live in His generational promise. Labor is a means to fulfil the purpose of God.",
    topic: "Purpose",
    notable_events: "",
    keyword: "Mission, Purpose",
    preacher_guide: "Kaitkan kerja keras harian & musim pembentukan dengan penggenapan tujuan panggilan Tuhan.",
    status: "Published"
  },
  {
    month_key: "2026-11",
    month_name: "November",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Dreams and visions",
    subtitle: "Mimpi di masa sulit (Yusuf di penjara)",
    passages: "Gen 40-41",
    scripture: "Gen 41:38-39",
    synopsis: "As Joseph became mature, he did not only understand the meaning of the dream, but also the implication of it. The promise of God becomes reality when dreams and visions are accompanied with implications.",
    topic: "Dreaming again",
    notable_events: "",
    keyword: "Dreaming again",
    preacher_guide: "Arahkan khotbah pada kedewasaan rohani & penerapan praktis dari visi/mimpi yang Tuhan beri.",
    status: "Published"
  },
  {
    month_key: "2026-12",
    month_name: "December",
    phase: "2026 • GENESIS",
    annual_theme: "Align in Promise",
    book: "Genesis",
    title: "Living in abundance",
    subtitle: "Fruitfulness, not fortunes (Kejadian 41:44–57)",
    passages: "Gen 41:44-57",
    scripture: "Gen 41:50-52",
    synopsis: "The promise is fulfilled not only when Joseph was trouble free but when he was also fruitful in the land of his suffering. Abundance speaks of fruitfulness, not fortunes, which is the promise of God since the very beginning.",
    topic: "Abundance",
    notable_events: "Christmas, End of Year",
    keyword: "Abundance",
    preacher_guide: "Fokus pada keberbuahan di tengah proses & ucapan syukur menutup tahun.",
    status: "Published"
  }
];

export const MONTHS_2027 = [
  { month_key: "2027-01", month_name: "January", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "GOD SEES OUR CRY", subtitle: "Membuka mata rohani untuk melihat dan mengenali tujuan serta visi Tuhan di tengah realitas hidup (Begin to See)", pillar: "Compassionate Awareness", scripture: "Keluaran 1–3", passages: "Keluaran 1–3", status: "Scheduled" },
  { month_key: "2027-02", month_name: "February", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "CALLED BY NAME", subtitle: "Dipanggil & Diutus dari Semak Berduri", pillar: "Identity & Calling", scripture: "Keluaran 3–4", passages: "Keluaran 3–4", status: "Scheduled" },
  { month_key: "2027-03", month_name: "March", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "LET MY PEOPLE GO", subtitle: "Kuasa Tuhan Mengalahkan Setiap Belenggu", pillar: "Spiritual Breakthrough", scripture: "Keluaran 5–11", passages: "Keluaran 5–11", status: "Scheduled" },
  { month_key: "2027-04", month_name: "April", phase: "FASE 1: SEE (Jan–Apr 2027)", title: "THE PASSOVER LAMB", subtitle: "Darah Anak Domba & Pembebasan Sejati", pillar: "Redemption in Christ", scripture: "Keluaran 12–13", passages: "Keluaran 12–13", status: "Scheduled" },
  { month_key: "2027-05", month_name: "May", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "CROSSING THE RED SEA", subtitle: "Melangkah dengan Iman di Tengah Jalan Buntu", pillar: "Faith in Action", scripture: "Keluaran 14–15", passages: "Keluaran 14–15", status: "Scheduled" },
  { month_key: "2027-06", month_name: "June", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "BREAD FROM HEAVEN", subtitle: "Pemeliharaan Tuhan Sehari demi Sehari di Padang Gurun", pillar: "Daily Dependence", scripture: "Keluaran 16–17", passages: "Keluaran 16–17", status: "Scheduled" },
  { month_key: "2027-07", month_name: "July", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "SHARED LEADERSHIP", subtitle: "Membangun Komunitas yang Saling Menopang", pillar: "Healthy Community", scripture: "Keluaran 18", passages: "Keluaran 18", status: "Scheduled" },
  { month_key: "2027-08", month_name: "August", phase: "FASE 2: WALK (Mei–Agu 2027)", title: "COVENANT AT SINAI", subtitle: "Hidup Kudus sebagai Umat Perjanjian", pillar: "Obedience & Holiness", scripture: "Keluaran 19–24", passages: "Keluaran 19–24", status: "Scheduled" },
  { month_key: "2027-09", month_name: "September", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "A PLACE TO DWELL", subtitle: "Membangun Rumah Tempat Tuhan Berdiam", pillar: "God's Presence", scripture: "Keluaran 25–31", passages: "Keluaran 25–31", status: "Scheduled" },
  { month_key: "2027-10", month_name: "October", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "GRACE AFTER FAILURE", subtitle: "Pemulihan & Kasih Karunia di Balik Anak Lembu Emas", pillar: "Restoration & Mercy", scripture: "Keluaran 32–34", passages: "Keluaran 32–34", status: "Scheduled" },
  { month_key: "2027-11", month_name: "November", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "WILLING HEARTS", subtitle: "Memberi yang Terbaik untuk Pekerjaan Tuhan", pillar: "Generous Stewardship", scripture: "Keluaran 35–39", passages: "Keluaran 35–39", status: "Scheduled" },
  { month_key: "2027-12", month_name: "December", phase: "FASE 3: DWELL (Sep–Des 2027)", title: "GLORY FILLS THE HOUSE", subtitle: "Kemuliaan Tuhan Memenuhi Kemah Suci & Hidup Kita", pillar: "Spirit-Filled Mission", scripture: "Keluaran 40", passages: "Keluaran 40", status: "Scheduled" }
];

export const WEEKLY_THEMES_GUIDELINES = [
  // NOVEMBER 2026 (DREAMS AND VISIONS)
  {
    service_date: "2026-11-01",
    month_key: "2026-11",
    week_label: "MINGGU 1: 1 NOVEMBER 2026",
    speaker_guideline: "Wellington",
    monthly_focus: "Mimpi di masa sulit (Yusuf di penjara)",
    flow_position: "MIMPI YANG DITUNDA – Tuhan masih berbicara, bahkan di tempat paling gelap",
    title: "Yusuf di Penjara: Mimpi Masih Hidup",
    key_verse: 'Kejadian 40:5 – "Pada suatu malam bermimpilah mereka berdua."',
    scripture_reading: "Kejadian 40:1-8",
    connection_to_monthly: "Tuhan masih berbicara lewat mimpi, bahkan di tempat paling gelap sekalipun.",
    winning_point: 'Yusuf bisa saja berkata, "Mimpiku mati di penjara ini." Tapi faktanya, Tuhan masih memberi mimpi kepada kepala juru minuman dan kepala juru roti. Dan Yusuf masih bisa menafsirkannya. Di tengah studimu yang berat, pekerjaan yang melelahkan, atau proses yang tidak pasti: Tuhan masih berbicara. Mimpi-mu belum mati.',
    status: "Published"
  },
  {
    service_date: "2026-11-08",
    month_key: "2026-11",
    week_label: "MINGGU 2: 8 NOVEMBER 2026",
    speaker_guideline: "Sendiron Enumbi",
    monthly_focus: "Mimpi di masa sulit (Yusuf di penjara)",
    flow_position: "JANGAN LUPA AKU – Kadang orang lain lupa, tapi Tuhan tidak pernah lupa",
    title: "Dua Tahun yang Terasa Abadi",
    key_verse: 'Kejadian 40:23 – "Tetapi kepala juru minuman itu tidak ingat kepada Yusuf."',
    scripture_reading: "Kejadian 40:9-23",
    connection_to_monthly: "Kadang orang lain lupa pada kita, tapi Tuhan tidak pernah lupa.",
    winning_point: 'Yusuf berkata pada kepala juru minuman: "Ingatlah aku." Tapi sesudah dipulihkan, orang itu lupa. Dua tahun lagi Yusuf di penjara. Bagi yang menunggu jawaban doa yang tidak kunjung datang, bagi yang merasa "dilupakan" oleh orang yang pernah berjanji: Tuhan tidak lupa. Waktu Tuhan berbeda. Dua tahun bagi Tuhan adalah persiapan untuk satu malam yang mengubah segalanya.',
    status: "Published"
  },
  {
    service_date: "2026-11-15",
    month_key: "2026-11",
    week_label: "MINGGU 3: 15 NOVEMBER 2026",
    speaker_guideline: "Tedy Sutedja",
    monthly_focus: "Mimpi di masa sulit (Yusuf di penjara)",
    flow_position: "TUHAN MASIH BICARA – Waktu Tuhan sempurna, tidak pernah terlambat",
    title: "Firaun Bermimpi: Dari Penjara ke Istana",
    key_verse: 'Kejadian 41:16 – "Bukan aku, melainkan Allah yang akan memberi jawaban."',
    scripture_reading: "Kejadian 41:1-16",
    connection_to_monthly: "Waktu Tuhan sempurna—bukan lebih cepat, tapi tidak pernah terlambat.",
    winning_point: 'Dua tahun setelah dilupakan, Yusuf dipanggil ke istana. Bukan karena dia hebat, tapi karena Tuhan masih bicara. Ada mimpi yang perlu ditafsirkan. Bagi yang merasa "terlambat" dibanding teman-temanmu yang sudah lulus, bekerja, atau menikah: ingatlah bahwa Tuhan bekerja dalam timing-Nya sendiri. Tidak terlambat. Tidak pernah terlambat.',
    status: "Published"
  },
  {
    service_date: "2026-11-22",
    month_key: "2026-11",
    week_label: "MINGGU 4: 22 NOVEMBER 2026",
    speaker_guideline: "Tikva Mooy",
    monthly_focus: "Mimpi di masa sulit (Yusuf di penjara)",
    flow_position: "DARI PENJARA KE ISTANA – Penderitaan adalah jalan menuju panggilan",
    title: "Kaus Mesir: Hidup yang Berubah dalam Semalam",
    key_verse: 'Kejadian 41:41 – "Aku menempatkan engkau atas seluruh tanah Mesir."',
    scripture_reading: "Kejadian 41:37-44",
    connection_to_monthly: "Penderitaanmu bukan akhir—itu adalah jalan menuju istana.",
    winning_point: 'Dalam satu malam, Yusuf naik dari penjara ke istana. Bukan karena promosi biasa—tapi karena Tuhan. Masa-masa gelap penjara, tahun-tahun yang terasa sia-sia, bukanlah buang-buang waktu. Itu adalah persiapan untuk panggilan yang lebih besar. Bagi yang sedang dalam "penjara"—percayalah, suatu saat Tuhan akan berkata, "Sekarang waktunya. Aku menempatkan engkau atas..."',
    status: "Published"
  },
  {
    service_date: "2026-11-29",
    month_key: "2026-11",
    week_label: "MINGGU 5: 29 NOVEMBER 2026",
    speaker_guideline: "Tedy Sutedja",
    monthly_focus: "Mimpi di masa sulit (Yusuf di penjara)",
    flow_position: "MENGELOLA KELIMPAHAN – Mimpi Tuhan bukan hanya untukmu, tapi untuk menyelamatkan banyak orang",
    title: "Tujuh Tahun Kelimpahan, Tujuh Tahun Kelaparan",
    key_verse: 'Kejadian 41:35 – "Mereka harus mengumpulkan segala bahan makanan."',
    scripture_reading: "Kejadian 41:45-57",
    connection_to_monthly: "Mimpi Tuhan bukan hanya untukmu—tapi untuk menyelamatkan banyak orang.",
    winning_point: "Yusuf tidak menimbun gandum untuk dirinya sendiri. Dia mengelola kelimpahan untuk menyelamatkan Mesir dan seluruh dunia dari kelaparan. Inilah puncak mimpi Yusuf: bukan sekadar sukses pribadi, tapi menjadi berkat bagi banyak orang. Kesuksesanmu bukan hanya untukmu. Tuhan memberkatimu agar kamu menjadi berkat.",
    status: "Published"
  },

  // DESEMBER 2026 (LIVING IN ABUNDANCE)
  {
    service_date: "2026-12-06",
    month_key: "2026-12",
    week_label: "MINGGU 1: 6 DESEMBER 2026",
    speaker_guideline: "Ps. Simon Luhur (Wellington)",
    monthly_focus: "Living in abundance — Fruitfulness, not fortunes (Kejadian 41:44-57)",
    flow_position: "MINGGU 1 – Kelimpahan sejati bukan sekadar fortunes (kekayaan), melainkan fruitfulness (keberbuahan) di tengah kesengsaraan",
    title: "Berbuah di Tanah Kesengsaraan (Manasye & Efraim)",
    key_verse: 'Kejadian 41:51–52 – "Yusuf memberi nama Manasye kepada anak sulungnya itu, sebab katanya: \'Allah telah membuat aku lupa sama sekali akan segala kesukaranku...\' Dan kepada anak yang kedua diterimanya nama Efraim, sebab katanya: \'Allah membuat aku mendapat anak dalam negeri kesengsaraanku.\'"',
    scripture_reading: "Kejadian 41:50–52",
    connection_to_monthly: "Mengangkat pesan utama dari Panduan Kurikulum GSM 2026: kelimpahan sejati adalah keberbuahan (fruitfulness), bukan sekadar kekayaan (fortunes).",
    winning_point: "Tuhan memulihkan Yusuf bukan dengan menghapus masa lalunya, tetapi dengan memberinya kemampuan untuk berbuah di Mesir. Kelimpahan dimulai ketika Tuhan menyembuhkan luka masa lalu kita (Manasye) dan membuat kita berbuah di musim yang sulit (Efraim).",
    status: "Published"
  },
  {
    service_date: "2026-12-13",
    month_key: "2026-12",
    week_label: "MINGGU 2: 13 DESEMBER 2026",
    speaker_guideline: "Sendiron Enumby",
    monthly_focus: "Living in abundance — Fruitfulness, not fortunes (Kejadian 41:44-57)",
    flow_position: "MINGGU 2 – Membuka lumbung untuk menjadi saluran berkat bagi dunia",
    title: "Tangan yang Terbuka (Membuka Lumbung untuk Sesama)",
    key_verse: 'Kejadian 41:56a – "Kelaparan itu merajalela di seluruh bumi; maka Yusuf membuka semua lumbung dan menjual gandum kepada orang Mesir..."',
    scripture_reading: "Kejadian 41:53–57",
    connection_to_monthly: "Mengaitkan dengan simbol utama bulan Desember (tangan terbuka): jika November berfokus pada pengumpulan gandum, Desember berfokus pada tindakan membuka lumbung.",
    winning_point: "Berkat yang ditimbun untuk diri sendiri akan membusuk, tetapi berkat yang dibagikan akan menghidupi banyak jiwa. Postur kelimpahan adalah tangan yang terbuka—siap menerima dari Tuhan dan siap memberi bagi sesama.",
    status: "Published"
  },
  {
    service_date: "2026-12-20",
    month_key: "2026-12",
    week_label: "MINGGU 3: 20 DESEMBER 2026 (PRA-NATAL)",
    speaker_guideline: "Tikva Mooy",
    monthly_focus: "Living in abundance — Fruitfulness, not fortunes (Kejadian 41:44-57)",
    flow_position: "MINGGU 3 (PRA-NATAL) – Membandingkan kemewahan istana Mesir dengan kesederhanaan kandang Betlehem",
    title: "Kelimpahan dalam Palungan (Kehadiran-Nya yang Memuaskan)",
    key_verse: 'Yohanes 1:16 – "Karena dari kelimpahan-Nya kita semua telah menerima kasih karunia demi kasih karunia."',
    scripture_reading: "Lukas 2:1–20 & Yohanes 1:14–16",
    connection_to_monthly: "Kelimpahan tertinggi yang diberikan Allah kepada manusia bukanlah materi, melainkan pribadi Kristus.",
    winning_point: "Dunia mengukur kelimpahan dari takhta dan harta, tetapi Allah menunjukkan kelimpahan-Nya dalam sebuah palungan. Natal mengingatkan kita bahwa ketika kita memiliki Kristus, kita sudah memiliki segalanya.",
    status: "Published"
  },
  {
    service_date: "2026-12-25",
    month_key: "2026-12",
    week_label: "MINGGU 4: 25 DESEMBER 2026 (HARI NATAL)",
    speaker_guideline: "Tedy Sutedja",
    monthly_focus: "Living in abundance — Fruitfulness, not fortunes (Kejadian 41:44-57)",
    flow_position: "MINGGU 4 (HARI NATAL) – Menghubungkan puncak tema tahunan Align in Promise",
    title: "Kasih Karunia yang Berlimpah (Align in Promise)",
    key_verse: '2 Korintus 8:9 / Yohanes 1:14 – "Karena kamu mengenal kasih karunia Tuhan kita Yesus Kristus, bahwa Ia, yang oleh karena kamu menjadi miskin, sekalipun Ia kaya, supaya kamu menjadi kaya oleh karena kemiskinan-Nya."',
    scripture_reading: "Yohanes 1:14–18",
    connection_to_monthly: "Janji Tuhan yang digenapi dalam Yesus Kristus memberikan kita kasih karunia yang melimpah untuk dibagikan kepada dunia.",
    winning_point: "Kristus mengosongkan diri-Nya agar kita dipenuhi dengan kasih karunia. Di Hari Natal ini, puncak dari kelimpahan kita adalah menjadi saksi dan saluran kasih-Nya bagi keluarga, kota, dan bangsa.",
    status: "Published"
  },

  // JANUARI 2027 (BEGIN TO SEE / KELUARAN 1–2)
  {
    service_date: "2027-01-03",
    month_key: "2027-01",
    week_label: "MINGGU 1: 3 JANUARI 2027",
    speaker_guideline: "",
    monthly_focus: "Membuka mata rohani untuk melihat dan mengenali tujuan serta visi Tuhan di tengah realitas hidup (Begin to See)",
    flow_position: "PEMBUKA / FONDASI – Menyadari kehadiran dan penyertaan Tuhan ketika realitas tampak menekan janji-Nya",
    title: "Ketika Realitas Menindas Janji",
    key_verse: 'Keluaran 1:12 – "Tetapi makin ditindas, makin bertambah banyak dan berkembang mereka, sehingga orang merasa takut kepada orang Israel itu."',
    scripture_reading: "Keluaran 1:1–14",
    connection_to_monthly: "Melihat Tuhan bekerja saat keadaan tampak berlawanan dengan janji-Nya.",
    winning_point: "Kadang hidup di perantauan membuat realitas terasa menindas dan seolah berseberangan dengan apa yang Tuhan janjikan bagi kita. Namun, sama seperti bangsa Israel di Mesir, penyertaan Tuhan justru sering kali paling nyata saat tekanan terasa paling berat. Yesus adalah Musa yang lebih besar yang selalu melihat, peduli, dan datang membebaskan hidup kita. Tetaplah percaya bahwa di balik situasi yang sulit, Tuhan sedang menumbuhkan dan menguatkan imanmu.",
    status: "Scheduled"
  },
  {
    service_date: "2027-01-10",
    month_key: "2027-01",
    week_label: "MINGGU 2: 10 JANUARI 2027",
    speaker_guideline: "",
    monthly_focus: "Membuka mata rohani untuk melihat dan mengenali tujuan serta visi Tuhan di tengah realitas hidup (Begin to See)",
    flow_position: "PENGEMBANGAN 1 – Membangun keberanian iman untuk takut akan Tuhan di tengah tekanan budaya",
    title: "Takut akan Tuhan di Tengah Tekanan",
    key_verse: 'Keluaran 1:17 – "Tetapi bidan-bidan itu takut akan Allah dan tidak melakukan apa yang dikatakan raja Mesir kepada mereka, melainkan membiarkan bayi-bayi laki-laki itu hidup."',
    scripture_reading: "Keluaran 1:15–22",
    connection_to_monthly: "Visi yang benar melahirkan keberanian untuk takut akan Tuhan lebih dari manusia.",
    winning_point: "Di tengah tekanan budaya dan lingkungan sekuler perantauan, kita sering kali digoda untuk berkompromi agar diterima. Namun bidan-bidan di Mesir mengajarkan kita bahwa rasa takut akan Tuhan mendatangkan keberanian untuk berdiri teguh bagi kebenaran. Yesus sendiri telah memberi contoh ketaatan yang sempurna kepada Bapa bahkan di tengah ancaman berat. Ketika kita menghormati Tuhan di atas segalanya, Dia yang akan menjaga dan memperhitungkan setiap langkah ketaatan kita.",
    status: "Scheduled"
  },
  {
    service_date: "2027-01-17",
    month_key: "2027-01",
    week_label: "MINGGU 3: 17 JANUARI 2027",
    speaker_guideline: "",
    monthly_focus: "Membuka mata rohani untuk melihat dan mengenali tujuan serta visi Tuhan di tengah realitas hidup (Begin to See)",
    flow_position: "PENGEMBANGAN 2 – Mempercayai pemeliharaan Tuhan di tengah kelemahan dan tantangan generasi",
    title: "Lahir di Tengah Badai",
    key_verse: 'Keluaran 2:10 – "Ketika anak itu telah besar, dibawanya dialah kepada putri Firaun, yang mengangkatnya menjadi anaknya, dan menamainya Musa, sebab katanya: \'Sebab aku telah menariknya dari air.\'"',
    scripture_reading: "Keluaran 2:1–10",
    connection_to_monthly: "Tuhan bekerja di balik layar, bahkan dalam kelemahan dan kerapuhan.",
    winning_point: "Banyak keluarga dan generasi muda diaspora tumbuh di antara dua dunia dan kerap merasa rapuh di tengah badai kehidupan. Namun kisah lahirnya Musa mengingatkan kita bahwa Tuhan sanggup bekerja di balik layar melalui hal-hal kecil dan sederhana. Kristus pun lahir di tengah ancaman dunia demi menggenapi rencana penebusan-Nya yang besar. Percayalah bahwa tangan Tuhan yang penuh kasih selalu menjaga dan menuntun langkah masa depanmu.",
    status: "Scheduled"
  },
  {
    service_date: "2027-01-24",
    month_key: "2027-01",
    week_label: "MINGGU 4: 24 JANUARI 2027",
    speaker_guideline: "",
    monthly_focus: "Membuka mata rohani untuk melihat dan mengenali tujuan serta visi Tuhan di tengah realitas hidup (Begin to See)",
    flow_position: "PUNCAK – Merangkul proses pembentukan Tuhan melalui kegagalan dan masa penantian",
    title: "Dari Istana ke Padang Gurun",
    key_verse: 'Keluaran 2:15 – "Ketika Firaun mendengar tentang perkara itu, dicarinya ikhtiar untuk membunuh Musa. Tetapi Musa melarikan diri dari handapan Firaun dan tiba di tanah Midian, lalu ia duduk-duduk di tepi sebuah sumur."',
    scripture_reading: "Keluaran 2:11–15",
    connection_to_monthly: "Tuhan membentuk visi melalui kegagalan dan masa penantian.",
    winning_point: "Masa penantian pekerjaan, status visa, atau kegagalan pribadi di perantauan sering kali terasa seperti pengalaman padang gurun yang menyakitkan. Namun di padang gurun itulah Tuhan membentuk kerendahan hati dan visi baru dalam diri kita, bukan untuk menghancurkan melainkan untuk menyiapkan panggilan-Nya. Ingatlah bahwa kasih karunia Tuhan selalu lebih besar daripada kegagalan masa lalumu. Dia sanggup memulihkan dan memakai hidupmu kembali bagi kemuliaan-Nya.",
    status: "Scheduled"
  },
  {
    service_date: "2027-01-31",
    month_key: "2027-01",
    week_label: "MINGGU 5: 31 JANUARI 2027",
    speaker_guideline: "",
    monthly_focus: "Membuka mata rohani untuk melihat dan mengenali tujuan serta visi Tuhan di tengah realitas hidup (Begin to See)",
    flow_position: "PENUTUP – Menemukan kepastian dan ketenangan karena Tuhan mendengar dan memperhatikan hidup kita",
    title: "Tuhan Mendengar, Melihat, Tahu",
    key_verse: 'Keluaran 2:24–25 – "Allah mendengar mereka mengerang, lalu Ia mengingat kepada perjanjian-Nya dengan Abraham, Ishak dan Yakub. Jadi Allah melihat orang Israel itu, dan Allah memperhatikan mereka."',
    scripture_reading: "Keluaran 2:16–25",
    connection_to_monthly: "Visi yang berakar pada karakter Tuhan yang setia dan peduli.",
    winning_point: "Saat rasa kesepian atau kerinduan akan rumah datang menyapa di tanah perantauan, ketahuilah bahwa Tuhan tidak pernah memalingkan wajah-Nya. Dia mendengar setiap seruan hatimu, melihat perjuanganmu, dan peduli atas setiap detail hidupmu. Melalui Kristus, Tuhan telah membuktikan bahwa Dia adalah Imanuel yang hadir dan bertindak atas seruan umat-Nya. Beristirahatlah dalam ketenangan bahwa Allah yang setia memegang janji-Nya atas hidupmu.",
    status: "Scheduled"
  }
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
  const curatedJan2027 = Object.fromEntries(
    WEEKLY_THEMES_GUIDELINES.filter(w => w.month_key === "2027-01").map(w => [w.service_date, w])
  );

  MONTHS_2027.forEach(m => {
    batch.set(
      doc(db, COLLECTION_MONTHLY, m.month_key),
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

    if (curatedJan2027[dateStr]) {
      batch.set(
        doc(db, COLLECTION_WEEKLY, dateStr),
        {
          ...curatedJan2027[dateStr],
          updated_at: serverTimestamp()
        },
        { merge: true }
      );
      return;
    }

    batch.set(
      doc(db, COLLECTION_WEEKLY, dateStr),
      {
        service_date: dateStr,
        month_key: monthKey,
        week_label: `Week ${weekNum} • 2027`,
        speaker_guideline: "",
        monthly_focus: mInfo.subtitle,
        flow_position: "",
        title: `${mInfo.title} (Part ${(idx % 4) + 1})`,
        key_verse: mInfo.scripture,
        scripture_reading: mInfo.scripture,
        connection_to_monthly: mInfo.subtitle,
        winning_point: "",
        status: "Scheduled",
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  });

  await batch.commit();
  return { months: MONTHS_2027.length, weeks: sundays.length };
}

export async function seedNovDec2026WeeklyGuidelines() {
  const batch = writeBatch(db);
  const targetWeeks = WEEKLY_THEMES_GUIDELINES.filter(
    w => w.month_key === "2026-11" || w.month_key === "2026-12"
  );

  targetWeeks.forEach(w => {
    batch.set(
      doc(db, COLLECTION_WEEKLY, w.service_date),
      {
        ...w,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  });

  await batch.commit();
  return targetWeeks.length;
}

let currState = {
  monthlyItems: [],
  weeklyItems: [],
  activeSubtab: "monthly",
  yearFilter: "ALL",
  weeklyMonthFilter: "ALL",
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

function setWeeklyStatus(msg, isError = false) {
  const el = document.getElementById("curr-weekly-status");
  if (!el) return;
  el.textContent = msg;
  el.className = isError
    ? "text-[11px] font-semibold text-red-600"
    : "text-[11px] font-semibold text-emerald-700";
}

function switchCurrSubtab(subtab) {
  const target = subtab || "monthly";
  currState.activeSubtab = target;
  document.querySelectorAll(".curr-subtab").forEach(btn => {
    const active = btn.dataset.currSubtab === target;
    btn.className = active
      ? "curr-subtab bg-slate-900 text-white px-3.5 py-2 rounded-lg text-xs font-semibold"
      : "curr-subtab bg-slate-100 text-slate-700 hover:bg-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold";
  });

  document.querySelectorAll(".curr-subpanel").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== `curr-subpanel-${target}`);
  });
}

function resetMonthlyForm() {
  const heading = document.getElementById("curr-form-title");
  if (heading) heading.textContent = "➕ Add / Edit Monthly Theme (Preacher Guideline)";
  [
    "curr-month-key",
    "curr-month-name",
    "curr-phase",
    "curr-title",
    "curr-subtitle",
    "curr-passages",
    "curr-scripture",
    "curr-synopsis",
    "curr-topic",
    "curr-keyword",
    "curr-events",
    "curr-preacher-guide"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function resetWeeklyForm() {
  const heading = document.getElementById("curr-weekly-form-title");
  if (heading) heading.textContent = "➕ Add / Edit Weekly Theme Guideline";
  [
    "wk-guide-date",
    "wk-guide-month",
    "wk-guide-label",
    "wk-guide-speaker",
    "wk-guide-monthly-focus",
    "wk-guide-flow",
    "wk-guide-title",
    "wk-guide-verse",
    "wk-guide-reading",
    "wk-guide-connection",
    "wk-guide-winning"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
}

function getCombinedMonthlyPool() {
  const defaults = [...MONTHLY_THEMES_2026, ...MONTHS_2027];
  if (currState.monthlyItems.length === 0) return defaults;

  const map = new Map();
  defaults.forEach(item => map.set(item.month_key, { ...item }));
  currState.monthlyItems.forEach(item => {
    const k = item.month_key || item.id;
    if (k) map.set(k, { ...map.get(k), ...item, month_key: k });
  });
  return Array.from(map.values());
}

function getCombinedWeeklyPool() {
  const map = new Map();
  WEEKLY_THEMES_GUIDELINES.forEach(w => {
    const key = w.service_date || w.id;
    if (key) map.set(key, { ...w, service_date: key });
  });
  currState.weeklyItems.forEach(w => {
    const key = w.service_date || w.id;
    if (key) map.set(key, { ...map.get(key), ...w, service_date: key });
  });
  return Array.from(map.values()).sort((a, b) =>
    String(a.service_date || "").localeCompare(String(b.service_date || ""))
  );
}

function renderMonthlyThemes() {
  const listEl = document.getElementById("curr-monthly-list");
  if (!listEl) return;

  const yearFilter = document.getElementById("curr-year-filter")?.value || currState.yearFilter || "ALL";
  currState.yearFilter = yearFilter;

  const filtered = getCombinedMonthlyPool()
    .filter(item => {
      const k = String(item.month_key || item.id || "");
      if (yearFilter === "ALL") return true;
      return k.startsWith(`${yearFilter}-`);
    })
    .sort((a, b) => String(a.month_key || "").localeCompare(String(b.month_key || "")));

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div class="p-6 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500 col-span-full">
        Belum ada tema bulanan untuk filter <strong>${esc(yearFilter)}</strong>.
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(item => {
    const key = item.month_key || item.id || "";
    const is2027 = key.startsWith("2027-");
    return `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(key)}</span>
            ${item.phase ? `<span class="px-2 py-0.5 ${is2027 ? "bg-amber-50 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-700"} rounded text-[10px] font-semibold">${esc(item.phase)}</span>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" data-curr-action="edit-monthly" data-curr-key="${esc(key)}" class="text-blue-600 hover:underline font-semibold">Edit</button>
            <button type="button" data-curr-action="delete-monthly" data-curr-key="${esc(key)}" class="text-red-600 hover:underline font-semibold">Delete</button>
          </div>
        </div>
        <h4 class="font-bold text-sm text-slate-900">${esc(item.title || "")}</h4>
        ${item.subtitle ? `<p class="text-[11px] font-medium text-slate-700">${esc(item.subtitle)}</p>` : ""}
        ${item.passages || item.scripture ? `<p class="text-[11px] text-amber-800 font-semibold">📖 ${esc(item.passages || "")}${item.scripture && item.scripture !== item.passages ? ` • Ayat: ${esc(item.scripture)}` : ""}</p>` : ""}
        ${item.synopsis ? `<p class="text-slate-600 leading-relaxed">${esc(item.synopsis)}</p>` : ""}
        ${item.preacher_guide ? `<p class="text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"><strong>Guideline Pembicara:</strong> ${esc(item.preacher_guide)}</p>` : ""}
        <div class="flex flex-wrap gap-1.5 pt-1">
          ${item.pillar ? `<span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded text-[10px] font-semibold">Pillar: ${esc(item.pillar)}</span>` : ""}
          ${item.topic ? `<span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">Topic: ${esc(item.topic)}</span>` : ""}
          ${item.keyword ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">Keyword: ${esc(item.keyword)}</span>` : ""}
          ${item.notable_events ? `<span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-semibold">Events: ${esc(item.notable_events)}</span>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderWeeklyThemes() {
  const listEl = document.getElementById("curr-weekly-list");
  if (!listEl) return;

  const monthFilter = document.getElementById("curr-weekly-month-filter")?.value || currState.weeklyMonthFilter || "ALL";
  currState.weeklyMonthFilter = monthFilter;

  const items = getCombinedWeeklyPool().filter(w => {
    if (monthFilter === "ALL") return true;
    return String(w.month_key || "") === monthFilter;
  });

  if (items.length === 0) {
    listEl.innerHTML = `
      <div class="p-6 bg-white rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
        Belum ada tema mingguan untuk bulan <strong>${esc(monthFilter)}</strong>.
      </div>
    `;
    return;
  }

  listEl.innerHTML = items.map(w => {
    const key = w.service_date || "";
    const speakerLabel = w.speaker_guideline || w.speaker || "";
    return `
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-bold px-2 py-0.5 bg-slate-900 text-amber-400 rounded text-[10px]">${esc(key)}</span>
            <span class="font-bold text-slate-800">${esc(w.week_label || "")}</span>
            ${speakerLabel ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-semibold">🎙️ Guideline Pembicara: ${esc(speakerLabel)}</span>` : ""}
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button type="button" data-curr-action="edit-weekly" data-curr-key="${esc(key)}" class="text-blue-600 hover:underline font-semibold">Edit</button>
            <button type="button" data-curr-action="delete-weekly" data-curr-key="${esc(key)}" class="text-red-600 hover:underline font-semibold">Delete</button>
          </div>
        </div>

        <h4 class="font-bold text-sm text-slate-900">${esc(w.title || "")}</h4>

        ${w.monthly_focus ? `<p class="text-[11px] text-slate-600"><strong>Fokus Bulanan:</strong> ${esc(w.monthly_focus)}</p>` : ""}
        ${w.flow_position ? `<p class="text-[11px] text-slate-700"><strong>Posisi dalam Alur:</strong> ${esc(w.flow_position)}</p>` : ""}
        ${w.scripture_reading ? `<p class="text-[11px] text-amber-800 font-semibold">📖 Bacaan Alkitab: ${esc(w.scripture_reading)}</p>` : ""}
        ${w.key_verse ? `<p class="text-[11px] text-slate-700 italic">Ayat Emas: ${esc(w.key_verse)}</p>` : ""}
        ${w.connection_to_monthly ? `<p class="text-[11px] text-emerald-800"><strong>Koneksi ke Tema Bulanan:</strong> ${esc(w.connection_to_monthly)}</p>` : ""}
        ${w.winning_point ? `<div class="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-[11px] text-slate-700 leading-relaxed"><strong>Winning Point (Guideline Khotbah):</strong> ${esc(w.winning_point)}</div>` : ""}
      </div>
    `;
  }).join("");
}

export async function refreshCurriculumData() {
  try {
    const [mSnap, wSnap] = await Promise.all([
      getDocs(collection(db, COLLECTION_MONTHLY)),
      getDocs(collection(db, COLLECTION_WEEKLY))
    ]);
    currState.monthlyItems = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    currState.weeklyItems = wSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("Using local curriculum fallback:", err);
  }
  renderMonthlyThemes();
  renderWeeklyThemes();
}

export async function seed2026MonthlyThemes() {
  setCurrStatus("Seeding 2026 monthly themes...");
  const batch = writeBatch(db);
  for (const item of MONTHLY_THEMES_2026) {
    batch.set(
      doc(db, COLLECTION_MONTHLY, item.month_key),
      {
        ...item,
        updated_at: serverTimestamp()
      },
      { merge: true }
    );
  }
  await batch.commit();
  await refreshCurriculumData();
  setCurrStatus("12 Monthly Themes 2026 (Jan–Dec) tersimpan!");
}

export async function seed2027FullCurriculum() {
  setCurrStatus("Seeding 2027 monthly themes & weekly insights...");
  const res = await seed2027Curriculum();
  await refreshCurriculumData();
  setCurrStatus(`Seed 2027 sukses: ${res.months} bulan & ${res.weeks} minggu tersimpan!`);
}

export async function initCurriculumTab() {
  switchCurrSubtab(currState.activeSubtab);

  if (currState.bound) {
    await refreshCurriculumData();
    return;
  }
  currState.bound = true;

  document.getElementById("panel-curriculum")?.addEventListener("click", (e) => {
    const subBtn = e.target.closest(".curr-subtab");
    if (subBtn && subBtn.dataset.currSubtab) {
      switchCurrSubtab(subBtn.dataset.currSubtab);
    }
  });

  document.getElementById("curr-seed-2026-btn")?.addEventListener("click", async () => {
    try {
      await seed2026MonthlyThemes();
    } catch (err) {
      setCurrStatus("Gagal seed 2026: " + (err?.message || err), true);
    }
  });

  document.getElementById("curr-seed-2027-btn")?.addEventListener("click", async () => {
    try {
      await seed2027FullCurriculum();
    } catch (err) {
      setCurrStatus("Gagal seed 2027: " + (err?.message || err), true);
    }
  });

  document.getElementById("curr-seed-nov-dec-btn")?.addEventListener("click", async () => {
    try {
      setWeeklyStatus("Seeding Nov & Dec 2026 weekly guidelines...");
      const count = await seedNovDec2026WeeklyGuidelines();
      await refreshCurriculumData();
      setWeeklyStatus(`${count} minggu guideline (Nov & Dec 2026) tersimpan!`);
    } catch (err) {
      setWeeklyStatus("Gagal seed Nov–Dec: " + (err?.message || err), true);
    }
  });

  document.getElementById("curr-year-filter")?.addEventListener("change", renderMonthlyThemes);
  document.getElementById("curr-weekly-month-filter")?.addEventListener("change", renderWeeklyThemes);

  document.getElementById("curr-reset-btn")?.addEventListener("click", () => {
    resetMonthlyForm();
    setCurrStatus("");
  });

  document.getElementById("curr-weekly-reset-btn")?.addEventListener("click", () => {
    resetWeeklyForm();
    setWeeklyStatus("");
  });

  document.getElementById("curr-monthly-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-curr-action]");
    if (!btn) return;
    const key = btn.dataset.currKey || "";
    const item = getCombinedMonthlyPool().find(x => (x.month_key || x.id) === key);

    if (btn.dataset.currAction === "edit-monthly" && item) {
      document.getElementById("curr-form-title").textContent = `✏️ Edit Monthly Theme (${key})`;
      document.getElementById("curr-month-key").value = item.month_key || key;
      document.getElementById("curr-month-name").value = item.month_name || "";
      document.getElementById("curr-phase").value = item.phase || "";
      document.getElementById("curr-title").value = item.title || "";
      document.getElementById("curr-subtitle").value = item.subtitle || "";
      document.getElementById("curr-passages").value = item.passages || "";
      document.getElementById("curr-scripture").value = item.scripture || "";
      document.getElementById("curr-synopsis").value = item.synopsis || "";
      document.getElementById("curr-topic").value = item.topic || item.pillar || "";
      document.getElementById("curr-keyword").value = item.keyword || "";
      document.getElementById("curr-events").value = item.notable_events || "";
      document.getElementById("curr-preacher-guide").value = item.preacher_guide || "";
      setCurrStatus(`Editing ${key}`);
    }

    if (btn.dataset.currAction === "delete-monthly" && key) {
      if (!confirm(`Hapus tema bulanan ${key} dari Firestore?`)) return;
      try {
        await deleteDoc(doc(db, COLLECTION_MONTHLY, key));
        await refreshCurriculumData();
        setCurrStatus(`Deleted ${key}`);
      } catch (err) {
        setCurrStatus("Gagal hapus: " + (err?.message || err), true);
      }
    }
  });

  document.getElementById("curr-weekly-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-curr-action]");
    if (!btn) return;
    const key = btn.dataset.currKey || "";
    const item = getCombinedWeeklyPool().find(x => (x.service_date || x.id) === key);

    if (btn.dataset.currAction === "edit-weekly" && item) {
      document.getElementById("curr-weekly-form-title").textContent = `✏️ Edit Weekly Guideline (${key})`;
      document.getElementById("wk-guide-date").value = item.service_date || key;
      document.getElementById("wk-guide-month").value = item.month_key || key.slice(0, 7);
      document.getElementById("wk-guide-label").value = item.week_label || "";
      document.getElementById("wk-guide-speaker").value = item.speaker_guideline || item.speaker || "";
      document.getElementById("wk-guide-monthly-focus").value = item.monthly_focus || "";
      document.getElementById("wk-guide-flow").value = item.flow_position || "";
      document.getElementById("wk-guide-title").value = item.title || "";
      document.getElementById("wk-guide-verse").value = item.key_verse || "";
      document.getElementById("wk-guide-reading").value = item.scripture_reading || "";
      document.getElementById("wk-guide-connection").value = item.connection_to_monthly || "";
      document.getElementById("wk-guide-winning").value = item.winning_point || "";
      setWeeklyStatus(`Editing ${key}`);
    }

    if (btn.dataset.currAction === "delete-weekly" && key) {
      if (!confirm(`Hapus guideline mingguan ${key} dari Firestore?`)) return;
      try {
        await deleteDoc(doc(db, COLLECTION_WEEKLY, key));
        await refreshCurriculumData();
        setWeeklyStatus(`Deleted ${key}`);
      } catch (err) {
        setWeeklyStatus("Gagal hapus: " + (err?.message || err), true);
      }
    }
  });

  document.getElementById("form-curr-monthly")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const monthKey = document.getElementById("curr-month-key").value.trim();
    if (!monthKey) return;

    const is2027 = monthKey.startsWith("2027-");
    const payload = {
      month_key: monthKey,
      month_name: document.getElementById("curr-month-name").value.trim(),
      phase: document.getElementById("curr-phase").value.trim() || (is2027 ? "2027 • ALIGN IN PURPOSE" : "2026 • GENESIS"),
      annual_theme: is2027 ? "Align in Purpose" : "Align in Promise",
      book: is2027 ? "Keluaran" : "Genesis",
      title: document.getElementById("curr-title").value.trim(),
      subtitle: document.getElementById("curr-subtitle").value.trim(),
      passages: document.getElementById("curr-passages").value.trim(),
      scripture: document.getElementById("curr-scripture").value.trim(),
      synopsis: document.getElementById("curr-synopsis").value.trim(),
      topic: document.getElementById("curr-topic").value.trim(),
      keyword: document.getElementById("curr-keyword").value.trim(),
      notable_events: document.getElementById("curr-events").value.trim(),
      preacher_guide: document.getElementById("curr-preacher-guide").value.trim(),
      status: "Published",
      updated_at: serverTimestamp()
    };

    try {
      setCurrStatus("Saving...");
      await setDoc(doc(db, COLLECTION_MONTHLY, monthKey), payload, { merge: true });
      resetMonthlyForm();
      await refreshCurriculumData();
      setCurrStatus(`Saved ${monthKey}!`);
    } catch (err) {
      setCurrStatus("Gagal menyimpan: " + (err?.message || err), true);
    }
  });

  document.getElementById("form-curr-weekly")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const serviceDate = document.getElementById("wk-guide-date").value.trim();
    if (!serviceDate) return;

    const monthKey = document.getElementById("wk-guide-month").value.trim() || serviceDate.slice(0, 7);
    const speakerVal = document.getElementById("wk-guide-speaker").value.trim();
    const payload = {
      service_date: serviceDate,
      month_key: monthKey,
      week_label: document.getElementById("wk-guide-label").value.trim(),
      speaker_guideline: speakerVal,
      speaker: speakerVal,
      monthly_focus: document.getElementById("wk-guide-monthly-focus").value.trim(),
      flow_position: document.getElementById("wk-guide-flow").value.trim(),
      title: document.getElementById("wk-guide-title").value.trim(),
      key_verse: document.getElementById("wk-guide-verse").value.trim(),
      scripture_reading: document.getElementById("wk-guide-reading").value.trim(),
      connection_to_monthly: document.getElementById("wk-guide-connection").value.trim(),
      winning_point: document.getElementById("wk-guide-winning").value.trim(),
      status: "Published",
      updated_at: serverTimestamp()
    };

    try {
      setWeeklyStatus("Saving...");
      await setDoc(doc(db, COLLECTION_WEEKLY, serviceDate), payload, { merge: true });
      resetWeeklyForm();
      await refreshCurriculumData();
      setWeeklyStatus(`Saved ${serviceDate}!`);
    } catch (err) {
      setWeeklyStatus("Gagal menyimpan: " + (err?.message || err), true);
    }
  });

  await refreshCurriculumData();
}
