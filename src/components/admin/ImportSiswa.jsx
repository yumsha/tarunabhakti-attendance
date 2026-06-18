import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import { useState, useEffect, useRef, useMemo } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { siswa, kelas, orangTua } from "../../lib/backendApi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InfoStatCard from "../layout/InfoStatCard";

// Constants

const TEMPLATE_HEADERS = [
  "NISN",
  "NIPD",
  "Nama",
  "Alamat",
  "Gender",
  "Tanggal Lahir (YYYY-MM-DD)",
  "Nomor Telepon",
  "Nama Kelas",
  "Jurusan",
  "ID Orang Tua",
  "NIK Orang Tua",
  "Nama Orang Tua",
  "No Telp Orang Tua",
  "Pekerjaan Orang Tua",
  "Alamat Orang Tua",
];

const UPDATE_HEADERS = [
  "NISN",
  "NIPD",
  "Nama",
  "Alamat",
  "Gender",
  "Tanggal Lahir (YYYY-MM-DD)",
  "Nomor Telepon",
  "Nama Kelas",
  "Jurusan",
  "ID Orang Tua",
];

// Jumlah request paralel saat proses import/update massal.
// Angka 5 dipilih sebagai titik aman: cukup cepat tapi tidak membebani backend.
const CONCURRENCY = 5;

// Helper: jalankan banyak task async dengan batasan concurrency,
// sambil melaporkan progres tiap kali satu task selesai.
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

// Template Downloaders 

function getSiswaGuideSheet() {
  const guideData = [
    ["PANDUAN PENGGUNAAN - IMPORT & UPDATE DATA SISWA"],
    [""],
    ["1. ATURAN ANGKA NOL DI DEPAN (SANGAT PENTING!)"],
    ["   Untuk data yang diawali angka 0 seperti NISN, NIPD, Nomor Telepon, Tanggal Lahir (YYYY-MM-DD), atau NIK,"],
    ["   WAJIB tambahkan tanda petik tunggal (') di awal data di Excel agar terbaca sebagai Teks oleh Excel."],
    ["   Contoh: '08123456789 atau '3050626105 atau '2005-06-01"],
    ["   Jika tidak ditambahkan, Excel akan otomatis menghapus angka 0 di depan dan merusak format data Anda."],
    [""],
    ["2. PANDUAN DATA KELAS & GENDER SISWA"],
    ["   - Gunakan kolom 'Nama Kelas' dan 'Jurusan."],
    ["   - Pastikan nilainya sama persis dengan yang ada di sistem (Contoh: XII dan Rekayasa Perangkat Lunak)."],
    ["   - WAJIB: Kolom Gender harus menggunakan huruf KAPITAL (L untuk Laki-laki, P untuk Perempuan). Contoh: L atau P."],
    [""],
    ["3. CARA TAMBAH DATA SISWA & RELASI ORANG TUA."],
    ["   - Gunakan template Excel yang tersedia"],
    ["   - Jika orang tua sudah terdaftar: Cukup isi kolom 'ID Orang Tua', kosongkan kolom detail orang tua."],
    ["   - Jika orang tua belum terdaftar: Kosongkan 'ID Orang Tua', dan isi lengkap NIK Orang Tua s/d Alamat Orang Tua."],
    [""],
    ["4. CARA UPDATE DATA SISWA (TUNGGAL)"],
    ["   - Gunakan template excel yang tersedia"],
    ["   - Ubah data siswa di Excel (misal memindahkan kelas siswa dengan mengubah 'Nama Kelas' dan 'Jurusan')."],
    ["   - PERINGATAN: Kolom NISN bertindak sebagai kunci utama. Jangan pernah mengubah nilai NISN pada data yang ingin diupdate!"],
    [""],
    ["5. CARA UPDATE DATA SISWA (MASSAL)"],
    ["   - Ekspor data terlebih dahulu untuk mendapatkan semua data siswa saat ini yang berisi kolom NISN."],
    ["   - Ubah data siswa di Excel (misal memindahkan kelas siswa dengan mengubah 'Nama Kelas' dan 'Jurusan')."],
    ["   - PERINGATAN: Kolom NISN bertindak sebagai kunci utama. Jangan pernah mengubah nilai NISN pada data yang ingin diupdate!"]
  ];
  const ws = XLSX.utils.aoa_to_sheet(guideData);
  ws["!cols"] = [{ wch: 125 }];
  return ws;
}

