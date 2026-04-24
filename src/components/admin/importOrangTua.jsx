import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import { useState, useEffect, useRef, useMemo } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { orangTua } from "../../lib/backendApi.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InfoStatCard from "../layout/InfoStatCard";

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ["Budi Santoso", "3201010101800001", "08123456789", "Wiraswasta", "Jl. Merdeka No. 1, Jakarta"],
  ]);
  ws["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: h === "Alamat" ? 36 : 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Orang Tua");
  XLSX.writeFile(wb, "template_orangtua.xlsx");
}

function downloadPdfTemplate() {
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

function exportTablePdf(data) {
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

function exportTableExcel(data) {
  const rows = data.map((o) => ({
    "Nama Orang Tua": o.nama_orangtua,
    "NIK": "\t" + String(o.NIK),
    "Nomor Telepon": "\t" + String(o.nomor_telepon),
    "Pekerjaan": o.pekerjaan,
    "Alamat": o.alamat,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // FORCE KOLOM NIK & TELEPON JADI STRING
  const range = XLSX.utils.decode_range(ws["!ref"]);

for (let R = range.s.r + 1; R <= range.e.r; ++R) {
  const nikCell  = XLSX.utils.encode_cell({ r: R, c: 1 });
  const telpCell = XLSX.utils.encode_cell({ r: R, c: 2 });

  if (ws[nikCell]) {
    ws[nikCell].v = String(ws[nikCell].v); 
    ws[nikCell].t = "s";
    ws[nikCell].z = "@";
  }

  if (ws[telpCell]) {
    ws[telpCell].v = String(ws[telpCell].v);
    ws[telpCell].t = "s";
    ws[telpCell].z = "@";
  }
}

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Orang Tua");

  XLSX.writeFile(wb, "data_orangtua.xlsx");
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const UploadIcon   = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const FileExcelIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 13l1.5 2.5L9 18h1.5l.75-1.5.75 1.5H13.5l-1.5-2.5L13.5 13H12l-.75 1.5L10.5 13H9z" />;
const FilePdfIcon  = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 17v-5h1.5a1.5 1.5 0 0 1 0 3H9M14 17v-5h2M14 14.5h1.5" />;
const AlertCircle  = () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" />;
const CheckCircle  = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />;
const XCircle      = () => <Icon d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM15 9l-6 6M9 9l6 6" />;
const SearchIcon   = () => <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const XIcon        = () => <Icon d="M18 6L6 18M6 6l12 12" />;

// ─── Modal Import ─────────────────────────────────────────────────────────────

function ImportModal({ onClose, onImportDone }) {
  const [rows, setRows]       = useState([]);
  const [results, setResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone]       = useState(false);
  const fileRef = useRef();

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb   = XLSX.read(e.target.result, { type: "binary" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  const startImport = async () => {
    if (!rows.length) return;
    setImporting(true);

    const res      = [];
    const nikCache = new Set();

    for (const row of rows) {
      const nama  = String(row["Nama Orang Tua"] || "").trim();
      const nik   = String(row["NIK"]            || "").trim();
      const telp  = String(row["Nomor Telepon"]  || "").trim();
      const kerja = String(row["Pekerjaan"]      || "").trim();
      const alamat = String(row["Alamat"]        || "").trim();

      // Validasi field wajib
      if (!nama || !nik || !telp || !kerja || !alamat) {
        res.push({ nama: nama || "?", ok: false, msg: "Semua field wajib diisi" });
        continue;
      }

      // Cek duplikat dalam file (pakai NIK)
      if (nikCache.has(nik)) {
        res.push({ nama, ok: false, msg: "NIK duplikat dalam file (skip)" });
        continue;
      }

      try {
        const result = await orangTua.create({
          nama_orangtua: nama,
          NIK:           nik,
          nomor_telepon: telp,
          pekerjaan:     kerja,
          alamat:        alamat,
        });

        if (result?.success) nikCache.add(nik); 
        res.push({ nama, ok: result?.success ?? false, msg: result?.message || "" });
      } catch (err) {
        res.push({ nama, ok: false, msg: err.message });
      }
    }

    setResults(res);
    setImporting(false);
    setDone(true);
    onImportDone(); 
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount    = results.filter((r) => !r.ok).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data Orang Tua</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) — kolom: Nama, NIK, Telepon, Pekerjaan, Alamat</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <XCircle />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop Zone */}
          {!rows.length && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-blue-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="flex justify-center mb-3 text-blue-400 group-hover:text-blue-600 transition-colors">
                <UploadIcon />
              </div>
              <p className="text-sm font-medium text-gray-700">
                Drop file Excel di sini atau <span className="text-blue-600 underline">pilih file</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && !done && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{rows.length} baris ditemukan</p>
                <button
                  onClick={() => { setRows([]); setResults([]); }}
                  className="text-xs text-red-500 hover:underline"
                >
                  Ganti file
                </button>
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {TEMPLATE_HEADERS.map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        {TEMPLATE_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(r[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <p className="text-center text-xs text-gray-400 py-2">... dan {rows.length - 10} baris lainnya</p>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {done && (
            <div>
              <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-2">
                <InfoStatCard
                  label="Berhasil"
                  value={successCount}
                  helper="Data orang tua yang berhasil tersimpan"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  tone="emerald"
                />
                <InfoStatCard
                  label="Gagal"
                  value={failCount}
                  helper="Perlu dibetulkan sebelum import ulang"
                  icon={<AlertTriangle className="h-5 w-5" />}
                  tone="red"
                />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={r.ok ? "text-green-500" : "text-red-500"}>
                      {r.ok ? <CheckCircle /> : <XCircle />}
                    </span>
                    <span className="font-medium text-gray-800 flex-1">{r.nama}</span>
                    {!r.ok && <span className="text-xs text-red-500">{r.msg}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              {done ? "Tutup" : "Batal"}
            </button>
            {!done && (
              <button
                onClick={startImport}
                disabled={!rows.length || importing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Mengimport...
                  </>
                ) : "Mulai Import"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminImport() {
  const [data, setData]               = useState([]);
  const [allData, setAllData]         = useState([]); // Store all data for client-side filtering
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu]     = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;
  
  const templateRef = useRef();
  const exportRef   = useRef();

  // Fetch all data once
  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch all data without pagination
      const res = await orangTua.list("limit=9999");
      if (res.success) {
        setAllData(res.data);
        setTotalPages(Math.ceil(res.data.length / itemsPerPage));
      } else {
        setError(res.message || "Gagal memuat data orang tua");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search query (client-side)
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return allData;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return allData.filter((item) => {
      return (
        item.nama_orangtua?.toLowerCase().includes(query) ||
        item.NIK?.toLowerCase().includes(query) ||
        item.nomor_telepon?.toLowerCase().includes(query) ||
        item.pekerjaan?.toLowerCase().includes(query) ||
        item.alamat?.toLowerCase().includes(query)
      );
    });
  }, [allData, searchQuery]);

  // Update pagination based on filtered data
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredData.length / itemsPerPage);
    setTotalPages(newTotalPages === 0 ? 1 : newTotalPages);
    
    // Reset to page 1 if current page is out of range
    if (page > newTotalPages && newTotalPages > 0) {
      setPage(1);
    }
  }, [filteredData, page]);

  // Get current page data
  const currentPageData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, page]);

  // Set data for display
  useEffect(() => {
    setData(currentPageData);
  }, [currentPageData]);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, []);

  // Handle search (no debounce needed for client-side)
  const handleSearch = (value) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page on search
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setPage(1);
  };

  // Refresh data after import
  const refreshData = () => {
    fetchAllData();
  };

  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current   && !exportRef.current.contains(e.target))   setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Kolom tabel disesuaikan dengan semua field
  const TABLE_COLS = ["ID", "Nama Orang Tua", "NIK", "Nomor Telepon", "Pekerjaan", "Alamat"];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Data Orang Tua"
        subtitle="Kelola data orang tua & import massal"
      />
      
      <div className="flex-1 overflow-auto p-8">
        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <AlertCircle /> {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
            <div className="flex-1">
              <p className="text-sm text-gray-500">
                {loading
                  ? <span>Memuat…</span>
                  : <><span className="font-semibold text-gray-700">{filteredData.length}</span> dari <span className="font-semibold text-gray-700">{allData.length}</span> orang tua ditemukan</>
                }
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative mx-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Cari nama, NIK, atau telepon..."
                className="pl-10 pr-10 py-2 w-80 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {/* Template dropdown */}
              <div className="relative" ref={templateRef}>
                <button
                  onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowExportMenu(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <DownloadIcon /> Unduh Template
                </button>
                {showTemplateMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                    <button onClick={() => { downloadExcelTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                      <span className="text-green-600"><FileExcelIcon /></span> Template Excel (.xlsx)
                    </button>
                    <button onClick={() => { downloadPdfTemplate(); setShowTemplateMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                      <span className="text-red-500"><FilePdfIcon /></span> Template PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Export dropdown */}
              <div className="relative" ref={exportRef}>
                <button
                  onClick={() => { setShowExportMenu(!showExportMenu); setShowTemplateMenu(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <DownloadIcon /> Export Data
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                    <button onClick={() => { exportTableExcel(filteredData); setShowExportMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                      <span className="text-green-600"><FileExcelIcon /></span> Export Excel (.xlsx)
                    </button>
                    <button onClick={() => { exportTablePdf(filteredData); setShowExportMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition">
                      <span className="text-red-500"><FilePdfIcon /></span> Export PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Import button */}
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
              >
                <UploadIcon /> Import Excel
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {TABLE_COLS.map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
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
                ) : data.length > 0 ? (
                  data.map((o, i) => (
                    <tr key={o.id ?? i} className="hover:bg-blue-50/30 transition-colors duration-150">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{o.nama_orangtua}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">{o.NIK}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.nomor_telepon}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.pekerjaan}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.alamat}</td>
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
            totalPages={totalPages}
            onPageChange={setPage}
            summary={`Halaman ${page} dari ${totalPages} (Menampilkan ${data.length} dari ${filteredData.length} data)`}
          />
        </div>
      </div>

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportDone={refreshData}
        />
      )}
    </div>
  );
}
