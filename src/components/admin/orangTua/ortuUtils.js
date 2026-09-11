let _xlsxPromise = null;
export function loadXLSX() {
  if (!_xlsxPromise) _xlsxPromise = import("xlsx-js-style");
  return _xlsxPromise;
}

let _pdfLibsPromise = null;
export function loadPdfLibs() {
  if (!_pdfLibsPromise) {
    _pdfLibsPromise = Promise.all([import("jspdf"), import("jspdf-autotable")]).then(
      ([jsPDFModule, autoTableModule]) => ({
        jsPDF: jsPDFModule.default,
        autoTable: autoTableModule.default,
      })
    );
  }
  return _pdfLibsPromise;
}

export const CONCURRENCY = 5;

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

export const TEMPLATE_HEADERS = [
  "Nama Orang Tua",
  "NIK",
  "Nomor Telepon",
  "Pekerjaan",
  "Alamat",
];

export const EXPORT_HEADERS = [
  "Nama Orang Tua",
  "NIK",
  "Nomor Telepon",
  "Pekerjaan",
  "Alamat",
];

export const UPDATE_ORTU_HEADERS = [
  "ID",
  "Nama Orang Tua",
  "NIK",
  "Nomor Telepon",
  "Pekerjaan",
  "Alamat",
];

export function getOrangTuaGuideSheet(XLSX) {
  const guideData = [
    ["PANDUAN PENGGUNAAN - IMPORT & UPDATE DATA ORANG TUA"],
    [""],
    ["1. ATURAN ANGKA NOL DI DEPAN (SANGAT PENTING!)"],
    ["   Untuk data yang diawali angka 0 seperti Nomor Telepon atau NIK"],
    ["   WAJIB tambahkan tanda petik tunggal (') di awal data di Excel agar dibaca sebagai teks."],
    ["   Contoh: '08123456789 atau '0205001"],
    ["   Jika tidak menggunakan tanda petik tunggal, Excel akan otomatis membuang angka 0 di depan dan merusak data."],
    [""],
    ["2. CARA IMPORT DATA BARU"],
    ["   - Isi kolom: Nama Orang Tua, NIK, Nomor Telepon, Pekerjaan, dan Alamat."],
    ["   - NIK dan Nomor Telepon harus unik untuk setiap orang tua."],
    [""],
    ["3. CARA UPDATE DATA YANG TELAH ADA"],
    ["   - Lakukan 'Export Data' terlebih dahulu untuk mendapatkan seluruh data lengkap dengan kolom 'ID' atau gunakan template yang ada."],
    ["   - Ubah data yang ingin diperbarui (Nama, NIK, Telepon, dll)."],
    ["   - PERINGATAN: Jangan mengubah nilai pada kolom 'ID' karena kolom tersebut digunakan sebagai kunci update."],
    ["   - Klik menu 'Import / Update' > 'Update Excel' untuk mengunggah file yang sudah diubah."]
  ];
  const ws = XLSX.utils.aoa_to_sheet(guideData);
  ws["!cols"] = [{ wch: 110 }];

  const titleCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
  if (ws[titleCell]) {
    ws[titleCell].s = {
      fill: { fgColor: { rgb: "1E3A8A" } },
      font: { name: "Arial", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      alignment: { horizontal: "left", vertical: "center" }
    };
  }

  const sectionRows = [2, 10, 14];
  sectionRows.forEach((r) => {
    const cell = XLSX.utils.encode_cell({ r: r, c: 0 });
    if (ws[cell]) {
      ws[cell].s = {
        font: { name: "Arial", sz: 11, bold: true, color: { rgb: "1E3A8A" } }
      };
    }
  });

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

export function styleHeader(XLSX, ws, headers, mode = "import") {
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

export async function downloadUpdateOrtuExcelTemplate() {
  const XLSX = await loadXLSX();
  const ws = XLSX.utils.aoa_to_sheet([
    UPDATE_ORTU_HEADERS,
    [1, "Budi Santoso", "3201010101800001", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1, Jakarta"],
  ]);
  ws["!cols"] = UPDATE_ORTU_HEADERS.map((h) => ({ wch: h === "Alamat" ? 36 : 26 }));
  styleHeader(XLSX, ws, UPDATE_ORTU_HEADERS, "update");

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Update Orang Tua");
  XLSX.utils.book_append_sheet(wb, getOrangTuaGuideSheet(XLSX), "Panduan Penggunaan");
  XLSX.writeFile(wb, "update_orangtua.xlsx");
}

export async function downloadUpdateOrtuPdfTemplate() {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Update Data Orang Tua", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("ID digunakan sebagai key pencarian (lihat kolom ID di tabel).", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [UPDATE_ORTU_HEADERS],
    body: [["1", "Budi Santoso", "3201010101800001", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1, Jakarta"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save("update_orangtua.pdf");
}

export async function downloadExcelTemplate() {
  const XLSX = await loadXLSX();
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ["Budi Santoso", "3201010101800001", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1, Jakarta"],
  ]);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: h === "Alamat" ? 36 : 24 }));
  styleHeader(XLSX, ws, TEMPLATE_HEADERS, "import");

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Orang Tua");
  XLSX.utils.book_append_sheet(wb, getOrangTuaGuideSheet(XLSX), "Panduan Penggunaan");
  XLSX.writeFile(wb, "template_orangtua.xlsx");
}

export async function downloadPdfTemplate() {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Import Data Orang Tua", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Isi sesuai kolom di bawah.", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [TEMPLATE_HEADERS],
    body: [["Budi Santoso", "3201010101800001", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1, Jakarta"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("template_orangtua.pdf");
}

export async function exportTablePdf(data) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Data Orang Tua", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [EXPORT_HEADERS],
    body: data.map((o) => [
      o.nama_orangtua,
      o.NIK,
      o.nomor_telepon,
      o.pekerjaan,
      o.alamat,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("data_orangtua.pdf");
}

export async function exportTableExcel(data) {
  const XLSX = await loadXLSX();
  const rows = data.map((o) => ({
    "ID": o.id,
    "Nama Orang Tua": o.nama_orangtua,
    "NIK": String(o.NIK || ""),
    "Nomor Telepon": String(o.nomor_telepon || ""),
    "Pekerjaan": o.pekerjaan,
    "Alamat": o.alamat,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws["!cols"] = [
    { wch: 20 },
    { wch: 35 },
    { wch: 25 },
    { wch: 20 },
    { wch: 25 },
    { wch: 50 },
  ];

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const nikCell  = XLSX.utils.encode_cell({ r: R, c: 2 });
    const telpCell = XLSX.utils.encode_cell({ r: R, c: 3 });
    if (ws[nikCell])  { ws[nikCell].v  = String(ws[nikCell].v);  ws[nikCell].t  = "s"; ws[nikCell].z  = "@"; }
    if (ws[telpCell]) { ws[telpCell].v = String(ws[telpCell].v); ws[telpCell].t = "s"; ws[telpCell].z = "@"; }
  }

  const headers = ["ID", "Nama Orang Tua", "NIK", "Nomor Telepon", "Pekerjaan", "Alamat"];
  styleHeader(XLSX, ws, headers, "export");

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Orang Tua");
  XLSX.writeFile(wb, "data_orangtua.xlsx");
}
