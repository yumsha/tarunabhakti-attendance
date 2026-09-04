import XLSX from "xlsx-js-style";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Constants

export const TEMPLATE_HEADERS = [
  "NISN",
  "NIPD",
  "NIK",
  "Nama",
  "Tempat Lahir",
  "Tanggal Lahir (YYYY-MM-DD)",
  "Jenis Kelamin",
  "Agama",
  "Kelas",
  "Jurusan",
  "Rombel",
  "ID Orang Tua",
  "NIK Orang Tua",
  "Nama Orang Tua",
  "No Telp Orang Tua",
  "Pekerjaan Orang Tua",
  "Alamat Orang Tua",
];

export const UPDATE_HEADERS = [
  "NISN",
  "NIPD",
  "NIK",
  "Nama",
  "Tempat Lahir",
  "Tanggal Lahir (YYYY-MM-DD)",
  "Jenis Kelamin",
  "Agama",
  "Kelas",
  "Jurusan",
  "Rombel",
  "ID Orang Tua",
];

// Jumlah request paralel saat proses import/update massal.
export const CONCURRENCY = 5;

// Helper: jalankan banyak task async dengan batasan concurrency
export async function runWithConcurrency(items, concurrency, worker, onProgress) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  async function run() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      completed++;
      if (onProgress) onProgress(completed, items.length, results);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, run));
  return results;
}

// Helper: pencocokan data kelas dari Excel dengan daftar kelas di DB
export function normalizeStr(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findMatchingKelas(namaKelasRaw, jurusanRaw, rombelRaw, kelasList) {
  if (!kelasList || !kelasList.length) return null;

  const kelasInput = normalizeStr(namaKelasRaw);
  const rawJurusan = normalizeStr(jurusanRaw);
  const rombelInput = normalizeStr(rombelRaw);

  if (!kelasInput) return null;

  // Siapkan kandidat nama jurusan
  const candidateJurusanSet = new Set();
  if (rawJurusan) {
    candidateJurusanSet.add(rawJurusan);
    if (rombelInput) {
      if (!rawJurusan.endsWith(rombelInput)) {
        candidateJurusanSet.add(`${rawJurusan} ${rombelInput}`);
        candidateJurusanSet.add(`${rawJurusan}${rombelInput}`);
      }
    }
  }

  // 1. Pencocokan tepat berdasarkan kelas & kandidat jurusan
  let matched = kelasList.find((k) => {
    const kKelas = normalizeStr(k.kelas);
    const kJurusan = normalizeStr(k.jurusan);

    if (kKelas !== kelasInput) return false;
    if (candidateJurusanSet.size === 0) return true;
    return candidateJurusanSet.has(kJurusan);
  });

  if (matched) return matched;

  // 2. Pencocokan gabungan lengkap
  const fullCombinedInput = normalizeStr(`${namaKelasRaw || ""} ${jurusanRaw || ""} ${rombelRaw || ""}`);
  matched = kelasList.find((k) => {
    const kFull = normalizeStr(`${k.kelas} ${k.jurusan}`);
    return kFull === fullCombinedInput;
  });

  if (matched) return matched;

  // 3. Fallback: pencocokan kelas & substring jurusan
  if (candidateJurusanSet.size > 0) {
    matched = kelasList.find((k) => {
      const kKelas = normalizeStr(k.kelas);
      const kJurusan = normalizeStr(k.jurusan);
      if (kKelas !== kelasInput) return false;

      for (const candidate of candidateJurusanSet) {
        if (kJurusan.includes(candidate) || candidate.includes(kJurusan)) {
          return true;
        }
      }
      return false;
    });
  }

  return matched || null;
}

// Template Guide Sheet
export function getSiswaGuideSheet() {
  const guideData = [
    ["PANDUAN PENGGUNAAN - IMPORT & UPDATE DATA SISWA"],
    [""],
    ["1. ATURAN ANGKA NOL DI DEPAN (SANGAT PENTING!)"],
    ["   Untuk data yang diawali angka 0 seperti NISN, NIPD, atau NIK,"],
    ["   WAJIB tambahkan tanda petik tunggal (') di awal data di Excel agar terbaca sebagai Teks oleh Excel."],
    ["   Contoh: '3050626105 atau '2005-06-01"],
    ["   Jika tidak ditambahkan, Excel akan otomatis menghapus angka 0 di depan dan merusak format data Anda."],
    [""],
    ["2. PANDUAN DATA KELAS, JURUSAN, ROMBEL & GENDER SISWA"],
    ["   - Kolom 'Kelas': Tingkat kelas di sistem (Contoh: X, XI, atau XII)."],
    ["   - Kolom 'Jurusan': Nama jurusan (Contoh: Rekayasa Perangkat Lunak)."],
    ["   - Kolom 'Rombel': Nomor kelas paralel (Contoh: 1 atau 2). Sistem akan menggabungkan Jurusan + Rombel."],
    ["   - Pastikan kombinasi Kelas, Jurusan, & Rombel sesuai dengan kelas yang terdaftar di sistem."],
    ["   - WAJIB: Kolom Jenis Kelamin harus menggunakan huruf KAPITAL (L untuk Laki-laki, P untuk Perempuan). Contoh: L atau P."],
    [""],
    ["3. CARA TAMBAH DATA SISWA & RELASI ORANG TUA."],
    ["   - Gunakan template Excel yang tersedia"],
    ["   - Jika orang tua sudah terdaftar: Cukup isi kolom 'ID Orang Tua', kosongkan kolom detail orang tua."],
    ["   - Jika orang tua belum terdaftar: Kosongkan 'ID Orang Tua', dan isi lengkap NIK Orang Tua s/d Alamat Orang Tua."],
    [""],
    ["4. CARA UPDATE DATA SISWA (TUNGGAL)"],
    ["   - Gunakan template excel yang tersedia"],
    ["   - Ubah data siswa di Excel (misal memindahkan kelas siswa dengan mengubah 'Kelas', 'Jurusan', atau 'Rombel')."],
    ["   - PERINGATAN: Kolom NISN bertindak sebagai kunci utama. Jangan pernah mengubah nilai NISN pada data yang ingin diupdate!"],
    [""],
    ["5. CARA UPDATE DATA SISWA (MASSAL)"],
    ["   - Ekspor data terlebih dahulu untuk mendapatkan semua data siswa saat ini yang berisi kolom NISN."],
    ["   - Ubah data siswa di Excel."],
    ["   - PERINGATAN: Kolom NISN bertindak sebagai kunci utama. Jangan pernah mengubah nilai NISN pada data yang ingin diupdate!"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(guideData);
  ws["!cols"] = [{ wch: 125 }];

  // Style Title Row (A1)
  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCell]) {
    ws[titleCell].s = {
      fill: { fgColor: { rgb: "1E3A8A" } },
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center" }
    };
  }

  // Style Section Headers
  const sectionRows = [2, 8, 14, 19, 24];
  sectionRows.forEach((r) => {
    const cell = XLSX.utils.encode_cell({ r: r, c: 0 });
    if (ws[cell]) {
      ws[cell].s = {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "1E3A8A" } }
      };
    }
  });

  // Style Content and Warning Alerts
  for (let r = 0; r < guideData.length; r++) {
    if (r === 0 || sectionRows.includes(r)) continue;
    const cell = XLSX.utils.encode_cell({ r: r, c: 0 });
    if (ws[cell]) {
      const val = String(ws[cell].v);
      let color = "374151";
      let bold = false;
      if (val.includes("SANGAT PENTING") || val.includes("PERINGATAN") || val.includes("WAJIB")) {
        color = "DC2626";
        bold = true;
      }
      ws[cell].s = {
        font: { name: "Arial", sz: 10, bold, color: { rgb: color } }
      };
    }
  }

  return ws;
}

