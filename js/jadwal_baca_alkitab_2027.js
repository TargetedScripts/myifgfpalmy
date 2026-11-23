// types/jadwal-baca-alkitab-2027.ts

export type HariIndonesia =
  | "Senin"
  | "Selasa"
  | "Rabu"
  | "Kamis"
  | "Jumat"
  | "Sabtu"
  | "Minggu";

export type BulanIndonesia =
  | "Januari"
  | "Februari"
  | "Maret"
  | "April"
  | "Mei"
  | "Juni"
  | "Juli"
  | "Agustus"
  | "September"
  | "Oktober"
  | "November"
  | "Desember";

export interface JadwalBacaAlkitab2027 {
  /** Document ID dengan format "YYYY-MM-DD" (contoh: "2027-01-01") */
  id?: string;
  /** Tanggal ISO dengan format "YYYY-MM-DD" (contoh: "2027-01-01") */
  tanggal: string;
  /** Nama hari dalam Bahasa Indonesia (contoh: "Jumat", "Sabtu", "Minggu") */
  hari: string;
  /** Nama bulan dalam Bahasa Indonesia (contoh: "Januari", "Februari") */
  bulan: string;
  /** Tema refleksi bulanan (contoh: "Begin to See (Keluaran 1–2)") */
  temaBulanan: string;
  /** Tema refleksi mingguan (contoh: "Ketika Realitas Menindas Janji") */
  temaMingguan: string;
  /** Referensi bacaan Alkitab harian (contoh: "Keluaran 1:1–14") */
  bacaanAlkitab: string;
  /** Keterangan tambahan / konteks ibadah atau IG/newsletter */
  keterangan: string;
}
