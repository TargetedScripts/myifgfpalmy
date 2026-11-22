// js/editor-insight-parser.js

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
    const graceFocus = sents.find(s => /anugerah|penebusan|kristus|salib/i.test(s)) || sents[0];
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

    // 1. Deteksi Judul (biasanya blok pertama dengan **...** atau baris pendek tanpa titik akhir)
    if (!title && idx === 0 && /\*\*.*\*\*/.test(block) && block.length < 120) {
      title = cleanLine;
      return;
    }

    // 2. Deteksi Ayat Kunci (mengandung — / – / - dan referensi pasal/ayat atau tanda kutip ayat)
    if (!scripture && (/[—–-]\s*[1-3]?\s*[A-Za-zÀ-ÿ]+\s+\d+:\d+/.test(cleanLine) || /^[“"].*[”"].*[—–-]/.test(cleanLine))) {
      scripture = cleanLine;
      return;
    }

    // 3. Buang sapaan pembuka & penutup standar
    if (/^shalom[,.!]?$/i.test(cleanLine) || /^tuhan yesus memberkati[.!]?$/i.test(cleanLine)) {
      return;
    }

    bodyBlocks.push(block);
  });

  // Jika judul belum ketemu dari blok pertama, ambil baris pertama non-ayat
  if (!title && bodyBlocks.length > 0) {
    title = cleanMarkdown(bodyBlocks.shift());
  }

  // Ekstrak sticky_hook (kalimat/frasa bold berbahasa Inggris) lalu hapus dari paragraf
  const paragraphs = bodyBlocks.map(block => {
    const boldMatches = [...block.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].trim());
    const englishHook = boldMatches.find(
      txt => /[a-zA-Z]{3,}/.test(txt) && !/\b(yang|dan|di|ke|dari|untuk|dengan|pada|allah|tuhan|yusuf|firaun)\b/i.test(txt)
    );

    let cleanedBlock = block;
    if (englishHook) {
      stickyHook = englishHook;
      // Hapus bagian **...** hook beserta spasi berlebih
      cleanedBlock = cleanedBlock
        .replace(/\*\*[^*]+\*\*/g, (match) => (cleanMarkdown(match) === englishHook ? " " : match))
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    return cleanMarkdown(cleanedBlock)
      .replace(/^shalom,\s*/i, "")
      .replace(/\s*tuhan yesus memberkati\.?$/i, "")
      .trim();
  }).filter(Boolean);

  const takeaways = buildAutoTakeaways(paragraphs, stickyHook);

  return {
    start_date: meta.start_date || "",
    edition_no: (meta.edition_no || "").toUpperCase(),
    date_label: (meta.date_label || "").toUpperCase(),
    header_date: (meta.header_date || "").toUpperCase(),
    title,
    scripture,
    sticky_hook: stickyHook,
    paragraphs,
    takeaways
  };
}