const EXAMPLE_ROW_WITH_ID = [
  "3050626105", "2025001", "3201010103070001", "Sandi Permata", "Bogor", "2005-12-06", "L", "Islam", "XII", "Rekayasa Perangkat Lunak", "1",
  "1",
  "", "", "", "", "",
];

const EXAMPLE_ROW_NEW_PARENT = [
  "3050626106", "2025002", "3201010103070002", "Dewi Rahayu", "Bogor", "2006-03-15", "P", "Islam", "XI", "Teknik Komputer Jaringan", "1",
  "",
  "3201234567890001", "Budi Santoso", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1 Bogor",
];

function styleHeader(ws, headers, mode = "import") {
  const bgColor = mode === "update" ? "10B981" : mode === "export" ? "F97316" : "2563EB";
  headers.forEach((h, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: bgColor } },
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border: {
          top: { style: "thin", color: { rgb: "E5E7EB" } },
          bottom: { style: "medium", color: { rgb: "9CA3AF" } },
          left: { style: "thin", color: { rgb: "E5E7EB" } },
          right: { style: "thin", color: { rgb: "E5E7EB" } }
        }
      };
    }
  });
}

export function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    EXAMPLE_ROW_WITH_ID,
    EXAMPLE_ROW_NEW_PARENT,
  ]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 26 }));
  styleHeader(ws, TEMPLATE_HEADERS, "import");

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.utils.book_append_sheet(wb, getSiswaGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "template_siswa.xlsx");
}

