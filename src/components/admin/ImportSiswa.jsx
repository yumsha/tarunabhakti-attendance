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
];

const UPDATE_HEADERS = [
  "NISN",
  "NIPD",
  "Nama",
  "Alamat",
  "Gender",
  "Tanggal Lahir (YYYY-MM-DD)",
  "Nomor Telepon",
  "Kelas ID",
  "ID Orang Tua",
];

// Template Downloaders

function downloadUpdateExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    UPDATE_HEADERS,
    ["3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor", "L", "2005-12-06", "08875094072", 1, 1],
  ]);
  ws["!cols"] = UPDATE_HEADERS.map(() => ({ wch: 26 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Update Siswa");
  XLSX.writeFile(wb, "update_siswa.xlsx");
}

function downloadUpdatePdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Update Data Siswa", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("NISN digunakan sebagai key pencarian. Kelas ID & ID Orang Tua harus berupa angka.", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [UPDATE_HEADERS],
    body: [["3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor", "L", "2005-12-06", "08875094072", "1", "1"]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save("update_siswa.pdf");
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ["3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor", "L", "2005-12-06", "08875094072", "XII", "Rekayasa Perangkat Lunak", 1],
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
    body: [["3050626105", "2025001", "Sandi Permata", "Jl. Kenanga No. 46 Bogor", "L", "2005-12-06", "08875094072", "XII", "Rekayasa Perangkat Lunak", "1"]],
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
    head: [["NISN", "NIPD", "Nama", "Alamat", "Gender", "Tanggal Lahir", "Nomor Telepon", "Nama Kelas", "Jurusan"]],
    body: students.map((s) => [
      s.NISN,
      s.NIPD,
      s.nama,
      s.alamat,
      s.gender,
      s.tanggal_lahir?.slice(0, 10),
      s.nomor_telepon,
      s.kelas?.kelas || "-",
      s.kelas?.jurusan || "-",
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

    let orangtuaMap = {};
    try {
      const ortuRes = await orangTua.list("limit=9999");
      if (ortuRes?.success && Array.isArray(ortuRes.data)) {
        ortuRes.data.forEach((o) => { orangtuaMap[String(o.id)] = o; });
      }
    } catch (_) {}

    const res = [];
    for (const row of rows) {
      try {
        if (!row["NISN"] || !row["NIPD"] || !row["Nama"]) {
          res.push({ nama: row["Nama"] || "?", ok: false, msg: "Field wajib kosong" });
          continue;
        }

        const ortuId       = String(row["ID Orang Tua"] || "").trim();
        const matchedOrtu  = ortuId ? orangtuaMap[ortuId] : null;
        const orangtuaPayload = matchedOrtu
          ? { NIK: matchedOrtu.NIK, nama_orangtua: matchedOrtu.nama_orangtua, nomor_telepon: matchedOrtu.nomor_telepon, pekerjaan: matchedOrtu.pekerjaan, alamat: matchedOrtu.alamat }
          : undefined;

        const payload = {
          NISN:          String(row["NISN"] || ""),
          NIPD:          String(row["NIPD"] || ""),
          nama:          row["Nama"] || "",
          alamat:        row["Alamat"] || "",
          gender:        row["Gender"] || "",
          tanggal_lahir: row["Tanggal Lahir (YYYY-MM-DD)"] || "",
          nomor_telepon: String(row["Nomor Telepon"] || ""),
          nama_kelas:    row["Nama Kelas"] || "",
          jurusan:       row["Jurusan"] || "",
          ...(orangtuaPayload ? { orangtua: orangtuaPayload } : {}),
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
  const failCount    = results.filter((r) => !r.ok).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data Siswa</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) untuk import massal</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors"><XCircle /></button>
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

          {rows.length > 0 && !done && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{rows.length} baris ditemukan</p>
                <button onClick={() => { setRows([]); setResults([]); }} className="text-xs text-red-500 hover:underline">Ganti file</button>
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{Object.keys(rows[0]).map((k) => (<th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        {Object.values(r).map((v, j) => (<td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(v)}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && <p className="text-center text-xs text-gray-400 py-2">... dan {rows.length - 10} baris lainnya</p>}
              </div>
            </div>
          )}

          {done && (
            <div>
              <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-2">
                <InfoStatCard label="Berhasil" value={successCount} helper="Baris yang lolos proses import" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Baris yang perlu dicek lagi" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={r.ok ? "text-green-500" : "text-red-500"}>{r.ok ? <CheckCircle /> : <XCircle />}</span>
                    <span className="font-medium text-gray-800 flex-1">{r.nama}</span>
                    {!r.ok && <span className="text-xs text-red-500">{r.msg}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              {done ? "Tutup" : "Batal"}
            </button>
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

function UpdateModal({ onClose, onUpdateDone }) {
  const [rows, setRows]         = useState([]);
  const [results, setResults]   = useState([]);
  const [updating, setUpdating] = useState(false);
  const [done, setDone]         = useState(false);
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

  const startUpdate = async () => {
    if (!rows.length) return;
    setUpdating(true);

    let siswaMap = {};
    try {
      const r = await siswa.list("limit=9999");
      if (r?.success && Array.isArray(r.data)) {
        r.data.forEach((s) => { siswaMap[String(s.NISN)] = s; });
      }
    } catch (_) {}

    const res = [];
    for (const row of rows) {
      const nisnKey = String(row["NISN"] || "").trim();
      if (!nisnKey) {
        res.push({ nama: row["Nama"] || "?", ok: false, msg: "NISN kosong – wajib diisi" });
        continue;
      }

      const existing = siswaMap[nisnKey];
      if (!existing) {
        res.push({ nama: row["Nama"] || nisnKey, ok: false, msg: `Siswa NISN ${nisnKey} tidak ditemukan` });
        continue;
      }

      const kelasId = parseInt(row["Kelas ID"] || "");
      if (!kelasId) {
        res.push({ nama: row["Nama"] || nisnKey, ok: false, msg: "Kelas ID wajib diisi (angka)" });
        continue;
      }

      const ortuId = row["ID Orang Tua"] ? parseInt(row["ID Orang Tua"]) : null;

      try {
        const payload = {
          NISN:          String(row["NISN"] || "").trim(),
          NIPD:          String(row["NIPD"] || "").trim(),
          nama:          String(row["Nama"] || "").trim(),
          alamat:        String(row["Alamat"] || "").trim(),
          gender:        String(row["Gender"] || "").trim(),
          tanggal_lahir: String(row["Tanggal Lahir (YYYY-MM-DD)"] || "").trim(),
          nomor_telepon: String(row["Nomor Telepon"] || "").trim(),
          kelas_id:      kelasId,
          ...(ortuId ? { orangtua_id: ortuId } : {}),
        };

        const result = await siswa.update(existing.id, payload);
        res.push({ nama: payload.nama || nisnKey, ok: result?.success ?? false, msg: result?.message || "" });
      } catch (err) {
        res.push({ nama: row["Nama"] || nisnKey, ok: false, msg: err.message });
      }
    }

    setResults(res);
    setUpdating(false);
    setDone(true);
    onUpdateDone();
  };

  const successCount = results.filter((r) => r.ok).length;
  const failCount    = results.filter((r) => !r.ok).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-linear-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Update Data Siswa</h2>
            <p className="text-emerald-200 text-xs mt-0.5">Upload Excel dengan kolom NISN (key), field siswa, Kelas ID, ID Orang Tua</p>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition-colors"><XCircle /></button>
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

          {rows.length > 0 && !done && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{rows.length} baris ditemukan</p>
                <button onClick={() => { setRows([]); setResults([]); }} className="text-xs text-red-500 hover:underline">Ganti file</button>
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>{UPDATE_HEADERS.map((k) => (<th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.slice(0, 10).map((r, i) => (
                      <tr key={i}>
                        {UPDATE_HEADERS.map((h) => (<td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap">{String(r[h] ?? "")}</td>))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && <p className="text-center text-xs text-gray-400 py-2">... dan {rows.length - 10} baris lainnya</p>}
              </div>
            </div>
          )}

          {done && (
            <div>
              <div className="grid grid-cols-1 gap-4 mb-3 sm:grid-cols-2">
                <InfoStatCard label="Berhasil" value={successCount} helper="Baris yang berhasil diupdate" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Baris yang perlu dicek lagi" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={r.ok ? "text-green-500" : "text-red-500"}>{r.ok ? <CheckCircle /> : <XCircle />}</span>
                    <span className="font-medium text-gray-800 flex-1">{r.nama}</span>
                    {!r.ok && <span className="text-xs text-red-500">{r.msg}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
              {done ? "Tutup" : "Batal"}
            </button>
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

// Main Component

export default function ImportSiswa() {
  const [allStudents, setAllStudents]         = useState([]);
  const [kelasList, setKelasList]             = useState([]);
  const [selectedKelas, setSelectedKelas]     = useState("");
  const [searchQuery, setSearchQuery]         = useState("");
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");
  const [page, setPage]                       = useState(1);
  const [totalPages, setTotalPages]           = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu]     = useState(false);
  const [showImportMenu, setShowImportMenu]     = useState(false);
  const itemsPerPage = 10;

  const templateRef   = useRef();
  const exportRef     = useRef();
  const importMenuRef = useRef();

  // Fetch kelas

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

  // Fetch siswa

  const fetchAllStudents = async () => {
    setLoading(true);
    setError("");
    try {
      const userStr = localStorage.getItem("user");
      const user    = userStr ? JSON.parse(userStr) : null;
      const role    = (
        user?.userRole?.[0]?.role?.name ||
        user?.role?.name ||
        user?.role || ""
      ).toString().toUpperCase();
      const guruId = user?.guru?.id;

      const queryParams = {};
      if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();

      const queryString = new URLSearchParams(queryParams).toString();
      const res = await siswa.list(queryString + "&limit=9999");
      if (res.success) {
        setAllStudents(res.data);
      } else {
        setError(res.message || "Gagal memuat data siswa");
      }
    } catch {
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllStudents(); }, []);

  // Filter & Pagination (client-side)

  const filteredStudents = useMemo(() => {
    let filtered = allStudents;
    if (selectedKelas) {
      filtered = filtered.filter((s) => s.kelas_id === parseInt(selectedKelas));
    }
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

  useEffect(() => {
    const newTotal = Math.ceil(filteredStudents.length / itemsPerPage);
    setTotalPages(newTotal === 0 ? 1 : newTotal);
    if (page > newTotal && newTotal > 0) setPage(1);
  }, [filteredStudents, page]);

  const currentPageData = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, page]);

  useEffect(() => { setPage(1); }, [selectedKelas, searchQuery]);

  // Handlers

  const handleSearch = (value) => setSearchQuery(value);
  const clearSearch  = () => setSearchQuery("");
  const refreshData  = () => fetchAllStudents();

  // Outside click

  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current   && !templateRef.current.contains(e.target))   setShowTemplateMenu(false);
      if (exportRef.current     && !exportRef.current.contains(e.target))     setShowExportMenu(false);
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
          {/* Toolbar */}
          <div className="px-6 pt-4 pb-2 border-b border-gray-100">
            <div className="mb-3">
              <p className="text-sm text-gray-400">
                {loading ? <span>Memuat…</span> : (
                  <><span className="font-semibold text-gray-700">{filteredStudents.length}</span> dari <span className="font-semibold text-gray-700">{allStudents.length}</span> Siswa ditemukan</>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap pb-2">
              {/* Search */}
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

              {/* Kelas filter */}
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

              {/* Action buttons */}
              <div className="flex items-center gap-2 ml-auto flex-wrap">

                {/* Template dropdown (Import Baru + Update Data) */}
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

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {["Nama", "Kelas", "No Telp", "NIPD", "NISN", "Nama Orang Tua"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
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
                      <td className="px-6 py-4 text-sm text-gray-600">{s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-"}</td>
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

          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            summary={`Halaman ${page} dari ${totalPages} (Menampilkan ${currentPageData.length} dari ${filteredStudents.length} data)`}
          />
        </div>
      </div>

      {showImportModal && (
        <ImportModal onClose={() => setShowImportModal(false)} onImportDone={refreshData} />
      )}
      {showUpdateModal && (
        <UpdateModal onClose={() => setShowUpdateModal(false)} onUpdateDone={refreshData} />
      )}
    </div>
  );
}