// js/seed-devotions-nov2026.js
import { db } from "./firebase-config.js";
import {
  doc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const DEVOTIONS_NOV20_DEC31_2026 = [
  // 20–25 NOVEMBER 2026
  {
    devotion_date: "2026-11-20",
    title: "Silent Trial to Sovereign Testimony",
    scripture: "Kejadian 41:44 & Mazmur 77:15 (TB)",
    reflection:
      "Kejadian 41:44 (TB)\n\"Berkatalah Firaun kepada Yusuf: ”Akulah Firaun, tetapi tanpa setahumu seorang pun tidak boleh bergerak di seluruh tanah Mesir.”\"\n\n" +
      "Mazmur 77:15 (TB)\n\"Engkaulah Allah yang melakukan keajaiban; Engkau telah menyatakan kekuatan-Mu di antara bangsa-bangsa.\"\n\n" +
      "God can turn your silent trial into a sovereign testimony. Keajaiban kuasa Tuhan dinyatakan saat Ia mengubah posisimu dari orang asing yang diabaikan menjadi saluran hikmat bagi banyak orang.\n\n" +
      "💭 Pertanyaan Refleksi:\nPernahkah aku menyadari bagaimana Tuhan sedang merajut keajaiban-Nya dalam perjalanan hidupku di diaspora?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Roma 1–3; Mazmur 77–78",
    prayer: "Tuhan, bukalah mataku untuk melihat keajaiban penyertaan-Mu di balik setiap proses tersembunyi yang sedang kujalani di perantauan ini. Amin."
  },
  {
    devotion_date: "2026-11-21",
    title: "Shaped for His Purpose",
    scripture: "Kejadian 41:46 & Mazmur 79:13 (TB)",
    reflection:
      "Kejadian 41:46 (TB)\n\"Yusuf berumur tiga puluh tahun ketika ia menghadap Firaun, raja Mesir itu. Maka pergilah Yusuf dari depan Firaun, lalu mengelilingi seluruh tanah Mesir.\"\n\n" +
      "Mazmur 79:13 (TB)\n\"Maka kami ini, umat-Mu, dan domba-domba gembalaan-Mu, akan bersyukur kepada-Mu untuk selama-lamanya, dan memberitakan puji-pujian bagi-Mu turun-temurun.\"\n\n" +
      "Years of preparation are never wasted when you are being shaped for His purpose. Usia muda dan masa-masa pembentukan di perantauan adalah modal untuk memberitakan puji-pujian bagi-Nya.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku mengisi waktu mudaku di Palmy hari ini agar menjadi kesaksian syukur bagi generasi mendatang?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Roma 4–6; Mazmur 79–80",
    prayer: "Tuhan, pakai setiap hari dalam masa pembentukanku di Palmerston North agar hidupku menjadi kesaksian syukur bagi kemuliaan nama-Mu. Amin."
  },
  {
    devotion_date: "2026-11-22",
    title: "Open Heart, Full Provision",
    scripture: "Kejadian 41:47 & Mazmur 81:11 (TB)",
    reflection:
      "Kejadian 41:47 (TB)\n\"Tanah itu mengeluarkan hasil berlimpah-limpah dalam ketujuh tahun kelimpahan itu,\"\n\n" +
      "Mazmur 81:11 (TB)\n\"Akulah TUHAN, Allahmu, yang menuntun engkau keluar dari tanah Mesir: bukalah mulutmu lebar-lebar, maka Aku akan melembagainya!\"\n\n" +
      "Open your heart to God's vision, and He will fill it with His provision. Musim kelimpahan dimulai dari kerinduan hati yang terbuka lebar untuk menerima tuntunan dan janji Tuhan.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku sudah membuka hatiku lebar-lebar untuk memohon hikmat Tuhan dalam mengelola setiap kesempatan dan kelimpahan yang Ia berikan?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Roma 7–9; Mazmur 81–82",
    prayer: "Tuhan, kuperlebar kapasitas iman dan hatiku hari ini untuk menerima visi, tuntunan, dan hikmat-Mu atas hidupku. Amin."
  },
  {
    devotion_date: "2026-11-23",
    title: "Wisdom in Times of Plenty",
    scripture: "Kejadian 41:48 & Mazmur 84:12 (TB)",
    reflection:
      "Kejadian 41:48 (TB)\n\"maka Yusuf mengumpulkan segala bahan makanan ketujuh tahun kelimpahan yang ada di tanah Mesir, lalu disimpannya di kota-kota; bahan makanan dari padang-padang di sekeliling tiap-tiap kota disimpan di dalam kota itu.\"\n\n" +
      "Mazmur 84:12 (TB)\n\"Sebab TUHAN Allah adalah matahari dan perisai; kasih dan kemuliaan Ia berikan; Ia tidak menahan kebaikan dari orang yang hidup tidak bercela.\"\n\n" +
      "Wisdom stores in times of plenty to sustain in times of scarcity. Hikmat Tuhan mengajar kita untuk setia mengelola berkat hari ini demi menjadi penopang di masa mendatang.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku sudah bijak dalam mengelola keuangan beasiswa, waktu, dan energiku di NZ sebagai bentuk ketaatan kepada-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Roma 10–12; Mazmur 83–84",
    prayer: "Tuhan, karuniakanlah hikmat penatalayanan yang setia atas waktu, tenaga, dan keuangan yang Kaumercayakan kepadaku di New Zealand. Amin."
  },
  {
    devotion_date: "2026-11-24",
    title: "Beyond Human Math",
    scripture: "Kejadian 41:49 & Mazmur 85:13 (TB)",
    reflection:
      "Kejadian 41:49 (TB)\n\"Demikianlah Yusuf menimbun gandum seperti pasir di laut, sangat banyak, sehingga orang berhenti menghitungnya, karena memang tidak terhitung lagi.\"\n\n" +
      "Mazmur 85:13 (TB)\n\"Bahkan TUHAN akan memberikan kebaikan, dan negeri kita akan memberikan hasilnya.\"\n\n" +
      "God's blessing is not measured by math, but by His mercy on your path. Kelimpahan yang dari Tuhan selalu melampaui perhitungan manusiawi kita ketika kita berjalan dalam ketaatan.\n\n" +
      "💭 Pertanyaan Refleksi:\nDi tengah kekhawatiran akan kecukupan hidup di perantauan, apakah aku percaya bahwa kebaikan Tuhan sanggup memberi hasil yang tak terhitung?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Roma 13–16; Mazmur 85–86",
    prayer: "Tuhan, aku menyerahkan segala kekhawatiranku ke dalam tangan-Mu dan percaya bahwa kebaikan-Mu jauh melampaui hitungan manusia. Amin."
  },
  {
    devotion_date: "2026-11-25",
    title: "He Restores Your Pain (Manasyi)",
    scripture: "Kejadian 41:51 & Mazmur 87:7 (TB)",
    reflection:
      "Kejadian 41:51 (TB)\n\"Yusuf memberi nama Manasyi kepada anak sulungnya itu, sebab katanya: ”Allah telah membuat aku lupa sama sekali kepada kesukaranku dan kepada rumah bapaku.”\"\n\n" +
      "Mazmur 87:7 (TB)\n\"Dan orang yang menyanyi dan yang menari berkata: ”Semua mata airku ada di dalammu.”\"\n\n" +
      "He restores your pain to release your gain. Tuhan sanggup memulihkan rasa sakit masa lalu dan kesukaran hidup jauh dari rumah, menjadikan-Nya satu-satunya sumber mata air hidupmu.\n\n" +
      "💭 Pertanyaan Refleksi:\nAdakah luka masa lalu atau rasa sepi di perantauan yang perlu kuserahkan kepada Tuhan agar Ia menggantikannya dengan pemulihan yang manis?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Korintus 1–4; Mazmur 87–88",
    prayer: "Tuhan, sembuhkan setiap luka lama dan rasa sepi di hatiku; jadilah satu-satunya mata air sukacita dan pemulihanku. Amin."
  },

  // 26–30 NOVEMBER 2026
  {
    devotion_date: "2026-11-26",
    title: "Fruitfulness in the Land of Suffering (Efraim)",
    scripture: "Kejadian 41:52 & Mazmur 89:2 (TB)",
    reflection:
      "Kejadian 41:52 (TB)\n\"Dan kepada anaknya yang kedua diberinya nama Efraim, sebab katanya: ”Allah membuat aku mendapat anak dalam negeri kesengsaraanku.”\"\n\n" +
      "Mazmur 89:2 (TB)\n\"Aku hendak menyanyikan kasih setia TUHAN selama-lamanya, hendak memberitakan kesetiaan-Mu turun-temurun dengan mulutku.\"\n\n" +
      "Fruitfulness can bloom even in the land of your suffering. Tempat yang paling menantang dan asing sekalipun bisa menjadi ladang tempat Tuhan membuatmu bertumbuh dan berbuah lebat.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku melihat keberadaanku di Palmy hari ini—apakah sekadar tempat bertahan hidup, ataukah tempat di mana Tuhan membuatku berbuah?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Korintus 5–8; Mazmur 89–90",
    prayer: "Tuhan, jadikanlah keberadaanku di Palmerston North sebagai ladang yang subur tempat hidupku bertumbuh dan berbuah lebat bagi-Mu. Amin."
  },
  {
    devotion_date: "2026-11-27",
    title: "Bread in His House",
    scripture: "Kejadian 41:54 & Mazmur 91:2 (TB)",
    reflection:
      "Kejadian 41:54 (TB)\n\"mulailah datang tujuh tahun kelaparan, seperti yang telah dikatakan Yusuf; dalam seluruh negeri ada kelaparan, tetapi di seluruh tanah Mesir ada roti.\"\n\n" +
      "Mazmur 91:2 (TB)\n\"akan berkata kepada TUHAN: ”Tempat perlindunganku dan kubu pertahananku, Allahku, dalam Engkau aku percaya.”\"\n\n" +
      "When the world experiences a drought, God's people find bread in His house. Di saat situasi dunia penuh dengan krisis dan ketidakpastian, perlindungan dan penyediaan Tuhan tetap teguh bagi mereka yang percaya.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku menaruh rasa amanku pada kondisi ekonomi dunia, ataukah pada Allah yang menjadi tempat perlindungan dan kubu pertahananku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Korintus 9–12; Mazmur 91–92",
    prayer: "Tuhan, Engkaulah tempat perlindungan dan kubu pertahananku; hanya kepada-Mu aku menaruh rasa amanku. Amin."
  },
  {
    devotion_date: "2026-11-28",
    title: "Prepared in Private, Positioned in Public",
    scripture: "Kejadian 41:55 & Mazmur 93:1 (TB)",
    reflection:
      "Kejadian 41:55 (TB)\n\"Ketika seluruh tanah Mesir menderita kelaparan, dan rakyat berteriak meminta roti kepada Firaun, berkatalah Firaun kepada semua orang Mesir: ”Pergilah kepada Yusuf, perbuatlah apa yang dikatakannya kepadamu.”\"\n\n" +
      "Mazmur 93:1 (TB)\n\"TUHAN adalah Raja, Ia berpakaian kemegahan, TUHAN berpakaian, berikat pinggang kekuatan. Sungguh, telah tegak dunia, tidak goyang.\"\n\n" +
      "God prepares you in private so He can position you in public. Pembentukan karakter di tempat yang tersembunyi mempersiapkanmu menjadi jawaban dan saluran berkat bagi banyak orang.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku rela menjalani proses pembentukan Tuhan hari ini, percaya bahwa Dialah Raja yang tak tergoyahkan yang memegang kendali atas hidupku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Korintus 13–16; Mazmur 93–94",
    prayer: "Tuhan yang bertakhta sebagai Raja, bentuklah karakterku di tempat tersembunyi agar siap dipakai menjadi saluran berkat bagi banyak orang. Amin."
  },
  {
    devotion_date: "2026-11-29",
    title: "Worship Opens the Storehouse",
    scripture: "Kejadian 41:56 & Mazmur 95:6 (TB)",
    reflection:
      "Kejadian 41:56 (TB)\n\"Kelaparan itu merajalela di seluruh bumi. Maka Yusuf membuka segala lumbung dan menjual gandum kepada orang Mesir; sebab kelaparan itu sangat hebat di tanah Mesir.\"\n\n" +
      "Mazmur 95:6 (TB)\n\"Masuklah, marilah kita sujud menyembah, berlutut di hadapan TUHAN yang menjadikan kita.\"\n\n" +
      "A heart of worship opens the storehouse of His leadership. Ketika kita memilih sujud menyembah Sang Pencipta, Ia mempercayakan hikmat untuk mengelola dan membagikan berkat bagi sesama.\n\n" +
      "💭 Pertanyaan Refleksi:\nSudahkah aku mengambil waktu di hari Minggu ini untuk berlutut menyembah-Nya dan mengucap syukur atas segala lumbung pemeliharaan-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Korintus 1–4; Mazmur 95–96",
    prayer: "Tuhan Penciptaku, aku sujud menyembah dan mengucap syukur atas setiap lumbung pemeliharaan-Mu yang terbuka atas hidupku. Amin."
  },
  {
    devotion_date: "2026-11-30",
    title: "Sanctuary of Influence for the Nations",
    scripture: "Kejadian 41:57 & Mazmur 97:10 (TB)",
    reflection:
      "Kejadian 41:57 (TB)\n\"Juga dari seluruh bumi datanglah orang ke Mesir untuk membeli gandum dari Yusuf, sebab kelaparan itu sangat hebat di seluruh bumi.\"\n\n" +
      "Mazmur 97:10 (TB)\n\"Hai orang-orang yang mengasihi TUHAN, bencilah kejahatan! Ia, yang memelihara jiwa orang-orang yang dikasihi-Nya, akan melepaskan mereka dari tangan orang-orang fasik.\"\n\n" +
      "Your story of endurance becomes a sanctuary of influence for the nations. Perjuangan dan ketaatanmu di perantauan tidak hanya berdampak bagi dirimu sendiri, melainkan menjadi saluran berkat bagi bangsa-bangsa.\n\n" +
      "💭 Pertanyaan Refleksi:\nMenutup bulan November ini, bagaimana aku melihat penggenapan visi dan mimpi Tuhan dalam hidupku yang terus dipelihara oleh kasih-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Korintus 5–9; Mazmur 97–98",
    prayer: "Tuhan, terima kasih atas pemeliharaan jiwa dan penggenapan visi-Mu sepanjang bulan November ini. Pakailah hidupku bagi bangsa-bangsa. Amin."
  },

  // 1–31 DESEMBER 2026 (LIVING IN ABUNDANCE)
  {
    devotion_date: "2026-12-01",
    title: "Abundance Starts with Exalting God",
    scripture: "Kejadian 41:44 & Mazmur 99:5 (TB)",
    reflection:
      "Kejadian 41:44 (TB)\n\"Berkatalah Firaun kepada Yusuf: ”Akulah Firaun, tetapi tanpa setahumu seorang pun tidak boleh bergerak di seluruh tanah Mesir.”\"\n\n" +
      "Mazmur 99:5 (TB)\n\"Tinggikanlah TUHAN, Allah kita, dan sujudlah menyembah kepada tumpuan kaki-Nya! Kuduslah Ia!\"\n\n" +
      "True abundance starts when God is given the highest stance. Kelimpahan sejati bukan diukur dari posisi jabatan kita, melainkan dari hati yang senantiasa meninggikan kekudusan Allah.\n\n" +
      "💭 Pertanyaan Refleksi:\nMemasuki bulan terakhir di tahun ini, apakah aku sudah menempatkan Tuhan sebagai prioritas tertinggi dalam studi, kerja, dan rencanaku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Korintus 10–13; Mazmur 99–100",
    prayer: "Tuhan yang Kudus, kutinggikan Engkau sebagai yang terutama atas seluruh studi, pekerjaan, dan rencanaku di bulan Desember ini. Amin."
  },
  {
    devotion_date: "2026-12-02",
    title: "Integrity in Private, Authority in Public",
    scripture: "Kejadian 41:46 & Mazmur 101:2 (TB)",
    reflection:
      "Kejadian 41:46 (TB)\n\"Yusuf berumur tiga puluh tahun ketika ia menghadap Firaun, raja Mesir itu. Maka pergilah Yusuf dari depan Firaun, lalu mengelilingi seluruh tanah Mesir.\"\n\n" +
      "Mazmur 101:2 (TB)\n\"Aku hendak memperhatikan jalan yang tidak bercela: Bilakah Engkau datang kepadaku? Aku hendak hidup dalam ketulusan hatiku di dalam rumahku.\"\n\n" +
      "Integrity in private creates authority in public. Ketulusan hati saat berada di tempat yang sepi atau jauh dari keluarga di Indonesia adalah kunci kepercayaan yang Tuhan berikan di perantauan.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku tetap menjaga jalan hidup yang tidak bercela di lingkungan flatting dan tempat kerjaku hari ini?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Galatia 1–3; Mazmur 101–102",
    prayer: "Tuhan, jagalah hatiku agar senantiasa hidup dalam ketulusan dan integritas yang tidak bercela di mana pun aku berada. Amin."
  },
  {
    devotion_date: "2026-12-03",
    title: "A Grateful Soul",
    scripture: "Kejadian 41:47 & Mazmur 103:1 (TB)",
    reflection:
      "Kejadian 41:47 (TB)\n\"Tanah itu mengeluarkan hasil berlimpah-limpah dalam ketujuh tahun kelimpahan itu,\"\n\n" +
      "Mazmur 103:1 (TB)\n\"Dari Daud. Pujilah TUHAN, hai jiwaku! Pujilah nama-Nya yang kudus, hai segenap batinku!\"\n\n" +
      "A grateful soul is the soil where abundance grows whole. Jiwa yang senantiasa memuji Tuhan akan selalu melihat kelimpahan berkat di tengah musim apa pun.\n\n" +
      "💭 Pertanyaan Refleksi:\nSudahkah segenap batinku memuji kebaikan Tuhan atas setiap pemeliharaan-Nya sepanjang tahun di NZ ini?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Galatia 4–6; Mazmur 103–104",
    prayer: "Pujilah TUHAN, hai jiwaku! Segenap batinku mengucap syukur atas setiap kelimpahan pemeliharaan-Mu sepanjang tahun ini. Amin."
  },
  {
    devotion_date: "2026-12-04",
    title: "Gather Grace for Tomorrow",
    scripture: "Kejadian 41:48 & Mazmur 105:1 (TB)",
    reflection:
      "Kejadian 41:48 (TB)\n\"maka Yusuf mengumpulkan segala bahan makanan ketujuh tahun kelimpahan yang ada di tanah Mesir, lalu disimpannya di kota-kota; bahan makanan dari padang-padang di sekeliling tiap-tiap kota disimpan di dalam kota itu.\"\n\n" +
      "Mazmur 105:1 (TB)\n\"Bersyukurlah kepada TUHAN, serukanlah nama-Nya, beritahukanlah perbuatan-Nya di antara bangsa-bangsa!\"\n\n" +
      "Gather the grace today to sustain your tomorrow's space. Hikmat untuk mengelola dan menyimpan berkat hari ini adalah bentuk persiapan iman bagi masa depan.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku mengelola waktu, finansial beasiswa, dan energiku secara bijak sebagai kesaksian bagi orang-orang di sekitarku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Efesus 1–3; Mazmur 105–106",
    prayer: "Tuhan, ajar aku bijak mengelola waktu, tenaga, dan berkat hari ini sebagai kesaksian atas perbuatan-Mu di antara bangsa-bangsa. Amin."
  },
  {
    devotion_date: "2026-12-05",
    title: "Measureless Goodness",
    scripture: "Kejadian 41:49 & Mazmur 107:1 (TB)",
    reflection:
      "Kejadian 41:49 (TB)\n\"Demikianlah Yusuf menimbun gandum seperti pasir di laut, sangat banyak, sehingga orang berhenti menghitungnya, karena memang tidak terhitung lagi.\"\n\n" +
      "Mazmur 107:1 (TB)\n\"Bersyukurlah kepada TUHAN, sebab Ia baik! Bahwasanya untuk selama-lamanya kasih setia-Nya.\"\n\n" +
      "God's goodness is measureless, and His mercy is endless. Berkat pemeliharaan Tuhan melampaui segala kalkulasi dan kekhawatiran manusiawi kita.\n\n" +
      "💭 Pertanyaan Refleksi:\nKetika melihat kembali perjalanan tahun ini di Palmy, hal apa yang paling membuatku tersadar akan kasih setia-Nya yang tak terhitung?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Efesus 4–6; Mazmur 107–108",
    prayer: "Aku bersyukur kepada-Mu ya Tuhan, sebab Engkau baik dan kasih setia-Mu tak terhitung di sepanjang langkah hidupku. Amin."
  },
  {
    devotion_date: "2026-12-06",
    title: "Established Before the Storm",
    scripture: "Kejadian 41:50 & Mazmur 109:21 (TB)",
    reflection:
      "Kejadian 41:50 (TB)\n\"Sebelum datang tahun kelaparan itu, lahir bagi Yusuf dua orang anak laki-laki, yang dilahirkan baginya oleh Asnat, anak Potifera, imam di On.\"\n\n" +
      "Mazmur 109:21 (TB)\n\"Tetapi Engkau, ya ALLAH, Tuhanku, bertindaklah kepadaku oleh karena nama-Mu, lepaskanlah aku oleh karena kasih setia-Mu yang baik!\"\n\n" +
      "God establishes your family and future right in the middle of your foreign feature. Tuhan sanggup memberikan buah manis dan rasa aman di tanah perantauan sebelum badai datang.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku percaya bahwa Allah bertindak memelihara masa depan karir, studi, dan keluargaku karena kasih setia-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Filipi 1–4; Mazmur 109–110",
    prayer: "Ya ALLAH Tuhanku, bertindaklah memelihara masa depan studi, pekerjaan, dan keluargaku oleh karena kasih setia-Mu yang baik. Amin."
  },
  {
    devotion_date: "2026-12-07",
    title: "He Heals Your Memory",
    scripture: "Kejadian 41:51 & Mazmur 111:1 (TB)",
    reflection:
      "Kejadian 41:51 (TB)\n\"Yusuf memberi nama Manasyi kepada anak sulungnya itu, sebab katanya: ”Allah telah membuat aku lupa sama sekali kepada kesukaranku dan kepada rumah bapaku.”\"\n\n" +
      "Mazmur 111:1 (TB)\n\"Haleluya! Aku mau bersyukur kepada TUHAN dengan segenap hati, dalam lingkungan orang-orang jujur dan dalam jemaat.\"\n\n" +
      "He heals your memory so you can step into your victory. Tuhan sanggup memulihkan rasa sakit dari kesukaran masa lalu sehingga kita bisa bersyukur dengan segenap hati.\n\n" +
      "💭 Pertanyaan Refleksi:\nAdakah beban emosional atau kekecewaan masa lalu di perantauan yang perlu kubiarkan disembuhkan oleh Tuhan hari ini?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Kolose 1–4; Mazmur 111–112",
    prayer: "Haleluya! Sembuhkan setiap luka masa lalu di hatiku agar aku dapat bersyukur dengan segenap hati di tengah jemaat-Mu. Amin."
  },
  {
    devotion_date: "2026-12-08",
    title: "Land of Strain to Land of Gain",
    scripture: "Kejadian 41:52 & Mazmur 113:3 (TB)",
    reflection:
      "Kejadian 41:52 (TB)\n\"Dan kepada anaknya yang kedua diberinya nama Efraim, sebab katanya: ”Allah membuat aku mendapat anak dalam negeri kesengsaraanku.”\"\n\n" +
      "Mazmur 113:3 (TB)\n\"Dari terbitnya sampai kepada terbenamnya matahari terpujilah nama TUHAN.\"\n\n" +
      "Your land of strain is becoming your land of gain. Tempat yang tadinya terasa penuh air mata dan perjuangan diubah Allah menjadi ladang keberhasilan dan ucapan syukur.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku bisa tetap memuji nama Tuhan dari pagi hingga malam di tengah padatnya rutinitas harian di Palmy?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Tesalonika 1–5; Mazmur 113–114",
    prayer: "Dari terbitnya sampai terbenamnya matahari terpujilah nama-Mu ya TUHAN, yang mengubah perjuanganku menjadi buah yang manis. Amin."
  },
  {
    devotion_date: "2026-12-09",
    title: "Seasons Rotate, Protection Remains",
    scripture: "Kejadian 41:53 & Mazmur 115:11 (TB)",
    reflection:
      "Kejadian 41:53 (TB)\n\"Setelah lewat ketujuh tahun kelimpahan yang ada di tanah Mesir itu,\"\n\n" +
      "Mazmur 115:11 (TB)\n\"Hai orang-orang yang takut akan TUHAN, percayalah kepada TUHAN! — Dialah pertolongan mereka dan perisai mereka.\"\n\n" +
      "Seasons may rotate, but God's protection will never abate. Perubahan musim kehidupan tidak pernah mengurangi kadar pemeliharaan Tuhan atas orang-orang yang takut akan Dia.\n\n" +
      "💭 Pertanyaan Refleksi:\nSaat satu tahapan musim studi/kerja akan berakhir, apakah aku tetap menaruh percaya bahwa Dia adalah perisai pertolonganku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Tesalonika 1–3; Mazmur 115–116",
    prayer: "Tuhan, di setiap pergantian musim hidupku, aku percaya Engkaulah pertolongan dan perisaiku yang setia. Amin."
  },
  {
    devotion_date: "2026-12-10",
    title: "Bread for the Nations",
    scripture: "Kejadian 41:54 & Mazmur 117:1 (TB)",
    reflection:
      "Kejadian 41:54 (TB)\n\"mulailah datang tujuh tahun kelaparan, seperti yang telah dikatakan Yusuf; dalam seluruh negeri ada kelaparan, tetapi di seluruh tanah Mesir ada roti.\"\n\n" +
      "Mazmur 117:1 (TB)\n\"Pujilah TUHAN, hai segala bangsa, megahkanlah Dia, hai segala suku bangsa!\"\n\n" +
      "When the world feels empty, His house remains plenty. Penyediaan Tuhan bagi anak-anak-Nya membuat kita tetap memiliki \"roti\" kehidupan untuk dibagikan kepada bangsa-bangsa.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku bisa menjadi saluran \"roti\" kasih dan dukungan bagi teman-teman diaspora atau komunitas iCare minggu ini?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Timotius 1–6; Mazmur 117–118",
    prayer: "Tuhan, penuhilah hidupku dengan roti firman dan kasih-Mu agar aku dapat membagikannya kepada sesama di sekitarku. Amin."
  },
  {
    devotion_date: "2026-12-11",
    title: "Lamp to My Feet",
    scripture: "Kejadian 41:56 & Mazmur 119:105 (TB)",
    reflection:
      "Kejadian 41:56 (TB)\n\"Kelaparan itu merajalela di seluruh bumi. Maka Yusuf membuka segala lumbung dan menjual gandum kepada orang Mesir; sebab kelaparan itu sangat hebat di tanah Mesir.\"\n\n" +
      "Mazmur 119:105 (TB)\n\"Firman-Mu itu pelita bagi kakiku dan terang bagi jalanku.\"\n\n" +
      "Open your storehouse of faith when the dark night is surrounding the earth. Firman Tuhan adalah pelita yang menuntun kita untuk mengambil keputusan bijak di tengah situasi pelik.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah Firman-Nya yang menjadi penentu utama dalam setiap langkah dan keputusan masa depanku di NZ?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Timotius 1–4; Mazmur 119–120",
    prayer: "Tuhan, jadikanlah Firman-Mu pelita bagi kakiku dan terang bagi jalanku dalam mengambil setiap keputusan. Amin."
  },
  {
    devotion_date: "2026-12-12",
    title: "Look Up to Your Helper",
    scripture: "Kejadian 42:1 & Mazmur 121:1–2 (TB)",
    reflection:
      "Kejadian 42:1 (TB)\n\"Setelah Yakub mendapat kabar, bahwa ada gandum di Mesir, berkatalah ia kepada anak-anaknya: ”Mengapa kamu berpandang-pandangan saja?”\"\n\n" +
      "Mazmur 121:1-2 (TB)\n\"Nyanyian ziarah. Aku melayangkan mataku ke gunung-gunung; dari manakah akan datang pertolonganku? Pertolonganku ialah dari TUHAN, yang menjadikan langit dan bumi.\"\n\n" +
      "Don't just stare at the problem, start seeking the Provision. Jangan hanya saling memandang dalam kecemasan, tetapi layangkan mata iman kepada Tuhan Sang Pencipta.\n\n" +
      "💭 Pertanyaan Refleksi:\nSaat menghadapi jalan buntu dalam urusan finansial, visa, atau tugas di Palmy, ke manakah aku pertama kali mengarahkan pandanganku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Titus 1–3; Filemon 1; Mazmur 121–122",
    prayer: "Pertolonganku ialah dari TUHAN yang menjadikan langit dan bumi. Kulayangkan mata imanku hanya kepada-Mu hari ini. Amin."
  },
  {
    devotion_date: "2026-12-13",
    title: "Eyes Fixed on His Hand",
    scripture: "Kejadian 42:2 & Mazmur 123:2 (TB)",
    reflection:
      "Kejadian 42:2 (TB)\n\"Lagi katanya: ”Telah kudengar, bahwa ada gandum di Mesir; pergilah ke sana dan belilah gandum di sana untuk kita, supaya kita tetap hidup dan jangan mati.”\"\n\n" +
      "Mazmur 123:2 (TB)\n\"Lihat, seperti mata hamba-hamba memandang kepada tangan tuannya, seperti mata hamba perempuan memandang kepada tangan nyonyanya, demikianlah mata kita memandang kepada TUHAN, Allah kita, sampai Ia mengasihani kita.\"\n\n" +
      "Action aligned with instruction leads to divine preservation. Langkah ketaatan untuk bertindak di bawah petunjuk Tuhan adalah kunci keberlangsungan hidup kita.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah mataku terus terarah memandang kepada tangan Tuhan dengan tekun sampai Ia menyatakan belas kasihan-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Ibrani 1–4; Mazmur 123–124",
    prayer: "Tuhan Allahku, mataku memandang kepada tangan-Mu dengan tekun dan taat sampai Engkau menyatakan belas kasihan-Mu. Amin."
  },
  {
    devotion_date: "2026-12-14",
    title: "Unshakable Like Mount Zion",
    scripture: "Kejadian 42:6 & Mazmur 125:1 (TB)",
    reflection:
      "Kejadian 42:6 (TB)\n\"Sementara itu Yusuf telah menjadi kuasa di negeri itu; dialah yang menjual gandum kepada seluruh rakyat negeri itu. Jadi ketika saudara-saudara Yusuf datang, sujudlah mereka kepadanya dengan mukanya sampai ke tanah.\"\n\n" +
      "Mazmur 125:1 (TB)\n\"Nyanyian ziarah. Orang-orang yang percaya kepada TUHAN adalah seperti gunung Sion yang tidak goyang, yang tetap untuk selama-lamanya.\"\n\n" +
      "God's promises are not shaken by time, they are fulfilled in His prime. Penggenapan janji Tuhan membuktikan bahwa iman yang berpegang pada-Nya tidak akan pernah digoyahkan.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana penggenapan rencana Tuhan dalam hidupku menguatkan keteguhan imanku untuk tetap berdiri kokoh di perantauan?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Ibrani 5–7; Mazmur 125–126",
    prayer: "Tuhan, teguhkanlah imanku seperti gunung Sion yang tidak goyang karena percaya pada setiap janji-Mu. Amin."
  },
  {
    devotion_date: "2026-12-15",
    title: "Unless the Lord Builds",
    scripture: "Kejadian 42:8 & Mazmur 127:1 (TB)",
    reflection:
      "Kejadian 42:8 (TB)\n\"Sebab sekalipun Yusuf mengenal saudara-saudaranya, mereka tidak mengenal dia.\"\n\n" +
      "Mazmur 127:1 (TB)\n\"Nyanyian ziarah Salomo. Jikalau bukan TUHAN yang membangun rumah, sia-sialah usaha orang yang membangunya; jikalau bukan TUHAN yang menjaga kota, sia-sialah pengawal berjaga-jaga.\"\n\n" +
      "God works behind the scenes before He changes your open scenes. Pemeliharaan Tuhan sering kali bekerja secara tersembunyi tanpa disadari oleh manusia di sekitar kita.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah aku percaya bahwa segala usaha dan studiku di NZ hanya akan berhasil dan bermakna jika Tuhan sendiri yang membangunnya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Ibrani 8–10; Mazmur 127–128",
    prayer: "Tuhan, Engkaulah yang membangun rumah tangga, studi, dan pekerjaanku; aku bersandar sepenuhnya pada penyertaan-Mu. Amin."
  },
  {
    devotion_date: "2026-12-16",
    title: "Remembering the Mandate",
    scripture: "Kejadian 42:9 & Mazmur 129:8 (TB)",
    reflection:
      "Kejadian 42:9 (TB)\n\"Lalu teringatlah Yusuf akan mimpi-mimpinya tentang mereka. Berkatalah ia kepada mereka: ”Kamu ini pengintai, kamu datang untuk melihat-lihat di mana negeri ini tidak terjaga.”\"\n\n" +
      "Mazmur 129:8 (TB)\n\"dan orang-orang yang lewat tidak berkata: ”Berkat TUHAN atas kamu! Kami memberkati kamu dalam nama TUHAN!”\"\n\n" +
      "Memory of the mandate gives meaning to your movement. Mengingat kembali janji dan visi awal dari Tuhan menjaga kita dari keinginan untuk membalas dendam.\n\n" +
      "💭 Pertanyaan Refleksi:\nKetika dihadapkan pada masa lalu atau orang yang pernah menyakiti, apakah aku memilih merespons dengan hikmat dan berkat Tuhan?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Ibrani 11–13; Mazmur 129–130",
    prayer: "Tuhan, mampukan aku merespons setiap orang dengan hikmat dan berkat dalam nama-Mu, bukan dengan kepahitan. Amin."
  },
  {
    devotion_date: "2026-12-17",
    title: "The Fear of God",
    scripture: "Kejadian 42:18 & Mazmur 131:1 (TB)",
    reflection:
      "Kejadian 42:18 (TB)\n\"Pada hari yang ketiga berkatalah Yusuf kepada mereka: ”Buatlah begini, maka kamu akan tetap hidup, aku takut akan Allah.”\"\n\n" +
      "Mazmur 131:1 (TB)\n\"Nyanyian ziarah Daud. TUHAN, aku tidak tinggi hati, dan mataku tidak memandang dengan angkuh; aku tidak mengejar hal-hal yang terlalu besar atau hal-hal yang terlalu ajaib bagiku.\"\n\n" +
      "The fear of God is the foundation of genuine grace. Rasa takut akan Allah membuat seseorang yang memiliki kuasa memilih untuk berlaku adil dan bermurah hati.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah keputusan dan tindakan harianmu di tempat kerja atau kampus didasari oleh rasa takut dan hormat akan Allah?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Yakobus 1–5; Mazmur 131–132",
    prayer: "Tuhan, tanamkan rasa takut akan Allah dan kerendahan hati dalam setiap perkataan serta keputusanku hari ini. Amin."
  },
  {
    devotion_date: "2026-12-18",
    title: "Tears of Restoration",
    scripture: "Kejadian 42:24 & Mazmur 133:1 (TB)",
    reflection:
      "Kejadian 42:24 (TB)\n\"Maka Yusuf berpaling dari mereka, lalu menangis. Kemudian ia kembali kepada mereka dan berkata-kata dengan mereka; ia mengambil Simeon dari antara mereka; lalu disuruh belenggu di depan mata mereka.\"\n\n" +
      "Mazmur 133:1 (TB)\n\"Nyanyian ziarah Daud. Sungguh, betapa baiknya dan betapa indahnya, apabila saudara-saudara diam bersama dengan rukun!\"\n\n" +
      "Tears of restoration precede the triumph of reconciliation. Kasih sejati merindukan pemulihan hubungan keluarga, bukan sekadar kepuasan membalas rasa sakit.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku bisa menjadi pembawa kedamaian dan kerukunan di tengah keluarga maupun komunitas persekutuan di Palmy?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Petrus 1–5; Mazmur 133–134",
    prayer: "Tuhan, pakailah hidupku sebagai pembawa damai dan kerukunan di tengah keluarga serta persekutuan IFGF Palmy. Amin."
  },
  {
    devotion_date: "2026-12-19",
    title: "Unexpected Mercy",
    scripture: "Kejadian 42:28 & Mazmur 135:3 (TB)",
    reflection:
      "Kejadian 42:28 (TB)\n\"Kata orang itu kepada saudara-saudaranya: ”Uangku dikembalikan; ada di dalam karungku juga!” Lalu hati mereka menjadi tawar dan dengan gemetar mereka berkata seorang kepada yang lain: ”Apakah juga yang diperbuat Allah terhadap kita?”\"\n\n" +
      "Mazmur 135:3 (TB)\n\"Pujilah TUHAN, sebab TUHAN itu baik, bermazmurlah bagi nama-Nya, sebab nama itu indah!\"\n\n" +
      "Don't mistake God's mercy for a mystery of misery. Kebaikan Tuhan yang tak terduga sering kali membuat hati kita gentar sebelum kita menyadari betapa indahnya rencana-Nya.\n\n" +
      "💭 Pertanyaan Refleksi:\nSaat mengalami kejutan atau peristiwa yang tak terduga di perantauan, apakah aku tetap memuji Tuhan karena yakin bahwa Ia baik?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Petrus 1–3; Mazmur 135–136",
    prayer: "Pujilah TUHAN sebab TUHAN itu baik! Kupercayakan setiap peristiwa yang tak terduga di hidupku ke dalam tangan-Mu. Amin."
  },
  {
    devotion_date: "2026-12-20",
    title: "Integrity in Scarcity",
    scripture: "Kejadian 43:12 & Mazmur 137:1 (TB)",
    reflection:
      "Kejadian 43:12 (TB)\n\"Dan bawalah uang lipat dua kali banyaknya; uang yang telah dikembalikan ke dalam mulut karung-karungmu itu haruslah kamu bawa kembali; mungkin itu suatu kekhilafan.\"\n\n" +
      "Mazmur 137:1 (TB)\n\"Di tepi sungai-sungai Babel, di sanalah kita duduk sambil menangis, apabila kita mengingat Sion.\"\n\n" +
      "Integrity in scarcity shines brighter than gold in plenty. Kejujuran untuk mengembalikan apa yang bukan hak kita di tanah rantau adalah bukti karakter anak-anak terang.\n\n" +
      "💭 Pertanyaan Refleksi:\nDi tengah rasa rindu rumah (homesick) menjelang akhir tahun, apakah aku tetap berpegang teguh pada integritas dan kejujuran hidup?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 1 Yohanes 1–5; Mazmur 137–138",
    prayer: "Tuhan, peliharalah kejujuran dan integritasku di tanah rantau sebagai terang Kristus bagi orang-orang di sekitarku. Amin."
  },
  {
    devotion_date: "2026-12-21",
    title: "Surrender to El Shaddai",
    scripture: "Kejadian 43:14 & Mazmur 139:14 (TB)",
    reflection:
      "Kejadian 43:14 (TB)\n\"Allah Yang Mahakuasa kiranya membuat orang itu menaruh belas kasihan kepadamu, supaya ia melepaskan saudaramu yang satu lagi itu beserta Benyamin. Mengenai aku ini, jika terpaksa aku kehilangan anak-anakku, biarlah kehilangan!”\"\n\n" +
      "Mazmur 139:14 (TB)\n\"Aku bersyukur kepada-Mu oleh karena kejadianku dahsyat dan ajaib; ajaib apa yang Kaubuat, dan jiwaku benar-benar menyadarinya.\"\n\n" +
      "Surrender your highest treasure to receive God's deepest measure. Kepasrahan total di hadapan Allah Yang Mahakuasa membuka jalan bagi keajaiban pemeliharaan-Nya.\n\n" +
      "💭 Pertanyaan Refleksi:\nAdakah kekhawatiran terbesar dalam hidupku yang perlu kulesapkan ke dalam tangan Allah yang merajut hidupku secara ajaib?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: 2 Yohanes 1; 3 Yohanes 1; Yudas 1; Mazmur 139–140",
    prayer: "Allah Yang Mahakuasa, kuserahkan kekhawatiran terbesarku ke dalam tangan-Mu dan bersyukur atas karya-Mu yang ajaib. Amin."
  },
  {
    devotion_date: "2026-12-22",
    title: "Assurance of His Treasure",
    scripture: "Kejadian 43:23 & Mazmur 141:2 (TB)",
    reflection:
      "Kejadian 43:23 (TB)\n\"Maka katanya: ”Bawalah damai sejahtera bagimu, jangan takut; Allahmu dan Allah ayahmu telah memberikan kepadamu harta terpendam dalam karung-karungmu; uangmu itu telah kuterima.” Kemudian dikeluarkannyalah Simeon kepada mereka.\"\n\n" +
      "Mazmur 141:2 (TB)\n\"Biarlah doaku adalah bagi-Mu seperti persembahan ukupan, dan tanganku yang terangkat seperti persembahan petang.\"\n\n" +
      "Peace is not the absence of trouble, but the assurance of His treasure. Damai sejahtera menyertai kita ketika menyadari bahwa Allah yang menyediakan setiap kebutuhan hidup kita.\n\n" +
      "💭 Pertanyaan Refleksi:\nApakah doaku hari ini naik sebagai persembahan yang harum, membawa rasa tenang di tengah persiapan Natal dan penutupan tahun?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 1–3; Mazmur 141–142",
    prayer: "Tuhan, biarlah doaku hari ini naik seperti persembahan ukupan yang harum, dan penuhilah hatiku dengan damai sejahtera-Mu. Amin."
  },
  {
    devotion_date: "2026-12-23",
    title: "Morning Mercy",
    scripture: "Kejadian 43:29 & Mazmur 143:8 (TB)",
    reflection:
      "Kejadian 43:29 (TB)\n\"Ketika Yusuf memandang mereka, dilihatnyalah Benyamin, adiknya, yang seibu dengan dia, lalu katanya: ”Inikah adimmu yang muda itu, yang telah kamu sebut-sebut kepadamu?” Lagi katanya: ”Allah mengasihani engkau, anakku!”\"\n\n" +
      "Mazmur 143:8 (TB)\n\"Perdengarkanlah kasih setia-Mu kepadaku pada waktu pagi, sebab kepada-Mulah aku percaya! Beritahukanlah aku jalan yang harus kutempuh, sebab kepada-Mulah aku angkat jiwaku.\"\n\n" +
      "God's mercy transforms tears of longing into ties of loving. Kasih kasihan Tuhan mempertemukan kembali hati yang terpisah dan memberikan petunjuk jalan yang harus ditempuh.\n\n" +
      "💭 Pertanyaan Refleksi:\nDi pagi hari ini, apakah aku sudah mengangkat jiwaku memohon agar kasih setia Tuhan menuntun setiap langkah pergaulanku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 4–6; Mazmur 143–144",
    prayer: "Tuhan, perdengarkanlah kasih setia-Mu pada waktu pagi ini dan tunjukkanlah jalan yang harus kutempuh. Amin."
  },
  {
    devotion_date: "2026-12-24",
    title: "Overflow of Christmas Compassion (Malam Natal)",
    scripture: "Kejadian 43:30 & Mazmur 145:9 (TB)",
    reflection:
      "Kejadian 43:30 (TB)\n\"Lalu segeralah Yusuf keluar, sebab hatinya sangat terharu menyaksikan adiknya itu, dan ia mencari tempat untuk menangis; ia masuk ke dalam kamar dan menangis di situ.\"\n\n" +
      "Mazmur 145:9 (TB)\n\"TUHAN itu baik kepada semua orang, dan penuh kasih sayang terhadap segala yang dijadikan-Nya.\"\n\n" +
      "The greatest abundance of Christmas is the overflow of God's compassion. Sukacita Natal berakar pada kebaikan dan kasih sayang Tuhan yang melimpah bagi setiap manusia.\n\n" +
      "💭 Pertanyaan Refleksi:\nDi Malam Natal ini, bagaimana aku merespons kasih sayang Allah yang begitu besar yang telah memelihara hidupku di perantauan?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 7–9; Mazmur 145–146",
    prayer: "Tuhan, di Malam Natal ini aku bersyukur atas kasih sayang-Mu yang begitu besar yang telah memeliharaku sepanjang tahun. Amin."
  },
  {
    devotion_date: "2026-12-25",
    title: "Sent Ahead to Save Lives (Hari Natal)",
    scripture: "Kejadian 45:5 & Mazmur 147:1 (TB)",
    reflection:
      "Kejadian 45:5 (TB)\n\"Tetapi sekarang, janganlah bersusah hati dan janganlah menyesali diri, karena kamu menjual aku ke mari, sebab untuk memelihara kehidupanlah Allah menyuruh aku mendahului kamu.\"\n\n" +
      "Mazmur 147:1 (TB)\n\"Haleluya! Sungguh, bermazmur bagi Allah kita itu baik, sungguh, memuji-muji Dia itu indah, dan rasanya layak.\"\n\n" +
      "Christmas is the celebration that God sent His Son ahead to save our lives. Natal adalah bukti puncak bahwa Allah bertindak mendahului kita untuk mendatangkan keselamatan dan pemeliharaan kekal.\n\n" +
      "💭 Pertanyaan Refleksi:\nSelamat Hari Natal! Sudahkah hatiku memuji-muji Dia atas anugerah keselamatan dan rencana-Nya yang sempurna bagi hidupku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 10–12; Mazmur 147–148",
    prayer: "Haleluya! Terima kasih Bapa atas anugerah terbesar di Hari Natal ini: Yesus Kristus yang datang memelihara dan menyelamatkan hidup kami. Amin."
  },
  {
    devotion_date: "2026-12-26",
    title: "Preserved for Purpose",
    scripture: "Kejadian 45:7 & Mazmur 149:1 (TB)",
    reflection:
      "Kejadian 45:7 (TB)\n\"Maka Allah telah menyuruh aku mendahului kamu untuk menjamin kelanjutan keturunanmu di bumi dan untuk memelihara hidupmu, sehingga sebagian besar dari padamu terluput.\"\n\n" +
      "Mazmur 149:1 (TB)\n\"Haleluya! Nyanyikanlah bagi TUHAN nyanyian baru! Pujilah Dia dalam jemaat orang-orang saleh!\"\n\n" +
      "Your preservation is for the purpose of a nation's salvation. Pemeliharaan hidup yang kita nikmati di NZ adalah agar kita menjadi mata rantai berkat bagi generasi berikutnya.\n\n" +
      "💭 Pertanyaan Refleksi:\nNyanyian syukur baru apa yang timbul di hatiku saat menyadari bahwa Tuhan menjamin masa depan hidupku di perantauan ini?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 13–15; Mazmur 149–150",
    prayer: "Haleluya! Kunyanyikan nyanyian syukur yang baru bagi-Mu karena Engkau menjamin masa depan dan memelihara hidupku. Amin."
  },
  {
    devotion_date: "2026-12-27",
    title: "Divine Allocation",
    scripture: "Kejadian 45:8 & Mazmur 150:6 (TB)",
    reflection:
      "Kejadian 45:8 (TB)\n\"Jadi bukanlah kamu yang menyuruh aku ke mari, melainkan Allah; Ia telah mendudukkan aku sebagai bapa bagi Firaun dan tuan atas seluruh istananya dan sebagai kuasa atas seluruh tanah Mesir.\"\n\n" +
      "Mazmur 150:6 (TB)\n\"Biarlah segala yang bernafas memuji TUHAN! Haleluya!\"\n\n" +
      "It was not human location, but divine allocation that brought you here. Bukan sekadar alasan studi atau kerja yang membawamu ke Palmy, melainkan kedaulatan Allah untuk tujuan-Nya.\n\n" +
      "💭 Pertanyaan Refleksi:\nMenutup pembacaan kitab Mazmur di hari Minggu terakhir tahun ini, apakah seluruh nafas hidupku dipenuhi puji-pujian kepada-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 16–18 (Pembacaan Kitab Mazmur Selesai)",
    prayer: "Biarlah segala yang bernafas memuji TUHAN! Terima kasih atas penempatan ilahi-Mu bagiku di Palmerston North. Haleluya, Amin."
  },
  {
    devotion_date: "2026-12-28",
    title: "Knowing the One Who Feeds",
    scripture: "Kejadian 45:11 & Mazmur 103:2 (TB)",
    reflection:
      "Kejadian 45:11 (TB)\n\"Di sanalah Aku memelihara engkau — sebab kelaparan ini masih ada lima tahun lagi — supaya engkau jangan jatuh miskin bersama seisi rumahmu dan semua orang yang ikut dengan engkau.”\"\n\n" +
      "Mazmur 103:2 (TB)\n\"Pujilah TUHAN, hai jiwaku, dan janganlah lupakan segala kebaikan-Nya!\"\n\n" +
      "Abundance is not having no needs, but knowing the One who feeds. Kelimpahan sejati adalah kepastian bahwa Tuhan senantiasa memelihara kita di mana pun kita berada.\n\n" +
      "💭 Pertanyaan Refleksi:\nSaat menyelesaikan pembacaan seluruh Alkitab hari ini, janji pemeliharaan mana yang paling membakar semangat imanku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Wahyu 19–22 (Seluruh Alkitab Selesai Dibaca)",
    prayer: "Pujilah TUHAN, hai jiwaku, dan janganlah lupakan segala kebaikan-Nya! Terima kasih atas Firman-Mu yang hidup dan memelihara kami. Amin."
  },
  {
    devotion_date: "2026-12-29",
    title: "Satisfied in His Supply",
    scripture: "Kejadian 45:28 & Mazmur 100:4 (TB)",
    reflection:
      "Kejadian 45:28 (TB)\n\"Kata Israel: ”Cukuplah itu; anakku Yusuf masih hidup; aku mau pergi melihatnya, sebelum aku mati.”\"\n\n" +
      "Mazmur 100:4 (TB)\n\"Masuklah melalui pintu gerbang-Nya dengan nyanyian syukur, ke dalam pelataran-Nya dengan puji-pujian; bersyukurlah kepada-Nya dan pujilah nama-Nya!\"\n\n" +
      "Satisfied in His supply, ready to see His wonders multiply. Rasa cukup di dalam Tuhan memberikan kepuasan dan kedamaian jiwa di penghujung tahun.\n\n" +
      "💭 Pertanyaan Refleksi:\nMemasuki hari-hari refleksi akhir tahun, hal mendasar apa yang paling kuketaati sebagai bentuk nyanyian syukurku kepada-Nya?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Refleksi, Syukur & Evaluasi Akhir Tahun (Hari ke-1)",
    prayer: "Tuhan, kumasuki pelataran-Mu dengan nyanyian syukur dan hati yang dipuaskan oleh kebaikan-Mu sepanjang tahun 2026. Amin."
  },
  {
    devotion_date: "2026-12-30",
    title: "Masterwork of Mercy",
    scripture: "Kejadian 50:20 & Mazmur 118:24 (TB)",
    reflection:
      "Kejadian 50:20 (TB)\n\"Memang kamu telah mereka-rekakan yang jahat terhadap aku, tetapi Allah telah mereka-rekakannya untuk kebaikan, dengan maksud melakukan seperti yang terjadi sekarang ini, yakni memelihara hidup suatu bangsa yang besar.\"\n\n" +
      "Mazmur 118:24 (TB)\n\"Inilah hari yang dijadikan TUHAN, marilah kita bersorak-sorak dan bersukacita karenanya!\"\n\n" +
      "God reroutes human malice to reveal His masterwork of mercy. Tuhan sanggup mengubah segala tekanan, kesulitan, dan niat buruk menjadi kebaikan bagi pembentukan hidup kita.\n\n" +
      "💭 Pertanyaan Refleksi:\nBagaimana aku melihat setiap pergumulan dan tantangan di NZ sepanjang tahun 2026 ini ternyata dirajut Allah untuk kebaikanku?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Refleksi, Syukur & Evaluasi Akhir Tahun (Hari ke-2)",
    prayer: "Tuhan, terima kasih karena Engkau merajut setiap pergumulan dan tantangan di tahun 2026 menjadi kebaikan bagi hidupku. Amin."
  },
  {
    devotion_date: "2026-12-31",
    title: "Finish with Thanksgiving (Malam Tahun Baru)",
    scripture: "Kejadian 50:24 & Mazmur 116:12 (TB)",
    reflection:
      "Kejadian 50:24 (TB)\n\"Berkatalah Yusuf kepada saudara-saudaranya: ”Tidak lama lagi aku akan mati; tentu Allah akan memperhatikan kamu dan membawa kamu keluar dari negeri ini ke negeri yang telah dijanjikan-Nya dengan sumpah kepada Abraham, Ishak dan Yakub.”\"\n\n" +
      "Mazmur 116:12 (TB)\n\"Bagaimanakah akan kubalas kepada TUHAN segala kebajikan-Nya kepadaku?\"\n\n" +
      "Finish the year with thanksgiving, enter the future with his covenant remaining. Memelihara janji Tuhan adalah jaminan terbaik saat kita melangkah memasuki tahun yang baru.\n\n" +
      "💭 Pertanyaan Refleksi:\nDi penghujung tahun 2026 ini, komitmen syukur apa yang ingin kupersembahkan kepada Tuhan atas seluruh kebajikan-Nya di Palmy?\n\n" +
      "📖 Bacaan Alkitab 1 Tahun: Refleksi, Syukur & Persiapan Tahun Baru 2027 (Tahun 2026 Selesai)",
    prayer: "Terima kasih TUHAN atas segala kebajikan-Mu sepanjang tahun 2026! Dengan iman dan syukur kami melangkah memasuki tahun 2027 bersama janji-Mu. Amin."
  }
];

export async function seedNov20toDec31Devotions() {
  const batch = writeBatch(db);
  DEVOTIONS_NOV20_DEC31_2026.forEach(item => {
    batch.set(
      doc(db, "daily_devotions", item.devotion_date),
      {
        ...item,
        created_at: serverTimestamp()
      },
      { merge: true }
    );
  });
  await batch.commit();
  return DEVOTIONS_NOV20_DEC31_2026.length;
}
