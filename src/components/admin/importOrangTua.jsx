import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { orangTua } from "../../lib/backendApi.js";
import InfoStatCard from "../layout/InfoStatCard";

// ─────────────────────────────────────────────────────────────────────────
// OPTIMASI: lazy-load library berat
//
// xlsx, jspdf, dan jspdf-autotable cukup besar (xlsx saja ratusan KB).
// Sebelumnya di-import statis di atas file → selalu ikut terdownload & ter-parse
// begitu halaman ini dibuka, padahal cuma dipakai saat user klik
// Export/Template/Import. Sekarang di-load dinamis baru saat dibutuhkan,
// supaya bundle awal halaman jauh lebih kecil & cepat (terutama di koneksi/device lemah).
// Promise-nya di-cache supaya import() cuma terjadi sekali per sesi.
// ─────────────────────────────────────────────────────────────────────────

let _xlsxPromise = null;
function loadXLSX() {
  if (!_xlsxPromise) _xlsxPromise = import("xlsx-js-style");
  return _xlsxPromise;
}

let _pdfLibsPromise = null;
function loadPdfLibs() {
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

// Constants

const CONCURRENCY = 5;

// Helper: jalankan banyak task async dengan batasan concurrency
async function runWithConcurrency(items, concurrency, worker, onProgress) {
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

// Progress Bar
function ProgressBar({ current, total, color = "blue" }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  const barColor = color === "emerald" ? "bg-emerald-500" : "bg-blue-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Memproses {current} dari {total} baris...</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}


const TEMPLATE_HEADERS = [
  "Nama Orang Tua",
  "NIK",
  "Nomor Telepon",
  "Pekerjaan",
  "Alamat",
];

const EXPORT_HEADERS = [
  "Nama Orang Tua",
  "NIK",
  "Nomor Telepon",
  "Pekerjaan",
  "Alamat",
];

const UPDATE_ORTU_HEADERS = [
  "ID",
  "Nama Orang Tua",
  "NIK",
  "Nomor Telepon",
  "Pekerjaan",
  "Alamat",
];

// getOrangTuaGuideSheet sekarang menerima modul XLSX yang sudah di-load oleh caller,
// supaya tidak perlu load ulang library di tempat lain.
function getOrangTuaGuideSheet(XLSX) {
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
  const sectionRows = [2, 10, 14];
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

// Template Downloaders
// Semua fungsi di bawah sekarang async karena library-nya di-load on-demand.

function styleHeader(XLSX, ws, headers, mode = "import") {
  const bgColor = mode === "update" ? "10B981" : mode === "export" ? "F97316" : "2563EB"; // Emerald, Orange, or Blue
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

async function downloadUpdateOrtuExcelTemplate() {
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

async function downloadUpdateOrtuPdfTemplate() {
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

async function downloadExcelTemplate() {
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

async function downloadPdfTemplate() {
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

async function exportTablePdf(data) {
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

async function exportTableExcel(data) {
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

// Icons

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const UploadIcon    = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const DownloadIcon  = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const FileExcelIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 13l1.5 2.5L9 18h1.5l.75-1.5.75 1.5H13.5l-1.5-2.5L13.5 13H12l-.75 1.5L10.5 13H9z" />;
const FilePdfIcon   = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 17v-5h1.5a1.5 1.5 0 0 1 0 3H9M14 17v-5h2M14 14.5h1.5" />;
const AlertCircle   = () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" />;
const CheckCircle   = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />;
const XCircle       = () => <Icon d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM15 9l-6 6M9 9l6 6" />;
const SearchIcon    = () => <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const XIcon         = () => <Icon d="M18 6L6 18M6 6l12 12" />;
const ChevronDown   = () => <Icon d="M6 9l6 6 6-6" />;

// Modal Import

function ImportModal({ onClose, onImportDone }) {
  const [rows, setRows]           = useState([]);
  const [results, setResults]     = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone]           = useState(false);
  const [progress, setProgress]   = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(250);
  const [resultSearch, setResultSearch] = useState("");
  const [draftSearch, setDraftSearch]   = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const fileRef = useRef();

  // Cegah user nutup/refresh tab di tengah proses import massal
  useEffect(() => {
    if (!importing) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

  // parseFile sekarang async karena XLSX di-load on-demand (lazy)
  const parseFile = async (file) => {
    const XLSX = await loadXLSX();
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb   = XLSX.read(e.target.result, { type: "binary" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
      setProgress({ current: 0, total: 0 });
      setPreviewLimit(250);
      setResultSearch("");
      setDraftSearch("");
      setResultFilter("all");
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  const runImport = async (rowsToProcess) => {
    const prepared = new Array(rows.length);
    const seenNIK  = new Set();
    const toProcess = [];

    // Pre-pass: validasi & deteksi duplikat NIK dalam file
    rowsToProcess.forEach(({ row, idx }) => {
      const nama   = String(row["Nama Orang Tua"] || "").trim();
      const nik    = String(row["NIK"]            || "").trim();
      const telp   = String(row["Nomor Telepon"]  || "").trim();
      const kerja  = String(row["Pekerjaan"]      || "").trim();
      const alamat = String(row["Alamat"]         || "").trim();

      if (!nama || !nik || !telp || !kerja || !alamat) {
        prepared[idx] = { nama: nama || "?", ok: false, msg: "Semua field wajib diisi" };
        return;
      }
      if (seenNIK.has(nik)) {
        prepared[idx] = { nama, ok: false, msg: "NIK duplikat dalam file (skip)" };
        return;
      }
      seenNIK.add(nik);
      toProcess.push({ row, idx, nama, nik, telp, kerja, alamat });
    });

    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: rows.length });
    setResults(prepared.filter(Boolean));

    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ row, idx, nama, nik, telp, kerja, alamat }) => {
        try {
          const result = await orangTua.create({
            nama_orangtua: nama,
            NIK:           nik,
            nomor_telepon: telp,
            pekerjaan:     kerja,
            alamat:        alamat,
          });
          const entry = { nama, ok: result?.success ?? false, msg: result?.message || "" };
          prepared[idx] = entry;
          return entry;
        } catch (err) {
          const entry = { nama, ok: false, msg: err.message };
          prepared[idx] = entry;
          return entry;
        }
      },
      (doneCount) => {
        setProgress({ current: preDone + doneCount, total: rows.length });
        setResults(prepared.filter(Boolean));
      }
    );

    return prepared;
  };

  const startImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    setResultFilter("all");

    const allRows = rows.map((row, idx) => ({ row, idx }));
    await runImport(allRows);

    setImporting(false);
    setDone(true);
    onImportDone();
  };

  const retryFailed = async () => {
    const failedRows = results
      .map((r, i) => ({ r, originalRow: rows[i] }))
      .filter(({ r }) => !r.ok)
      .map(({ originalRow }, i) => ({ row: originalRow, idx: i }));
    if (!failedRows.length) return;
    setImporting(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: failedRows.length });
    setResultFilter("all");
    await runImport(failedRows);
    setImporting(false);
    setDone(true);
    onImportDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount    = results.filter((r) => !r.ok).length;

  const filteredRows = useMemo(() => {
    if (!draftSearch.trim()) return rows;
    const q = draftSearch.toLowerCase().trim();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, draftSearch]);

  const filteredResults = useMemo(() => {
    let list = results;
    if (resultFilter === "berhasil") {
      list = list.filter((r) => r.ok);
    } else if (resultFilter === "gagal") {
      list = list.filter((r) => !r.ok);
    }
    if (!resultSearch.trim()) return list;
    const q = resultSearch.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.nama?.toLowerCase().includes(q) || r.msg?.toLowerCase().includes(q)
    );
  }, [results, resultSearch, resultFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data Orang Tua</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) — kolom: Nama, NIK, Telepon, Pekerjaan, Alamat</p>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-blue-200 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!rows.length && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-blue-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="flex justify-center mb-3 text-blue-400 group-hover:text-blue-600 transition-colors"><UploadIcon /></div>
              <p className="text-sm font-medium text-gray-700">Drop file Excel di sini atau <span className="text-blue-600 underline">pilih file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {rows.length > 0 && !done && !importing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{filteredRows.length} dari {rows.length} baris ditemukan</p>
                <button onClick={() => { setRows([]); setResults([]); setPreviewLimit(250); setResultSearch(""); setDraftSearch(""); }} className="text-xs text-red-500 hover:underline">Ganti file</button>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  value={draftSearch}
                  onChange={(e) => { setDraftSearch(e.target.value); setPreviewLimit(250); }}
                  placeholder="Cari di data draft Excel..."
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{TEMPLATE_HEADERS.map((k) => (<th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {TEMPLATE_HEADERS.map((h) => (<td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(r[h] ?? "")}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRows.length > previewLimit && (
                <div className="text-center py-2 bg-gray-50 border-t border-gray-100 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setPreviewLimit((prev) => prev + 250)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Tampilkan lebih banyak (+250 data) ...
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">Menampilkan {Math.min(previewLimit, filteredRows.length)} dari {filteredRows.length} baris</p>
                </div>
              )}
            </div>
          )}

          {(importing || done) && (
            <div className="space-y-3">
              {importing && <ProgressBar current={progress.current} total={progress.total} color="blue" />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoStatCard label="Berhasil" value={successCount} helper="Data orang tua yang berhasil tersimpan" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Perlu dibetulkan sebelum import ulang" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="flex items-center gap-2">
                {[["all", "Semua"], ["berhasil", "Berhasil"], ["gagal", "Gagal"]].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setResultFilter(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      resultFilter === val
                        ? val === "berhasil" ? "bg-emerald-100 text-emerald-700" : val === "gagal" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari nama atau status hasil log..."
                  className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={r.ok ? "text-green-500" : "text-red-500"}>{r.ok ? <CheckCircle /> : <XCircle />}</span>
                    <span className="font-medium text-gray-800 flex-1">{r.nama}</span>
                    {!r.ok && <span className="text-xs text-red-500 text-right max-w-xs">{r.msg}</span>}
                  </div>
                ))}
                {filteredResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    {importing ? "Menunggu hasil baris pertama..." : "Tidak ada hasil pencarian log yang cocok"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={importing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {done ? "Tutup" : "Batal"}
            </button>
            {done && failCount > 0 && (
              <button
                onClick={retryFailed}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                Retry Gagal ({failCount})
              </button>
            )}
            {!done && (
              <button
                onClick={startImport}
                disabled={!rows.length || importing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {importing ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Mengimport...</>
                ) : "Mulai Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal Update

function UpdateOrtuModal({ onClose, onUpdateDone, ortuList }) {
  const [rows, setRows]         = useState([]);
  const [results, setResults]   = useState([]);
  const [updating, setUpdating] = useState(false);
  const [done, setDone]         = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(250);
  const [resultSearch, setResultSearch] = useState("");
  const [draftSearch, setDraftSearch]   = useState("");
  const [resultFilter, setResultFilter] = useState("all");
  const fileRef = useRef();

  // Cegah user nutup/refresh tab di tengah proses update massal
  useEffect(() => {
    if (!updating) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [updating]);

  // parseFile sekarang async karena XLSX di-load on-demand (lazy)
  const parseFile = async (file) => {
    const XLSX = await loadXLSX();
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb   = XLSX.read(e.target.result, { type: "binary" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
      setProgress({ current: 0, total: 0 });
      setPreviewLimit(250);
      setResultSearch("");
      setDraftSearch("");
      setResultFilter("all");
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  const runUpdate = async (rowsToProcess, totalCount) => {
    const prepared  = new Array(totalCount);
    const toProcess = [];

    // Pre-pass: validasi sinkron sebelum hit API
    rowsToProcess.forEach(({ row, idx }) => {
      const id = parseInt(row["ID"] || "");
      if (!id) {
        prepared[idx] = { nama: row["Nama Orang Tua"] || "?", ok: false, msg: "ID kosong atau tidak valid (harus angka)" };
        return;
      }

      const nama   = String(row["Nama Orang Tua"] || "").trim();
      const nik    = String(row["NIK"]            || "").trim();
      const telp   = String(row["Nomor Telepon"]  || "").trim();
      const kerja  = String(row["Pekerjaan"]      || "").trim();
      const alamat = String(row["Alamat"]         || "").trim();

      if (!nama || !nik || !telp || !kerja || !alamat) {
        prepared[idx] = { nama: nama || String(id), ok: false, msg: "Semua field wajib diisi" };
        return;
      }

      const existing = ortuList?.find((o) => o.id === id);
      if (existing) {
        const hasChanged =
          String(existing.nama_orangtua || "").trim() !== nama ||
          String(existing.NIK || "").trim() !== nik ||
          String(existing.nomor_telepon || "").trim() !== telp ||
          String(existing.pekerjaan || "").trim() !== kerja ||
          String(existing.alamat || "").trim() !== alamat;

        if (!hasChanged) {
          prepared[idx] = { nama, ok: false, msg: "Data sama dengan sebelumnya (tidak ada perubahan)" };
          return;
        }
      }

      toProcess.push({ row, idx, id, nama, nik, telp, kerja, alamat });
    });

    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: totalCount });
    setResults(prepared.filter(Boolean));

    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ idx, id, nama, nik, telp, kerja, alamat }) => {
        try {
          const result = await orangTua.update(id, {
            nama_orangtua: nama,
            NIK:           nik,
            nomor_telepon: telp,
            pekerjaan:     kerja,
            alamat:        alamat,
          });
          const entry = { nama, ok: result?.success ?? false, msg: result?.message || "" };
          prepared[idx] = entry;
          return entry;
        } catch (err) {
          const entry = { nama, ok: false, msg: err.message };
          prepared[idx] = entry;
          return entry;
        }
      },
      (doneCount) => {
        setProgress({ current: preDone + doneCount, total: totalCount });
        setResults(prepared.filter(Boolean));
      }
    );

    return prepared;
  };

  const startUpdate = async () => {
    if (!rows.length) return;
    setUpdating(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: rows.length });
    setResultFilter("all");

    const allRows = rows.map((row, idx) => ({ row, idx }));
    await runUpdate(allRows, rows.length);

    setUpdating(false);
    setDone(true);
    onUpdateDone();
  };

  const retryFailed = async () => {
    const failedRows = results
      .map((r, i) => ({ r, originalRow: rows[i] }))
      .filter(({ r }) => !r.ok)
      .map(({ originalRow }, i) => ({ row: originalRow, idx: i }));
    if (!failedRows.length) return;
    setUpdating(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: failedRows.length });
    setResultFilter("all");
    await runUpdate(failedRows, failedRows.length);
    setUpdating(false);
    setDone(true);
    onUpdateDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount    = results.filter((r) => !r.ok).length;

  const filteredRows = useMemo(() => {
    if (!draftSearch.trim()) return rows;
    const q = draftSearch.toLowerCase().trim();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, draftSearch]);

  const filteredResults = useMemo(() => {
    let list = results;
    if (resultFilter === "berhasil") {
      list = list.filter((r) => r.ok);
    } else if (resultFilter === "gagal") {
      list = list.filter((r) => !r.ok);
    }
    if (!resultSearch.trim()) return list;
    const q = resultSearch.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.nama?.toLowerCase().includes(q) || r.msg?.toLowerCase().includes(q)
    );
  }, [results, resultSearch, resultFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Update Data Orang Tua</h2>
            <p className="text-emerald-200 text-xs mt-0.5">Upload Excel dengan kolom ID (key), Nama, NIK, Telepon, Pekerjaan, Alamat</p>
          </div>
          <button
            onClick={onClose}
            disabled={updating}
            className="text-emerald-200 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircle />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {!rows.length && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-emerald-200 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
            >
              <div className="flex justify-center mb-3 text-emerald-400 group-hover:text-emerald-600 transition-colors"><UploadIcon /></div>
              <p className="text-sm font-medium text-gray-700">Drop file Excel di sini atau <span className="text-emerald-600 underline">pilih file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {rows.length > 0 && !done && !updating && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{filteredRows.length} dari {rows.length} baris ditemukan</p>
                <button onClick={() => { setRows([]); setResults([]); setPreviewLimit(250); setResultSearch(""); setDraftSearch(""); }} className="text-xs text-red-500 hover:underline">Ganti file</button>
              </div>
              <div className="mb-3">
                <input
                  type="text"
                  value={draftSearch}
                  onChange={(e) => { setDraftSearch(e.target.value); setPreviewLimit(250); }}
                  placeholder="Cari di data draft Excel..."
                  className="w-full text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{UPDATE_ORTU_HEADERS.map((k) => (<th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {UPDATE_ORTU_HEADERS.map((h) => (<td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(r[h] ?? "")}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRows.length > previewLimit && (
                <div className="text-center py-2 bg-gray-50 border-t border-gray-100 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setPreviewLimit((prev) => prev + 250)}
                    className="text-xs text-emerald-600 font-semibold hover:underline"
                  >
                    Tampilkan lebih banyak (+250 data) ...
                  </button>
                  <p className="text-[10px] text-gray-400 mt-0.5">Menampilkan {Math.min(previewLimit, filteredRows.length)} dari {filteredRows.length} baris</p>
                </div>
              )}
            </div>
          )}

          {(updating || done) && (
            <div className="space-y-3">
              {updating && <ProgressBar current={progress.current} total={progress.total} color="emerald" />}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoStatCard label="Berhasil" value={successCount} helper="Data berhasil diupdate" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Perlu dicek kembali" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="flex items-center gap-2">
                {[["all", "Semua"], ["berhasil", "Berhasil"], ["gagal", "Gagal"]].map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setResultFilter(val)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      resultFilter === val
                        ? val === "berhasil" ? "bg-emerald-100 text-emerald-700" : val === "gagal" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari nama atau status hasil log..."
                  className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={r.ok ? "text-green-500" : "text-red-500"}>{r.ok ? <CheckCircle /> : <XCircle />}</span>
                    <span className="font-medium text-gray-800 flex-1">{r.nama}</span>
                    {!r.ok && <span className="text-xs text-red-500 text-right max-w-xs">{r.msg}</span>}
                  </div>
                ))}
                {filteredResults.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-400">
                    {updating ? "Menunggu hasil baris pertama..." : "Tidak ada hasil pencarian log yang cocok"}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={updating}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {done ? "Tutup" : "Batal"}
            </button>
            {done && failCount > 0 && (
              <button
                onClick={retryFailed}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                Retry Gagal ({failCount})
              </button>
            )}
            {!done && (
              <button
                onClick={startUpdate}
                disabled={!rows.length || updating}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {updating ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Mengupdate...</>
                ) : "Mulai Update"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal Add Single Orang Tua

function AddOrtuModal({ onClose, onAdded }) {
  const [formData, setFormData] = useState({
    nama_orangtua: "",
    NIK: "",
    nomor_telepon: "",
    pekerjaan: "",
    alamat: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.nama_orangtua.trim() || !formData.NIK.trim() || !formData.nomor_telepon.trim() || !formData.pekerjaan.trim() || !formData.alamat.trim()) {
      setError("Semua field (Nama, NIK, Nomor Telepon, Pekerjaan, Alamat) wajib diisi.");
      return;
    }
    if (!/^[0-9]{16}$/.test(formData.NIK.trim())) {
      setError("NIK harus 16 digit angka.");
      return;
    }
    if (!/^08[0-9]{8,11}$/.test(formData.nomor_telepon.trim())) {
      setError("Nomor telepon tidak valid (gunakan format 08xx).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama_orangtua: formData.nama_orangtua.trim(),
        NIK:           formData.NIK.trim(),
        nomor_telepon: formData.nomor_telepon.trim(),
        pekerjaan:     formData.pekerjaan.trim(),
        alamat:        formData.alamat.trim(),
      };
      const res = await orangTua.create(payload);
      if (res?.success) {
        onAdded(res.data?.nama_orangtua ?? formData.nama_orangtua);
      } else {
        setError(res?.message || "Gagal menambahkan data orang tua.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Tambah Orang Tua Baru</h2>
            <p className="text-blue-200 text-xs mt-0.5">Isi data orang tua secara manual</p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-blue-200 hover:text-white transition-colors cursor-pointer">
            <XCircle />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              <AlertCircle /> {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Nama */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nama Orang Tua *</label>
              <input type="text" name="nama_orangtua" value={formData.nama_orangtua} onChange={handleChange} required
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* NIK */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NIK (16 Digit) *</label>
                <input type="text" name="NIK" value={formData.NIK} onChange={handleChange} required maxLength={16}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              {/* No Telp */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Telepon (08xx) *</label>
                <input type="text" name="nomor_telepon" value={formData.nomor_telepon} onChange={handleChange} required
                  placeholder="08xxxxxxxxxx"
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
            </div>

            {/* Pekerjaan */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pekerjaan *</label>
              <input type="text" name="pekerjaan" value={formData.pekerjaan} onChange={handleChange} required
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Alamat */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alamat *</label>
              <textarea name="alamat" value={formData.alamat} onChange={handleChange} required rows={3}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer">
              {saving ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Menyimpan...</>
              ) : "Simpan Orang Tua"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Edit Single Orang Tua

function EditOrtuModal({ ortu, onClose, onUpdated }) {
  const [formData, setFormData] = useState({
    nama_orangtua: ortu.nama_orangtua || "",
    NIK: ortu.NIK || "",
    nomor_telepon: ortu.nomor_telepon || "",
    pekerjaan: ortu.pekerjaan || "",
    alamat: ortu.alamat || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (!formData.nama_orangtua || !formData.NIK || !formData.nomor_telepon || !formData.pekerjaan || !formData.alamat) {
        setError("Semua field (Nama, NIK, Nomor Telepon, Pekerjaan, Alamat) wajib diisi.");
        setSaving(false);
        return;
      }

      const payload = {
        nama_orangtua: String(formData.nama_orangtua).trim(),
        NIK: String(formData.NIK).trim(),
        nomor_telepon: String(formData.nomor_telepon).trim(),
        pekerjaan: String(formData.pekerjaan).trim(),
        alamat: String(formData.alamat).trim()
      };

      const res = await orangTua.update(ortu.id, payload);
      if (res?.success) {
        onUpdated();
      } else {
        setError(res?.message || "Gagal mengupdate data orang tua");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan pada server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Edit Data Orang Tua</h2>
            <p className="text-blue-200 text-xs mt-0.5">Ubah rincian data orang tua di bawah</p>
          </div>
          <button onClick={onClose} disabled={saving} className="text-blue-200 hover:text-white transition-colors cursor-pointer">
            <XCircle />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              <AlertCircle /> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nama Orang Tua *</label>
              <input
                type="text"
                name="nama_orangtua"
                value={formData.nama_orangtua}
                onChange={handleChange}
                required
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">NIK (16 Digit) *</label>
                <input
                  type="text"
                  name="NIK"
                  value={formData.NIK}
                  onChange={handleChange}
                  required
                  maxLength={16}
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nomor Telepon (08xx) *</label>
                <input
                  type="text"
                  name="nomor_telepon"
                  value={formData.nomor_telepon}
                  onChange={handleChange}
                  required
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pekerjaan *</label>
              <input
                type="text"
                name="pekerjaan"
                value={formData.pekerjaan}
                onChange={handleChange}
                required
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alamat *</label>
              <textarea
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                required
                rows={3}
                className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Delete Konfirmasi Orang Tua

function DeleteConfirmOrtuModal({ ortu, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const result = await orangTua.delete(ortu.id);
      if (result?.success) {
        onDeleted();
      } else {
        setError(result?.message || "Gagal menghapus data orang tua");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Hapus Data Orang Tua</h2>
            <p className="text-red-200 text-xs mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white transition-colors"><XCircle /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-red-500 mt-0.5 shrink-0"><AlertCircle /></span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Yakin ingin menghapus orang tua ini?</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{ortu.nama_orangtua}</span>
                {ortu.NIK && <span className="text-gray-400"> · NIK: {ortu.NIK}</span>}
              </p>
              <p className="text-xs text-orange-500 mt-1 font-medium">Tidak bisa dihapus jika masih ada siswa yang terkait.</p>
              <p className="text-xs text-gray-400 mt-0.5">Data akan dinonaktifkan (soft delete).</p>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              {deleting ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Menghapus...</>
              ) : (<>Hapus Orang Tua</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// OPTIMASI: cache in-memory antar mount component dalam sesi browser yang sama
// (bukan localStorage/sessionStorage — supaya tetap fresh tiap reload browser).
// Kalau user pindah halaman lalu balik lagi ke halaman ini, data lama langsung
// ditampilkan dulu (instan) sambil di-refresh diam-diam di background (SWR-style).
// Pertama kali buka tetap menunggu network seperti biasa.
// ─────────────────────────────────────────────────────────────────────────
let ortuCache = null;

// Main Component

export default function AdminImport() {
  const [pageData, setPageData]               = useState([]);
  const [allData, setAllData]                 = useState(() => ortuCache || []);
  const [loading, setLoading]                 = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(!ortuCache);
  const [error, setError]                     = useState("");
  const [page, setPage]                       = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [totalRecords, setTotalRecords]       = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu]     = useState(false);
  const [showImportMenu, setShowImportMenu]     = useState(false);
  const [searchQuery, setSearchQuery]         = useState("");
  // OPTIMASI: debounce — filter baru jalan 200ms setelah user berhenti mengetik,
  // jadi tidak nge-filter ratusan/ribuan baris di setiap keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteTarget, setDeleteTarget]       = useState(null);
  const [editTarget, setEditTarget]           = useState(null);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [toast, setToast]                     = useState(null);
  const itemsPerPage = 10;

  const templateRef  = useRef();
  const exportRef    = useRef();
  const importMenuRef = useRef();

  const [templateCoords, setTemplateCoords] = useState({ top: 0, left: 0 });
  const [exportCoords, setExportCoords] = useState({ top: 0, left: 0 });
  const [importCoords, setImportCoords] = useState({ top: 0, left: 0 });

  const updateMenuCoords = () => {
    if (showTemplateMenu && templateRef.current) {
      const rect = templateRef.current.getBoundingClientRect();
      setTemplateCoords({
        top: rect.bottom + 4,
        left: rect.right - 208, // w-52 is 208px
      });
    }
    if (showExportMenu && exportRef.current) {
      const rect = exportRef.current.getBoundingClientRect();
      setExportCoords({
        top: rect.bottom + 4,
        left: rect.right - 192, // w-48 is 192px
      });
    }
    if (showImportMenu && importMenuRef.current) {
      const rect = importMenuRef.current.getBoundingClientRect();
      setImportCoords({
        top: rect.bottom + 4,
        left: rect.right - 192, // w-48 is 192px
      });
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    updateMenuCoords();
    const handleReposition = () => updateMenuCoords();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [showTemplateMenu, showExportMenu, showImportMenu]);

  // Fetch

  const fetchPageData = async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const queryParams = new URLSearchParams({
        page: targetPage.toString(),
        limit: itemsPerPage.toString()
      });
      const res = await orangTua.list(queryParams.toString());
      if (res.success) {
        setPageData(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.total || 0);
        }
      } else {
        setError(res.message || "Gagal memuat data orang tua");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDataBackground = async () => {
    setBackgroundLoading(true);
    try {
      const res = await orangTua.list("limit=9999");
      if (res.success) {
        ortuCache = res.data;
        setAllData(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat data background:", err);
    } finally {
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchPageData(page);
  }, [page]);

  useEffect(() => {
    fetchAllDataBackground();
  }, []);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset ke halaman 1 setiap kali hasil pencarian (yang sudah di-debounce) berubah
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  // OPTIMASI: pre-index field pencarian sekali per perubahan allData,
  // bukan di-lowercase ulang untuk tiap item di setiap keystroke.
  const searchableData = useMemo(() => {
    return allData.map((item) => ({
      ...item,
      __search: [item.nama_orangtua, item.NIK, item.nomor_telepon, item.pekerjaan, item.alamat]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    }));
  }, [allData]);

  // Filter & Pagination (client-side ketika search aktif, server-side jika tidak)

  const filteredData = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return searchableData;
    return searchableData.filter((item) => item.__search.includes(q));
  }, [searchableData, debouncedSearch]);

  const totalPagesCount = useMemo(() => {
    if (debouncedSearch.trim()) {
      const t = Math.ceil(filteredData.length / itemsPerPage);
      return t === 0 ? 1 : t;
    }
    return totalPages;
  }, [filteredData, debouncedSearch, totalPages]);

  useEffect(() => {
    if (page > totalPagesCount) setPage(1);
  }, [totalPagesCount, page]);

  const currentPageData = useMemo(() => {
    if (debouncedSearch.trim()) {
      const start = (page - 1) * itemsPerPage;
      return filteredData.slice(start, start + itemsPerPage);
    }
    return pageData;
  }, [filteredData, page, pageData, debouncedSearch]);

  // Handlers

  const handleSearch = (value) => setSearchQuery(value);
  const clearSearch  = () => setSearchQuery("");
  const refreshData  = () => {
    fetchPageData(page);
    fetchAllDataBackground();
  };

  // Outside click

  useEffect(() => {
    const handler = (e) => {
      // If click is inside the dropdown portal, don't close the menu
      if (e.target.closest('.dropdown-portal')) return;
      if (templateRef.current   && !templateRef.current.contains(e.target))   setShowTemplateMenu(false);
      if (exportRef.current     && !exportRef.current.contains(e.target))     setShowExportMenu(false);
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const TABLE_COLS = ["ID", "Nama Orang Tua", "NIK", "Nomor Telepon", "Pekerjaan", "Alamat", "Aksi"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Data Orang Tua" subtitle="Kelola data orang tua & import massal" />

      <div className="flex-1 overflow-auto p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle /> {error}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Toolbar */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              {/* Count */}
              <div className="flex-1">
                <p className="text-sm text-gray-500">
                  {loading && !searchQuery.trim() ? <span>Memuat…</span> : (
                    searchQuery.trim() ? (
                      backgroundLoading ? (
                        <span>Memuat data pencarian…</span>
                      ) : (
                        <><span className="font-semibold text-gray-700">{filteredData.length}</span> dari <span className="font-semibold text-gray-700">{allData.length}</span> orang tua ditemukan</>
                      )
                    ) : (
                      <><span className="font-semibold text-gray-700">{pageData.length}</span> dari <span className="font-semibold text-gray-700">{totalRecords}</span> orang tua terdaftar</>
                    )
                  )}
                </p>
              </div>

              {/* Search */}
              <div className="relative mx-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Cari nama, NIK, atau telepon..."
                  className="pl-10 pr-10 py-2 w-80 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    <XIcon />
                  </button>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">

                {/* ── Template dropdown (Import Baru + Update Data) ── */}
                <div className="relative" ref={templateRef}>
                  <button
                    onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowExportMenu(false); setShowImportMenu(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <DownloadIcon /> Template <ChevronDown />
                  </button>
                  {showTemplateMenu && createPortal(
                    <div
                      style={{ position: "fixed", top: templateCoords.top, left: templateCoords.left, width: "13rem" }}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[999] dropdown-portal"
                    >
                      <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Import Baru</p>
                      <button onClick={() => { downloadExcelTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                        <span className="text-green-600"><FileExcelIcon /></span> Template Excel (.xlsx)
                      </button>
                      <button onClick={() => { downloadPdfTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                        <span className="text-red-500"><FilePdfIcon /></span> Template PDF
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <p className="px-4 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Update Data</p>
                      <button onClick={() => { downloadUpdateOrtuExcelTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                        <span className="text-green-600"><FileExcelIcon /></span> Template Update (.xlsx)
                      </button>
                      <button onClick={() => { downloadUpdateOrtuPdfTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 pb-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                        <span className="text-red-500"><FilePdfIcon /></span> Template Update (PDF)
                      </button>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Export dropdown */}
                <div className="relative" ref={exportRef}>
                  <button
                    onClick={() => { setShowExportMenu(!showExportMenu); setShowTemplateMenu(false); setShowImportMenu(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <DownloadIcon /> Export Data <ChevronDown />
                  </button>
                  {showExportMenu && createPortal(
                    <div
                      style={{ position: "fixed", top: exportCoords.top, left: exportCoords.left, width: "12rem" }}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[999] dropdown-portal"
                    >
                      <button onClick={() => { exportTableExcel(filteredData); setShowExportMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                        <span className="text-green-600"><FileExcelIcon /></span> Export Excel (.xlsx)
                      </button>
                      <button onClick={() => { exportTablePdf(filteredData); setShowExportMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                        <span className="text-red-500"><FilePdfIcon /></span> Export PDF
                      </button>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Tambah Orang Tua dropdown */}
                <div className="relative" ref={importMenuRef}>
                  <button
                    onClick={() => { setShowImportMenu(!showImportMenu); setShowTemplateMenu(false); setShowExportMenu(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm cursor-pointer"
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Tambah Orang Tua <ChevronDown />
                  </button>
                  {showImportMenu && createPortal(
                    <div
                      style={{ position: "fixed", top: importCoords.top, left: importCoords.left, width: "12rem" }}
                      className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-[999] dropdown-portal"
                    >
                      <button
                        onClick={() => { setShowAddModal(true); setShowImportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition text-left cursor-pointer font-medium"
                      >
                        <span className="text-blue-600">
                          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </span> Tambah Mandiri
                      </button>
                      <button
                        onClick={() => { setShowImportModal(true); setShowImportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition text-left cursor-pointer font-medium"
                      >
                        <span className="text-blue-600"><UploadIcon /></span> Import Excel
                      </button>
                      <button
                        onClick={() => { setShowUpdateModal(true); setShowImportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition text-left cursor-pointer font-medium"
                      >
                        <span className="text-emerald-600"><UploadIcon /></span> Update Excel
                      </button>
                    </div>,
                    document.body
                  )}
                </div>

              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/80">
                  <tr>
                    {TABLE_COLS.map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>
                        <td colSpan={TABLE_COLS.length} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : currentPageData.length > 0 ? (
                    currentPageData.map((o, i) => (
                      <tr key={o.id ?? i} className="hover:bg-blue-50/30 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.nama_orangtua}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{o.NIK}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{o.nomor_telepon}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{o.pekerjaan}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{o.alamat}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditTarget(o)}
                              title="Edit orang tua"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors duration-150 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteTarget(o)}
                              title="Hapus orang tua"
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors duration-150 cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={TABLE_COLS.length} className="px-6 py-12 text-center">
                        <p className="text-gray-500 text-sm">
                          {searchQuery ? "Tidak ada data yang sesuai dengan pencarian." : "Tidak ada data orang tua."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPagesCount}
              onPageChange={setPage}
              summary={`Halaman ${page} dari ${totalPagesCount} (Menampilkan ${currentPageData.length} dari ${searchQuery.trim() ? filteredData.length : totalRecords} data)`}
            />
          </div>
        </div>

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImportDone={refreshData} />
      )}
      {showUpdateModal && (
        <UpdateOrtuModal onClose={() => setShowUpdateModal(false)} onUpdateDone={refreshData} ortuList={allData} />
      )}
      {showAddModal && (
        <AddOrtuModal
          onClose={() => setShowAddModal(false)}
          onAdded={(nama) => {
            setShowAddModal(false);
            refreshData();
            setToast({ type: "success", message: `Orang tua "${nama}" berhasil ditambahkan` });
          }}
        />
      )}
      {editTarget && (
        <EditOrtuModal
          ortu={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={() => {
            setEditTarget(null);
            refreshData();
            setToast({ type: "success", message: `Data orang tua "${editTarget.nama_orangtua}" berhasil diperbarui` });
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmOrtuModal
          ortu={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            refreshData();
            setToast({ type: "success", message: `Orang tua "${deleteTarget.nama_orangtua}" berhasil dihapus` });
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[999] flex items-center gap-3 bg-white border border-gray-100 shadow-2xl rounded-xl p-4 animate-in fade-in slide-in-from-bottom-5 duration-300 min-w-80">
          <div className={`p-2 rounded-lg ${toast.type === "success" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"}`}>
            {toast.type === "success" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-gray-900">{toast.type === "success" ? "Berhasil" : "Gagal"}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}