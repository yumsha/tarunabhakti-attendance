import PageHeader from "../layout/PageHeader.jsx";
import { useState, useEffect, useRef, useMemo } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { siswa, kelas } from "../../lib/backendApi";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import InfoStatCard from "../layout/InfoStatCard";

// ─── helpers ────────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = ["NISN", "NIPD", "Nama", "Alamat", "Gender", "Tanggal Lahir (YYYY-MM-DD)", "Nomor Telepon", "Kelas ID", "Orang Tua ID", "Nama Orang Tua"];

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ["1234567890", "987654321", "Contoh Nama", "Jl. Contoh No.1", "L", "2007-01-15", "08123456789", "1", "", "Contoh Nama Ortu"],
  ]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
  XLSX.writeFile(wb, "template_siswa.xlsx");
}

function downloadPdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Import Data Siswa", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Isi sesuai kolom di bawah. Tanggal lahir format YYYY-MM-DD. Gender: L / P.", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [TEMPLATE_HEADERS],
    body: [["1234567890", "987654321", "Contoh Nama", "Jl. Contoh No.1", "L", "2007-01-15", "08123456789", "1", "", "Contoh Nama Ortu"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("template_siswa.pdf");
}

function exportTablePdf(students) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Data Siswa", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["Nama", "Kelas", "No Telp", "NIPD", "NISN", "Nama Orang Tua"]],
    body: students.map((s) => [
      s.nama,
      s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-",
      s.nomor_telepon,
      s.NIPD,
      s.NISN,
      s.orang_tua?.nama_orangtua || "-",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("data_siswa.pdf");
}

function exportTableExcel(students) {
  const rows = students.map((s) => ({
    Nama: s.nama,
    Kelas: s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-",
    "No Telp": s.nomor_telepon,
    NIPD: s.NIPD,
    NISN: s.NISN,
    "Nama Orang Tua": s.orang_tua?.nama_orangtua || "-",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
  XLSX.writeFile(wb, "data_siswa.xlsx");
}

// ─── Icons ──────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const UploadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />;
const DownloadIcon = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />;
const FileExcelIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 13l1.5 2.5L9 18h1.5l.75-1.5.75 1.5H13.5l-1.5-2.5L13.5 13H12l-.75 1.5L10.5 13H9z" />;
const FilePdfIcon = () => <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9 17v-5h1.5a1.5 1.5 0 0 1 0 3H9M14 17v-5h2M14 14.5h1.5" />;
const ChevronLeft = () => <Icon d="M15 18l-6-6 6-6" />;
const ChevronRight = () => <Icon d="M9 18l6-6-6-6" />;
const AlertCircle = () => <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8v4M12 16h.01" />;
const CheckCircle = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />;
const XCircle = () => <Icon d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM15 9l-6 6M9 9l6 6" />;
const SearchIcon = () => <Icon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />;
const XIcon = () => <Icon d="M18 6L6 18M6 6l12 12" />;

// ─── Modal Import ────────────────────────────────────────────────────────────
function ImportModal({ onClose, onImportDone }) {
  const [rows, setRows] = useState([]);
  const [results, setResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setRows(json);
      setResults([]);
      setDone(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  const startImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    const res = [];
    for (const row of rows) {
      try {
        const payload = {
          NISN: String(row["NISN"] || ""),
          NIPD: String(row["NIPD"] || ""),
          nama: row["Nama"] || "",
          alamat: row["Alamat"] || "",
          gender: row["Gender"] || "",
          tanggal_lahir: row["Tanggal Lahir (YYYY-MM-DD)"] || "",
          nomor_telepon: String(row["Nomor Telepon"] || ""),
          kelas_id: row["Kelas ID"] || "",
          orangtua_id: row["Orang Tua ID"] || null,
        };
        const result = await siswa.create(payload);
        res.push({ nama: payload.nama, ok: result?.success, msg: result?.message || "" });
      } catch (err) {
        res.push({ nama: row["Nama"] || "?", ok: false, msg: err.message });
      }
    }
    setResults(res);
    setImporting(false);
    setDone(true);
    onImportDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount = results.filter((r) => !r.ok).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data Siswa</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) untuk import massal</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
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
              <div className="flex justify-center mb-3 text-blue-400 group-hover:text-blue-600 transition-colors">
                <UploadIcon />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop file Excel di sini atau <span className="text-blue-600 underline">pilih file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {rows.length > 0 && !done && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{rows.length} baris ditemukan</p>
                <button onClick={() => { setRows([]); setResults([]); }} className="text-xs text-red-500 hover:underline">
                  Ganti file
                </button>
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {Object.keys(rows[0]).map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(v)}</td>
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

          {done && (
            <div>
              <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-2">
                <InfoStatCard
                  label="Berhasil"
                  value={successCount}
                  helper="Baris yang lolos proses import"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  tone="emerald"
                />
                <InfoStatCard
                  label="Gagal"
                  value={failCount}
                  helper="Baris yang perlu dicek lagi"
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

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ImportSiswa() {
  const [allStudents, setAllStudents] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const templateRef = useRef();
  const exportRef = useRef();
  const itemsPerPage = 10;

  // Fetch daftar kelas untuk filter
  useEffect(() => {
    const fetchKelas = async () => {
      try {
        const res = await kelas.list("limit=100");
        if (res.success && res.data) setKelasList(res.data);
      } catch (err) {
        console.error("Error fetching kelas:", err);
      }
    };
    fetchKelas();
  }, []);

  // Fetch all siswa data (client-side filtering)
  const fetchAllStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const role = (
        user?.userRole?.[0]?.role?.name ||
        user?.role?.name ||
        user?.role ||
        ""
      ).toString().toUpperCase();
      const guruId = user?.guru?.id;

      const queryParams = {};
      if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();
      
      const queryString = new URLSearchParams(queryParams).toString();
      // Fetch all data with large limit
      const res = await siswa.list(queryString + "&limit=9999");
      if (res.success) {
        setAllStudents(res.data);
      } else {
        setError(res.message || "Gagal memuat data siswa");
      }
    } catch (err) {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  // Filter data berdasarkan kelas dan search query
  const filteredStudents = useMemo(() => {
    let filtered = allStudents;
    
    // Filter by kelas
    if (selectedKelas) {
      filtered = filtered.filter((s) => s.kelas_id === parseInt(selectedKelas));
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((s) => {
        return (
          s.nama?.toLowerCase().includes(query) ||
          s.NISN?.toLowerCase().includes(query) ||
          s.NIPD?.toLowerCase().includes(query) ||
          s.nomor_telepon?.toLowerCase().includes(query) ||
          s.orang_tua?.nama_orangtua?.toLowerCase().includes(query) ||
          (s.kelas && `${s.kelas.kelas} ${s.kelas.jurusan || ""}`.toLowerCase().includes(query))
        );
      });
    }
    
    return filtered;
  }, [allStudents, selectedKelas, searchQuery]);

  // Update pagination based on filtered data
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    setTotalPages(newTotalPages === 0 ? 1 : newTotalPages);
    
    // Reset to page 1 if current page is out of range
    if (page > newTotalPages && newTotalPages > 0) {
      setPage(1);
    }
  }, [filteredStudents, page]);

  // Get current page data
  const currentPageData = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, page]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedKelas, searchQuery]);

  // Initial fetch
  useEffect(() => {
    fetchAllStudents();
  }, []);

  // Handle search
  const handleSearch = (value) => {
    setSearchQuery(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Refresh data after import
  const refreshData = () => {
    fetchAllStudents();
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
<div className="flex-1 flex flex-col overflow-hidden">
  {/* ── Page Header ── */}
  <PageHeader
    title="Data Siswa"
    subtitle="Kelola data siswa & import massal"
  />

  {/* ── Scrollable Content ── */}
  <div className="flex-1 overflow-auto p-8">
    {error && (
      <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        <AlertCircle />
        {error}
      </div>
    )}

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar: search + filter + actions */}
      <div className="px-6 pt-4 pb-2 border-b border-gray-100">
        
        {/* Info siswa ditemukan - dibawah search */}
        <div className="mt-3 mb-4">
          <p className="text-sm text-gray-400">
            {loading ? (
              <span>Memuat…</span>
            ) : (
              <><span className="font-semibold text-gray-700">{filteredStudents.length}</span> dari <span className="font-semibold text-gray-700">{allStudents.length}</span> orang tua ditemukan</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari nama, NISN, NIPD, telepon, atau orang tua..."
              className="pl-10 pr-10 py-2 w-full text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          
          <div>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-50"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id.toString()}>
                  {k.kelas} {k.jurusan}
                </option>
              ))}
            </select>                
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Template dropdown */}
            <div className="relative" ref={templateRef}>
              <button
                onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowExportMenu(false); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                <DownloadIcon />
                Unduh Template
              </button>
              {showTemplateMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                  <button
                    onClick={() => { downloadExcelTemplate(); setShowTemplateMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition"
                  >
                    <span className="text-green-600"><FileExcelIcon /></span>
                    Template Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => { downloadPdfTemplate(); setShowTemplateMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                  >
                    <span className="text-red-500"><FilePdfIcon /></span>
                    Template PDF
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
                <DownloadIcon />
                Export Data
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-20">
                  <button
                    onClick={() => { exportTableExcel(filteredStudents); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition"
                  >
                    <span className="text-green-600"><FileExcelIcon /></span>
                    Export Excel (.xlsx)
                  </button>
                  <button
                    onClick={() => { exportTablePdf(filteredStudents); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                  >
                    <span className="text-red-500"><FilePdfIcon /></span>
                    Export PDF
                  </button>
                </div>
              )}
            </div>

            {/* Import button */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              <UploadIcon />
              Import Excel
            </button>
          </div>
        </div>
        
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50/80">
            <tr>
              {["Nama", "Kelas", "No Telp", "NIPD", "NISN", "Nama Orang Tua"].map((h) => (
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
                  <td colSpan={6} className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : currentPageData.length > 0 ? (
              currentPageData.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/30 transition-colors duration-150">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{s.nama}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.nomor_telepon}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.NIPD}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-mono">{s.NISN}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.orang_tua?.nama_orangtua || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-gray-500 text-sm">
                    {searchQuery || selectedKelas ? "Tidak ada data yang sesuai dengan filter." : "Tidak ada data siswa."}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Halaman {page} dari {totalPages} (Menampilkan {currentPageData.length} dari {filteredStudents.length} data)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* ── Import Modal ── */}
  {showImportModal && (
    <ImportModal
      onClose={() => setShowImportModal(false)}
      onImportDone={refreshData}
    />
  )}
</div>
  );
}