// Template example rows

// Contoh 1: punya ID orang tua di DB = cukup isi ID, kolom detail kosong
const EXAMPLE_ROW_WITH_ID = [
  "3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor",
  "L", "2005-12-06", "08875094072", "XII", "Rekayasa Perangkat Lunak",
  "1",           // ID Orang Tua (ada di DB)
  "", "", "", "", "", // detail ortu dikosongkan
];

// Contoh 2: orang tua belum ada di DB = ID kosong, isi kolom detail
const EXAMPLE_ROW_NEW_PARENT = [
  "3050626106", "2025002", "Dewi Rahayu", "Jl. Melati No. 12 Bogor",
  "P", "2006-03-15", "08761234567", "XI", "Teknik Komputer Jaringan",
  "",            // ID Orang Tua dikosongkan
  "3201234567890001", "Budi Santoso", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1 Bogor",
];

// Template Downloaders 

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    EXAMPLE_ROW_WITH_ID,
    EXAMPLE_ROW_NEW_PARENT,
  ]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 26 }));

  // Tambah komentar di header "ID Orang Tua" biar user paham
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.utils.book_append_sheet(wb, getSiswaGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "template_siswa.xlsx");
}

function downloadPdfTemplate() {
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
      9: { fillColor: [239, 246, 255] }, // ID Orang Tua
      10: { fillColor: [240, 253, 244] }, // NIK
      11: { fillColor: [240, 253, 244] },
      12: { fillColor: [240, 253, 244] },
      13: { fillColor: [240, 253, 244] },
      14: { fillColor: [240, 253, 244] },
    },
  });
  doc.save("template_siswa.pdf");
}

function downloadUpdateExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    UPDATE_HEADERS,
    ["3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor", "L", "2005-12-06", "08875094072", "XII", "Rekayasa Perangkat Lunak", 1],
  ]);
  ws["!cols"] = UPDATE_HEADERS.map(() => ({ wch: 26 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Update Siswa");
  XLSX.utils.book_append_sheet(wb, getSiswaGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "update_siswa.xlsx");
}

function downloadUpdatePdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Update Data Siswa", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NISN digunakan sebagai key pencarian. Nama Kelas & Jurusan diisi sesuai kelas di sistem.", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [UPDATE_HEADERS],
    body: [["3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor", "L", "2005-12-06", "08875094072", "XII", "Rekayasa Perangkat Lunak", "1"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save("update_siswa.pdf");
}

function exportTablePdf(students) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Data Siswa", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["NISN", "NIPD", "Nama", "Alamat", "Gender", "Tanggal Lahir", "Nomor Telepon", "Nama Kelas", "Jurusan"]],
    body: students.map((s) => [
      s.NISN, s.NIPD, s.nama, s.alamat, s.gender,
      s.tanggal_lahir?.slice(0, 10), s.nomor_telepon,
      s.kelas?.kelas || "-", s.kelas?.jurusan || "-",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("data_siswa.pdf");
}

function exportTableExcel(students) {
  const rows = students.map((s) => ({
    "NISN":String(s.NISN || ""),
    "NIPD": String(s.NIPD || ""),
    "Nama": s.nama || "",
    "Alamat": s.alamat || "",
    "Gender": s.gender || "",
    "Tanggal Lahir (YYYY-MM-DD)": (s.tanggal_lahir ? s.tanggal_lahir.slice(0, 10) : ""),
    "Nomor Telepon": String(s.nomor_telepon || ""),
    "Nama Kelas": s.kelas?.kelas || "",
    "Jurusan": s.kelas?.jurusan || "",
    "ID Orang Tua": s.orang_tua?.id || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const nisnCell = XLSX.utils.encode_cell({ r: R, c: 0 });
    const nipdCell = XLSX.utils.encode_cell({ r: R, c: 1 });
    const telpCell = XLSX.utils.encode_cell({ r: R, c: 6 });
    if (ws[nisnCell]) { ws[nisnCell].v = String(ws[nisnCell].v).trim(); ws[nisnCell].t = "s"; ws[nisnCell].z = "@"; }
    if (ws[nipdCell]) { ws[nipdCell].v = String(ws[nipdCell].v).trim(); ws[nipdCell].t = "s"; ws[nipdCell].z = "@"; }
    if (ws[telpCell]) { ws[telpCell].v = String(ws[telpCell].v).trim(); ws[telpCell].t = "s"; ws[telpCell].z = "@"; }
  }

  ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.utils.book_append_sheet(wb, getSiswaGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "data_siswa.xlsx");
}

// Icons

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const UploadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const FileExcelIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 13l1.5 2.5L9 18h1.5l.75-1.5.75 1.5H13.5l-1.5-2.5L13.5 13H12l-.75 1.5L10.5 13H9z" />;
const FilePdfIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 17v-5h1.5a1.5 1.5 0 0 1 0 3H9M14 17v-5h2M14 14.5h1.5" />;
const AlertCircle = () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" />;
const CheckCircle = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />;
const XCircle = () => <Icon d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM15 9l-6 6M9 9l6 6" />;
const SearchIcon = () => <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const XIcon = () => <Icon d="M18 6L6 18M6 6l12 12" />;
const ChevronDown = () => <Icon d="M6 9l6 6 6-6" />;

// Progress bar kecil dipakai saat proses import/update massal berjalan
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

// Import Modal

function ImportModal({ onClose, onImportDone }) {
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(250);
  const [resultSearch, setResultSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const fileRef = useRef();

  // Cegah user nutup/refresh tab di tengah proses import massal
  useEffect(() => {
    if (!importing) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
      setProgress({ current: 0, total: 0 });
      setPreviewLimit(250);
      setResultSearch("");
      setDraftSearch("");
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  // runImport menangani satu "batch" baris (bisa seluruh file, bisa cuma baris yang gagal saat retry).
  // totalCount dipakai untuk progress bar (beda dengan rowsToProcess.length kalau ada yang ke-skip di pre-pass).
  const runImport = async (rowsToProcess, totalCount) => {
    // Fetch semua orang tua sekali di awal untuk lookup cepat (difetch ulang juga saat retry,
    // supaya data orang tua yang baru dibuat di percobaan sebelumnya ikut terbaca)
    let orangtuaMap = {}; // id (string) → object orang tua
    try {
      const ortuRes = await orangTua.list("limit=9999");
      if (ortuRes?.success && Array.isArray(ortuRes.data)) {
        ortuRes.data.forEach((o) => {
          orangtuaMap[String(o.id)] = o;
        });
      }
    } catch (_) { }

    // prepared menyimpan hasil per baris sesuai urutan asli (sparse array)
    const prepared = new Array(totalCount);

    // ── Pre-pass: validasi sinkron & deteksi duplikat NISN/NIPD dalam batch ini ──
    const seenNISN = new Set();
    const seenNIPD = new Set();
    const toProcess = [];

    rowsToProcess.forEach(({ row, idx }) => {
      const nama = row["Nama"] || "?";
      const NISN = String(row["NISN"] || "").trim();
      const NIPD = String(row["NIPD"] || "").trim();

      if (!NISN || !NIPD || !row["Nama"]) {
        prepared[idx] = { nama, ok: false, msg: "Field wajib siswa kosong (NISN / NIPD / Nama)" };
        return;
      }
      if (seenNISN.has(NISN)) {
        prepared[idx] = { nama, ok: false, msg: `NISN ${NISN} duplikat dalam file (skip)` };
        return;
      }
      if (seenNIPD.has(NIPD)) {
        prepared[idx] = { nama, ok: false, msg: `NIPD ${NIPD} duplikat dalam file (skip)` };
        return;
      }
      seenNISN.add(NISN);
      seenNIPD.add(NIPD);
      toProcess.push({ row, idx });
    });

    // Tampilkan hasil pre-pass duluan (progress sudah terisi sebagian)
    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: totalCount });
    setResults(prepared.filter(Boolean));

    // ── Proses ke backend dengan concurrency terbatas ──
    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ row, idx }) => {
        const nama = row["Nama"] || "?";

        try {
          // Resolusi Orang Tua
          //
          // Behavior:
          //   1. ID Orang Tua diisi & ada di DB        = kirim orangtua_id (integer)
          //   2. ID Orang Tua diisi & TIDAK ada di DB  = langsung gagal
          //   3. ID kosong, detail diisi lengkap       = kirim orangtua object (buat baru)
          //   4. Semua kosong                          = siswa tanpa orang tua

          const idOrtu = String(row["ID Orang Tua"] || "").trim();
          const nikOrtu = String(row["NIK Orang Tua"] || "").trim();
          const namaOrtu = String(row["Nama Orang Tua"] || "").trim();
          const telpOrtu = String(row["No Telp Orang Tua"] || "").trim();
          const pekerjaanOrtu = String(row["Pekerjaan Orang Tua"] || "").trim();
          const alamatOrtu = String(row["Alamat Orang Tua"] || "").trim();

          const hasDetail = nikOrtu && namaOrtu && telpOrtu && pekerjaanOrtu && alamatOrtu;

          let orangtuaPayload = undefined;

          if (idOrtu) {
            const matched = orangtuaMap[idOrtu];
            if (matched) {
              orangtuaPayload = {
                NIK: matched.NIK,
                nama_orangtua: matched.nama_orangtua,
                nomor_telepon: matched.nomor_telepon,
                pekerjaan: matched.pekerjaan,
                alamat: matched.alamat,
              };
            } else {
              // kalo ID tidak ditemukan di DB maka langsung gagal (no fallback)
              const entry = { nama, ok: false, msg: `ID Orang Tua "${idOrtu}" tidak ditemukan di database` };
              prepared[idx] = entry;
              return entry;
            }
          } else if (hasDetail) {
            // ID kosong tapi detail lengkap maka buat orang tua baru
            orangtuaPayload = {
              NIK: nikOrtu,
              nama_orangtua: namaOrtu,
              nomor_telepon: telpOrtu,
              pekerjaan: pekerjaanOrtu,
              alamat: alamatOrtu,
            };
          }
          // else: semua kosong maka import siswa tanpa orang tua

          // Buat siswa
          const payload = {
            NISN: String(row["NISN"] || ""),
            NIPD: String(row["NIPD"] || ""),
            nama,
            alamat: row["Alamat"] || "",
            gender: row["Gender"] || "",
            tanggal_lahir: row["Tanggal Lahir (YYYY-MM-DD)"] || "",
            nomor_telepon: String(row["Nomor Telepon"] || ""),
            nama_kelas: row["Nama Kelas"] || "",
            jurusan: row["Jurusan"] || "",
            ...(orangtuaPayload ? { orangtua: orangtuaPayload } : {}),
          };

          const result = await siswa.create(payload);
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

  const startImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setDone(false);
    setResults([]);
    setProgress({ current: 0, total: rows.length });

    const allRows = rows.map((row, idx) => ({ row, idx }));
    await runImport(allRows, rows.length);

    setImporting(false);
    setDone(true);
    onImportDone();
  };

  // retryFailed hanya mengirim ulang baris-baris yang sebelumnya gagal,
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
    await runImport(failedRows, failedRows.length);
    setImporting(false);
    setDone(true);
    onImportDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  const filteredRows = useMemo(() => {
    if (!draftSearch.trim()) return rows;
    const q = draftSearch.toLowerCase().trim();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, draftSearch]);

  const filteredResults = useMemo(() => {
    if (!resultSearch.trim()) return results;
    const q = resultSearch.toLowerCase().trim();
    return results.filter(
      (r) =>
        r.nama?.toLowerCase().includes(q) || r.msg?.toLowerCase().includes(q)
    );
  }, [results, resultSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data Siswa</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) untuk import massal</p>
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
                    <tr>
                      {Object.keys(rows[0]).map((k) => (
                        <th key={k} className={`px-3 py-2 text-left font-semibold whitespace-nowrap
                          ${["ID Orang Tua", "NIK Orang Tua", "Nama Orang Tua", "No Telp Orang Tua", "Pekerjaan Orang Tua", "Alamat Orang Tua"].includes(k)
                            ? "text-blue-600 bg-blue-50"
                            : "text-gray-600"}`}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {Object.entries(r).map(([k, v], j) => (
                          <td key={j} className={`px-3 py-2 whitespace-nowrap
                            ${["ID Orang Tua", "NIK Orang Tua", "Nama Orang Tua", "No Telp Orang Tua", "Pekerjaan Orang Tua", "Alamat Orang Tua"].includes(k)
                              ? "text-blue-700 bg-blue-50/40"
                              : "text-gray-700"}`}>
                            {String(v)}
                          </td>
                        ))}
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
                <InfoStatCard label="Berhasil" value={successCount} helper="Baris yang lolos proses import" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Baris yang perlu dicek lagi" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari nama atau status hasil log..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
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

// Update Modal

function UpdateModal({ onClose, onUpdateDone, kelasList }) {
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [previewLimit, setPreviewLimit] = useState(250);
  const [resultSearch, setResultSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const fileRef = useRef();

  // Cegah user nutup/refresh tab di tengah proses update massal
  useEffect(() => {
    if (!updating) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [updating]);

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
      setProgress({ current: 0, total: 0 });
      setPreviewLimit(250);
      setResultSearch("");
      setDraftSearch("");
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  // runUpdate menangani satu "batch" baris (bisa seluruh file, bisa cuma baris yang gagal saat retry).
  const runUpdate = async (rowsToProcess, totalCount) => {
    let siswaMap = {};
    try {
      const r = await siswa.list("limit=9999");
      if (r?.success && Array.isArray(r.data)) {
        r.data.forEach((s) => { siswaMap[String(s.NISN)] = s; });
      }
    } catch (_) { }

    // prepared menyimpan hasil per baris sesuai urutan asli (sparse array)
    const prepared = new Array(totalCount);
    const toProcess = [];

    // Pre-pass: semua validasi yang tidak butuh request ke API
    rowsToProcess.forEach(({ row, idx }) => {
      const nisnKey = String(row["NISN"] || "").trim();
      if (!nisnKey) {
        prepared[idx] = { nama: row["Nama"] || "?", ok: false, msg: "NISN kosong – wajib diisi" };
        return;
      }

      const existing = siswaMap[nisnKey];
      if (!existing) {
        prepared[idx] = { nama: row["Nama"] || nisnKey, ok: false, msg: `Siswa NISN ${nisnKey} tidak ditemukan` };
        return;
      }

      const namaKelasStr = String(row["Nama Kelas"] || "").trim();
      const jurusanStr = String(row["Jurusan"] || "").trim();

      if (!namaKelasStr) {
        prepared[idx] = { nama: row["Nama"] || nisnKey, ok: false, msg: "Nama Kelas wajib diisi" };
        return;
      }

      const matchedKelas = kelasList.find(
        (k) =>
          k.kelas?.toString().toLowerCase() === namaKelasStr.toLowerCase() &&
          (k.jurusan || "").toString().toLowerCase() === jurusanStr.toLowerCase()
      );

      if (!matchedKelas) {
        prepared[idx] = {
          nama: row["Nama"] || nisnKey,
          ok: false,
          msg: `Kelas "${namaKelasStr}" ${jurusanStr ? `dengan jurusan "${jurusanStr}"` : ""} tidak ditemukan`,
        };
        return;
      }

      const kelasId = matchedKelas.id;
      const ortuId = row["ID Orang Tua"] ? parseInt(row["ID Orang Tua"]) : null;

      // Check data apakah sama kek di db apa gnti
      const existingDateStr = existing.tanggal_lahir ? existing.tanggal_lahir.slice(0, 10) : "";
      const inputDateStr = String(row["Tanggal Lahir (YYYY-MM-DD)"] || "").trim();

      const hasChanged =
        String(existing.NIPD || "").trim() !== String(row["NIPD"] || "").trim() ||
        String(existing.nama || "").trim() !== String(row["Nama"] || "").trim() ||
        String(existing.alamat || "").trim() !== String(row["Alamat"] || "").trim() ||
        String(existing.gender || "").trim() !== String(row["Gender"] || "").trim() ||
        existingDateStr !== inputDateStr ||
        String(existing.nomor_telepon || "").trim() !== String(row["Nomor Telepon"] || "").trim() ||
        existing.kelas_id !== kelasId ||
        existing.orangtua_id !== (ortuId || null);

      if (!hasChanged) {
        prepared[idx] = {
          nama: row["Nama"] || nisnKey,
          ok: false,
          msg: "Data sama dengan sebelumnya (tidak ada perubahan)",
        };
        return;
      }

      toProcess.push({ idx, row, existing, kelasId, ortuId, nisnKey });
    });

    // Tampilkan hasil pre-pass duluan (progress sudah terisi sebagian)
    const preDone = rowsToProcess.length - toProcess.length;
    setProgress({ current: preDone, total: totalCount });
    setResults(prepared.filter(Boolean));

    // Proses ke backend dengan concurrency terbatas
    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ idx, row, existing, kelasId, ortuId, nisnKey }) => {
        try {
          const payload = {
            NISN: String(row["NISN"] || "").trim(),
            NIPD: String(row["NIPD"] || "").trim(),
            nama: String(row["Nama"] || "").trim(),
            alamat: String(row["Alamat"] || "").trim(),
            gender: String(row["Gender"] || "").trim(),
            tanggal_lahir: String(row["Tanggal Lahir (YYYY-MM-DD)"] || "").trim(),
            nomor_telepon: String(row["Nomor Telepon"] || "").trim(),
            kelas_id: kelasId,
            ...(ortuId ? { orangtua_id: ortuId } : {}),
          };

          const result = await siswa.update(existing.id, payload);
          const entry = { nama: payload.nama || nisnKey, ok: result?.success ?? false, msg: result?.message || "" };
          prepared[idx] = entry;
          return entry;
        } catch (err) {
          const entry = { nama: row["Nama"] || nisnKey, ok: false, msg: err.message };
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

    const allRows = rows.map((row, idx) => ({ row, idx }));
    await runUpdate(allRows, rows.length);

    setUpdating(false);
    setDone(true);
    onUpdateDone();
  };

  // retryFailed hanya mengirim ulang baris-baris yang sebelumnya gagal,
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
    await runUpdate(failedRows, failedRows.length);
    setUpdating(false);
    setDone(true);
    onUpdateDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  const filteredRows = useMemo(() => {
    if (!draftSearch.trim()) return rows;
    const q = draftSearch.toLowerCase().trim();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, draftSearch]);

  const filteredResults = useMemo(() => {
    if (!resultSearch.trim()) return results;
    const q = resultSearch.toLowerCase().trim();
    return results.filter(
      (r) =>
        r.nama?.toLowerCase().includes(q) || r.msg?.toLowerCase().includes(q)
    );
  }, [results, resultSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Update Data Siswa</h2>
            <p className="text-emerald-200 text-xs mt-0.5">Upload Excel dengan kolom NISN (key), field siswa, Nama Kelas, Jurusan, ID Orang Tua</p>
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
                    <tr>{UPDATE_HEADERS.map((k) => (<th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {UPDATE_HEADERS.map((h) => (<td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(r[h] ?? "")}</td>))}
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
                <InfoStatCard label="Berhasil" value={successCount} helper="Baris yang berhasil diupdate" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Baris yang perlu dicek lagi" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari nama atau status hasil log..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

// Delete Confirm Modal (tidak berubah)

function DeleteConfirmModal({ student, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const result = await siswa.delete(student.id);
      if (result?.success) {
        onDeleted();
      } else {
        setError(result?.message || "Gagal menghapus siswa");
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
            <h2 className="text-white font-semibold text-lg">Hapus Data Siswa</h2>
            <p className="text-red-200 text-xs mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
          </div>
          <button onClick={onClose} className="text-red-200 hover:text-white transition-colors"><XCircle /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-red-500 mt-0.5 shrink-0"><AlertCircle /></span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Yakin ingin menghapus siswa ini?</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{student.nama}</span>
                {student.NISN && <span className="text-gray-400"> · NISN: {student.NISN}</span>}
              </p>
              <p className="text-xs text-gray-400 mt-1">Data akan dinonaktifkan (soft delete) dan tidak muncul di daftar.</p>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle /> {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} disabled={deleting} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
              Batal
            </button>
            <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
              {deleting ? (
                <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Menghapus...</>
              ) : "Hapus Siswa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component

export default function ImportSiswa() {
  const [pageStudents, setPageStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const itemsPerPage = 10;

  const templateRef = useRef();
  const exportRef = useRef();
  const importMenuRef = useRef();

  useEffect(() => {
    const fetchKelas = async () => {
      try {
        const res = await kelas.list("limit=100");
        if (res.success && res.data) setKelasList(res.data);
      } catch (err) { console.error("Error fetching kelas:", err); }
    };
    fetchKelas();
  }, []);

  const fetchPageStudents = async (targetPage) => {
    setLoading(true);
    setError("");
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = (
        user?.userRole?.[0]?.role?.name || user?.role?.name || user?.role || ""
      ).toString().toUpperCase();
      const guruId = user?.guru?.id;
      const queryParams = {
        page: targetPage.toString(),
        limit: itemsPerPage.toString()
      };
      if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();
      if (selectedKelas) queryParams.kelas_id = selectedKelas;
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await siswa.list(queryString);
      if (res.success) {
        setPageStudents(res.data || []);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages || 1);
          setTotalRecords(res.pagination.total || 0);
        }
      } else {
        setError(res.message || "Gagal memuat data siswa");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStudentsBackground = async () => {
    setBackgroundLoading(true);
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = (
        user?.userRole?.[0]?.role?.name || user?.role?.name || user?.role || ""
      ).toString().toUpperCase();
      const guruId = user?.guru?.id;
      const queryParams = {
        limit: "9999"
      };
      if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();
      const queryString = new URLSearchParams(queryParams).toString();
      const res = await siswa.list(queryString);
      if (res.success) {
        setAllStudents(res.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat data background siswa:", err);
    } finally {
      setBackgroundLoading(false);
    }
  };

  useEffect(() => {
    fetchPageStudents(page);
  }, [page, selectedKelas]);

  useEffect(() => {
    fetchAllStudentsBackground();
  }, []);

  const filteredStudents = useMemo(() => {
    let filtered = allStudents;
    if (selectedKelas) filtered = filtered.filter((s) => s.kelas_id === parseInt(selectedKelas));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((s) =>
        s.nama?.toLowerCase().includes(q) ||
        s.NISN?.toLowerCase().includes(q) ||
        s.NIPD?.toLowerCase().includes(q) ||
        s.nomor_telepon?.toLowerCase().includes(q) ||
        s.orang_tua?.nama_orangtua?.toLowerCase().includes(q) ||
        (s.kelas && `${s.kelas.kelas} ${s.kelas.jurusan || ""}`.toLowerCase().includes(q))
      );
    }
    return filtered;
  }, [allStudents, selectedKelas, searchQuery]);

  const totalPagesCount = useMemo(() => {
    if (searchQuery.trim()) {
      const newTotal = Math.ceil(filteredStudents.length / itemsPerPage);
      return newTotal === 0 ? 1 : newTotal;
    }
    return totalPages;
  }, [filteredStudents, searchQuery, totalPages]);

  useEffect(() => {
    if (page > totalPagesCount) setPage(1);
  }, [totalPagesCount, page]);

  const currentPageData = useMemo(() => {
    if (searchQuery.trim()) {
      const start = (page - 1) * itemsPerPage;
      return filteredStudents.slice(start, start + itemsPerPage);
    }
    return pageStudents;
  }, [filteredStudents, page, pageStudents, searchQuery]);

  useEffect(() => { setPage(1); }, [selectedKelas, searchQuery]);

  const handleSearch = (value) => setSearchQuery(value);
  const clearSearch = () => setSearchQuery("");
  const refreshData = () => {
    fetchPageStudents(page);
    fetchAllStudentsBackground();
  };

  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Data Siswa" subtitle="Kelola data siswa & import massal" />

      <div className="flex-1 overflow-auto p-8">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <AlertCircle /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 pt-4 pb-2 border-b border-gray-100">
            <div className="mb-3">
              <p className="text-sm text-gray-400">
                {loading && !searchQuery.trim() ? <span>Memuat…</span> : (
                  searchQuery.trim() ? (
                    backgroundLoading ? (
                      <span>Memuat data pencarian…</span>
                    ) : (
                      <><span className="font-semibold text-gray-700">{filteredStudents.length}</span> dari <span className="font-semibold text-gray-700">{allStudents.length}</span> Siswa ditemukan</>
                    )
                  ) : (
                    <><span className="font-semibold text-gray-700">{pageStudents.length}</span> dari <span className="font-semibold text-gray-700">{totalRecords}</span> Siswa terdaftar</>
                  )
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap pb-2">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Cari nama, NISN, NIPD, telepon, atau orang tua..."
                  className="pl-10 pr-10 py-2 w-full text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <button onClick={clearSearch} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                    <XIcon />
                  </button>
                )}
              </div>

              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-44"
              >
                <option value="">Semua Kelas</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id.toString()}>{k.kelas} {k.jurusan}</option>
                ))}
              </select>

              <div className="flex items-center gap-2 ml-auto flex-wrap">

                {/* Template dropdown */}
                <div className="relative" ref={templateRef}>
                  <button
                    onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowExportMenu(false); setShowImportMenu(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    <DownloadIcon /> Template <ChevronDown />
                  </button>
                  {showTemplateMenu && (
                    <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                      <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Import Baru</p>
                      <button onClick={() => { downloadExcelTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                        <span className="text-green-600"><FileExcelIcon /></span> Template Excel (.xlsx)
                      </button>
                      <button onClick={() => { downloadPdfTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                        <span className="text-red-500"><FilePdfIcon /></span> Template PDF
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <p className="px-4 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Update Data</p>
                      <button onClick={() => { downloadUpdateExcelTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                        <span className="text-green-600"><FileExcelIcon /></span> Template Update (.xlsx)
                      </button>
                      <button onClick={() => { downloadUpdatePdfTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 pb-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                        <span className="text-red-500"><FilePdfIcon /></span> Template Update (PDF)
                      </button>
                    </div>
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
                  {showExportMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                      <button onClick={() => { exportTableExcel(filteredStudents); setShowExportMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                        <span className="text-green-600"><FileExcelIcon /></span> Export Excel (.xlsx)
                      </button>
                      <button onClick={() => { exportTablePdf(filteredStudents); setShowExportMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                        <span className="text-red-500"><FilePdfIcon /></span> Export PDF
                      </button>
                    </div>
                  )}
                </div>

                {/* Import / Update dropdown */}
                <div className="relative" ref={importMenuRef}>
                  <button
                    onClick={() => { setShowImportMenu(!showImportMenu); setShowTemplateMenu(false); setShowExportMenu(false); }}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
                  >
                    <UploadIcon /> Import / Update <ChevronDown />
                  </button>
                  {showImportMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                      <button
                        onClick={() => { setShowImportModal(true); setShowImportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <span className="text-blue-600"><UploadIcon /></span> Import Excel
                      </button>
                      <button
                        onClick={() => { setShowUpdateModal(true); setShowImportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        <span className="text-emerald-600"><UploadIcon /></span> Update Excel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {["Nama", "Kelas", "No Telp", "NIPD", "NISN", "Nama Orang Tua", "Aksi"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : currentPageData.length > 0 ? (
                  currentPageData.map((s) => (
                    <tr key={s.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.nama}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-"}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.nomor_telepon}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.NIPD}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.NISN}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{s.orang_tua?.nama_orangtua || "-"}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setDeleteTarget(s)}
                          title="Hapus siswa"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors duration-150"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-gray-500 text-sm">
                        {searchQuery || selectedKelas ? "Tidak ada data yang sesuai dengan filter." : "Tidak ada data siswa."}
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
            summary={`Halaman ${page} dari ${totalPagesCount} (Menampilkan ${currentPageData.length} dari ${searchQuery.trim() ? filteredStudents.length : totalRecords} data)`}
          />
        </div>
      </div>

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImportDone={refreshData} />
      )}
      {showUpdateModal && (
        <UpdateModal onClose={() => setShowUpdateModal(false)} onUpdateDone={refreshData} kelasList={kelasList} />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          student={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => { setDeleteTarget(null); refreshData(); }}
        />
      )}
    </div>
  );
}