export function downloadPdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Template Import Data Siswa", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Aturan Orang Tua: Isi 'ID Orang Tua' jika sudah ada di DB (kolom detail diabaikan). " +
    "Jika ID kosong/tidak ditemukan, isi kolom NIK s/d Alamat Orang Tua untuk membuat data baru.",
    14, 21, { maxWidth: 270 }
  );
  autoTable(doc, {
    startY: 28,
    head: [TEMPLATE_HEADERS],
    body: [EXAMPLE_ROW_WITH_ID, EXAMPLE_ROW_NEW_PARENT],
    styles: { fontSize: 7 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      11: { fillColor: [239, 246, 255] },
      12: { fillColor: [240, 253, 244] },
      13: { fillColor: [240, 253, 244] },
      14: { fillColor: [240, 253, 244] },
      15: { fillColor: [240, 253, 244] },
      16: { fillColor: [240, 253, 244] },
    },
  });
  doc.save("template_siswa.pdf");
}

export function downloadUpdateExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    UPDATE_HEADERS,
    ["3050626105", "2025001", "3201010103070001", "Sandi Permata", "Bogor", "2005-12-06", "L", "Islam", "XII", "Rekayasa Perangkat Lunak", "1", 1],
  ]);
  ws["!cols"] = UPDATE_HEADERS.map(() => ({ wch: 26 }));
  styleHeader(ws, UPDATE_HEADERS, "update");

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Update Siswa");
  XLSX.utils.book_append_sheet(wb, getSiswaGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "update_siswa.xlsx");
}

export function downloadUpdatePdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Update Data Siswa", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NISN digunakan sebagai key pencarian. Kelas, Jurusan, & Rombel diisi sesuai kelas di sistem.", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [UPDATE_HEADERS],
    body: [["3050626105", "2025001", "3201010103070001", "Sandi Permata", "Bogor", "2005-12-06", "L", "Islam", "XII", "Rekayasa Perangkat Lunak", "1", "1"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save("update_siswa.pdf");
}

export function exportTablePdf(students) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Data Siswa", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["NISN", "NIPD", "NIK", "Nama", "Tempat Lahir", "Tanggal Lahir (YYYY-MM-DD)", "Jenis Kelamin", "Agama", "Kelas", "Jurusan"]],
    body: students.map((s) => [
      s.nisn || s.NISN || "-",
      s.nipd || s.NIPD || "-",
      s.nik || s.NIK || "-",
      s.nama || "-",
      s.tempat_lahir || "-",
      s.tgl_lahir?.slice(0, 10) || s.tanggal_lahir?.slice(0, 10) || "-",
      s.jenis_kelamin || s.gender || "-",
      s.agama || "-",
      s.kelas?.kelas || "-",
      s.kelas?.jurusan || "-",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("data_siswa.pdf");
}

export function exportTableExcel(students) {
  const rows = students.map((s) => ({
    "NISN": String(s.nisn || s.NISN || ""),
    "NIPD": String(s.nipd || s.NIPD || ""),
    "NIK": String(s.nik || s.NIK || ""),
    "Nama": s.nama || "",
    "Tempat Lahir": s.tempat_lahir || "",
    "Tanggal Lahir (YYYY-MM-DD)": (s.tgl_lahir ? s.tgl_lahir.slice(0, 10) : (s.tanggal_lahir ? s.tanggal_lahir.slice(0, 10) : "")),
    "Jenis Kelamin": s.jenis_kelamin || s.gender || "",
    "Agama": s.agama || "",
    "Kelas": s.kelas?.kelas || "",
    "Jurusan": s.kelas?.jurusan || "",
    "ID Orang Tua": s.orangtua_id || s.orang_tua?.id || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const nisnCell = XLSX.utils.encode_cell({ r: R, c: 0 });
    const nipdCell = XLSX.utils.encode_cell({ r: R, c: 1 });
    const nikCell = XLSX.utils.encode_cell({ r: R, c: 2 });
    if (ws[nisnCell]) { ws[nisnCell].v = String(ws[nisnCell].v).trim(); ws[nisnCell].t = "s"; ws[nisnCell].z = "@"; }
    if (ws[nipdCell]) { ws[nipdCell].v = String(ws[nipdCell].v).trim(); ws[nipdCell].t = "s"; ws[nipdCell].z = "@"; }
    if (ws[nikCell]) { ws[nikCell].v = String(ws[nikCell].v).trim(); ws[nikCell].t = "s"; ws[nikCell].z = "@"; }
  }

  const headers = Object.keys(rows[0] || {});
  styleHeader(ws, headers, "export");

  ws["!cols"] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, "data_siswa.xlsx");
}
