import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ScanLine,
  Search,
  ShieldBan,
  Trash2,
  UserRound,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PageHeader from "../layout/PageHeader";
import InfoStatCard from "../layout/InfoStatCard";
import Pagination from "../layout/Pagination";
import { rfid as rfidApi, siswa as siswaApi } from "../../lib/backendApi";

// ─── Template & Export Helpers ────────────────────────────────────────────────

const TEMPLATE_HEADERS = ["Nama", "NISN", "NIK", "RFID"];
const UPDATE_HEADERS = ["UID RFID", "Nama Siswa", "Status Aktif (TRUE/FALSE)"];

const CONCURRENCY = 5;

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

function getRfidGuideSheet() {
  const guideData = [
    ["PANDUAN PENGGUNAAN - IMPORT & UPDATE RFID SISWA"],
    [""],
    ["1. IMPORT RFID BARU"],
    ["   - Kolom yang WAJIB ada: Nama, NISN, NIK, RFID (urutan kolom bebas, boleh ada kolom tambahan lain)."],
    ["   - Sistem mencocokkan siswa berdasarkan NISN terlebih dahulu, lalu fallback ke NIK jika NISN tidak ditemukan."],
    ["   - Kolom RFID diisi dengan UID kartu RFID siswa yang bersangkutan. Harus unik dan belum terdaftar di sistem."],
    ["   - File export data siswa lengkap (mis. dari Dapodik) yang sudah memiliki kolom-kolom di atas BISA langsung diupload tanpa perlu diedit ulang."],
    ["   - Baris dengan NISN atau RFID kosong akan dilewati dan dicatat sebagai error."],
    [""],
    ["2. CARA UPDATE DATA RFID (fitur terpisah)"],
    ["   - Gunakan menu 'Update Excel' dengan kolom: UID RFID, Nama Siswa, Status Aktif (TRUE/FALSE)."],
    ["   - UID RFID bertindak sebagai kunci utama (key) untuk update."],
    ["   - Jangan pernah mengubah UID RFID pada baris data yang ingin di-update."],
    ["   - Anda dapat memindahkan kepemilikan kartu ke Nama Siswa lain atau mengubah Status Aktif."]
  ];
  const ws = XLSX.utils.aoa_to_sheet(guideData);
  ws["!cols"] = [{ wch: 125 }];
  return ws;
}

function downloadExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    ["Budi Santoso", "0051234001", "3226428948557758", "04A1B2C3D4"],
    ["Siti Rahayu", "0051234002", "7332251801315270", "04E5F6A7B8"],
  ]);
  ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 28 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template RFID");
  XLSX.utils.book_append_sheet(wb, getRfidGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "template_rfid.xlsx");
}

function downloadPdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Import Data RFID", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Kolom wajib: Nama, NISN, NIK, RFID. Siswa dicocokkan berdasarkan NISN (fallback NIK).", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [TEMPLATE_HEADERS],
    body: [
      ["Budi Santoso", "0051234001", "3226428948557758", "04A1B2C3D4"],
      ["Siti Rahayu", "0051234002", "7332251801315270", "04E5F6A7B8"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("template_rfid.pdf");
}

function downloadUpdateExcelTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    UPDATE_HEADERS,
    ["04A1B2C3D4", "Budi Santoso", "TRUE"],
    ["04E5F6A7B8", "Siti Rahayu", "FALSE"],
  ]);
  ws["!cols"] = UPDATE_HEADERS.map(() => ({ wch: 32 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Update RFID");
  XLSX.utils.book_append_sheet(wb, getRfidGuideSheet(), "Panduan Penggunaan");
  XLSX.writeFile(wb, "update_rfid.xlsx");
}

function downloadUpdatePdfTemplate() {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Template Update Data RFID", 14, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("UID RFID bertindak sebagai key utama. Ubah Nama Siswa atau Status Aktif.", 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [UPDATE_HEADERS],
    body: [
      ["04A1B2C3D4", "Budi Santoso", "TRUE"],
      ["04E5F6A7B8", "Siti Rahayu", "FALSE"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  });
  doc.save("update_rfid.pdf");
}

function exportTableExcel(rows) {
  const data = rows.map((item) => ({
    "UID RFID": item.uid_rfid,
    "Nama Siswa": item.siswa?.nama || "-",
    "Status Aktif (TRUE/FALSE)": item.is_active ? "TRUE" : "FALSE",
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = Object.keys(data[0] || {}).map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data RFID");
  XLSX.writeFile(wb, "data_rfid.xlsx");
}

function exportTablePdf(rows) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Data RFID Siswa", 14, 16);
  autoTable(doc, {
    startY: 22,
    head: [["UID RFID", "Nama Siswa", "Status Aktif (TRUE/FALSE)"]],
    body: rows.map((item) => [
      item.uid_rfid,
      item.siswa?.nama || "-",
      item.is_active ? "TRUE" : "FALSE",
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save("data_rfid.pdf");
}

// ─── Icon Helpers ─────────────────────────────────────────────────────────────

const SvgIcon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const CheckCircleIcon = () => <SvgIcon d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3" />;
const XCircleIcon = () => <SvgIcon d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM15 9l-6 6M9 9l6 6" />;

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show ? (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg pointer-events-none">
          {text}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      ) : null}
    </span>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = toast.type === "error"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <div className={`fixed bottom-6 right-6 z-100 flex max-w-sm items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${styles}`}>
      {toast.type === "error" ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} className="ml-1 opacity-60 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({ isOpen, item, onCancel, onConfirm, loading }) {
  if (!isOpen || !item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={!loading ? onCancel : undefined} />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-4">
          <div className="rounded-xl bg-red-50 p-2.5"><Trash2 className="h-5 w-5 text-red-500" /></div>
          <div>
            <h3 className="font-semibold text-gray-800">Hapus RFID</h3>
            <p className="mt-0.5 text-sm text-gray-500">Data akan di-soft delete dari sistem.</p>
          </div>
        </div>
        <div className="mb-4 rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">UID RFID</p>
          <p className="mt-1 font-mono text-sm font-semibold text-gray-800">{item.uid_rfid}</p>
        </div>
        <p className="mb-6 text-sm text-gray-600">
          Yakin ingin menghapus RFID untuk <span className="font-semibold text-gray-800">{item.siswa?.nama || "siswa ini"}</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Batal</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Searchable Select ────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition " +
  "focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500";

function SearchableSelect({ value, onChange, students, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setQuery(""); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchInputRef.current?.focus(), 50); }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.nama.toLowerCase().includes(q) || s.classLabel.toLowerCase().includes(q) || String(s.id).includes(q));
  }, [students, query]);

  const selected = students.find((s) => String(s.id) === String(value));

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-gray-50 px-4 py-2.5 text-sm transition " +
          (open ? "border-transparent ring-2 ring-blue-500" : "border-gray-200 hover:border-gray-300") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        {/* nama + kelas sisswa kepilih */}
        <span className={selected ? "text-gray-800" : "text-gray-400"}>
          {selected ? (
            <>
              {selected.nama}{" "}
              <span className="text-gray-500 text-sm">
                ({selected.classLabel})
              </span>
            </>
          ) : (
            "Pilih siswa"
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled ? (
            <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); }} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <svg className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {open ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input ref={searchInputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari nama atau ID..." className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400" />
              {query ? <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600"><X className="h-3 w-3" /></button> : null}
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-400">Siswa tidak ditemukan</li>
            ) : filtered.map((student) => {
              const isDisabled = student.activeRfidCount > 0 && String(student.id) !== String(value);
              const isSelected = String(student.id) === String(value);
              return (
                <li key={student.id} onClick={() => !isDisabled && (onChange(String(student.id)), setOpen(false), setQuery(""))}
                  className={"flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition " + (isDisabled ? "cursor-not-allowed opacity-40" : isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50")}>
                  <span><span className="font-medium">{student.nama}</span><span className="ml-1.5 text-xs text-gray-400">{student.classLabel}</span></span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {isSelected ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> : null}
                    {isDisabled ? <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">sudah ada RFID</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">{filtered.length} siswa ditampilkan · ketik untuk memfilter</div>
        </div>
      ) : null}
    </div>
  );
}

// ─── RFID Form Modal ──────────────────────────────────────────────────────────

function RfidFormModal({ isOpen, onClose, onSubmit, editItem, loading, students }) {
  const [uidRfid, setUidRfid] = useState("");
  const [siswaId, setSiswaId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setUidRfid(editItem?.uid_rfid ?? "");
    setSiswaId(editItem?.siswa_id ? String(editItem.siswa_id) : "");
    setIsActive(editItem?.is_active ?? true);
    setError("");
  }, [isOpen, editItem]);

  const handleClose = () => { if (loading) return; setError(""); onClose(); };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = { uid_rfid: uidRfid.trim(), siswa_id: siswaId.trim(), is_active: isActive };
    if (!payload.uid_rfid) { setError("UID RFID wajib diisi."); return; }
    if (!payload.siswa_id) { setError("Siswa wajib dipilih."); return; }
    try { await onSubmit(payload); handleClose(); } catch (err) { setError(err.message || "Terjadi kesalahan saat menyimpan RFID."); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-gray-100 bg-white shadow-2xl flex flex-col" style={{ maxHeight: "90vh" }}>
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2"><ScanLine className="h-4 w-4 text-blue-600" /></div>
            <h3 className="text-base font-semibold text-gray-800">{editItem ? "Edit RFID" : "Tambah RFID Baru"}</h3>
          </div>
          <button type="button" onClick={handleClose} disabled={loading} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">UID RFID <span className="text-red-500">*</span></label>
              <input value={uidRfid} onChange={(e) => setUidRfid(e.target.value)} placeholder="Contoh: 04A1B2C3D4" className={inputClass} disabled={loading} autoFocus />
            </div>
            <div className="relative">
              <label className="mb-2 block text-sm font-medium text-gray-700">Pilih Siswa <span className="text-red-500">*</span></label>
              <SearchableSelect value={siswaId} onChange={setSiswaId} students={students} disabled={loading} />
              <p className="mt-1.5 text-xs text-gray-400">Siswa yang sudah memiliki RFID aktif tidak bisa dipilih untuk data baru.</p>
            </div>
            {editItem ? (
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} disabled={loading} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">RFID aktif</p>
                  <p className="mt-0.5 text-xs text-gray-400">Nonaktifkan jika kartu sudah tidak dipakai sementara atau diganti.</p>
                </div>
              </label>
            ) : null}
            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />{error}
              </div>
            ) : null}
          </form>
        </div>
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
          <button type="button" onClick={handleClose} disabled={loading} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Batal</button>
          <button type="submit" onClick={handleSubmit} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {editItem ? "Simpan Perubahan" : "Tambah RFID"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
// Import sekarang mengirim file Excel APA ADANYA ke backend (POST /rfid/import),
// yang akan diproses di server oleh xlsx.utils.sheet_to_json dan dicocokkan
// berdasarkan kolom "NISN" (fallback "NIK") + "RFID". Tidak ada parsing/matching
// manual di sisi client lagi, jadi file export siswa lengkap (mis. dari Dapodik)
// yang punya kolom Nama/NISN/NIK/RFID bisa langsung diupload tanpa diedit.

function ImportModal({ onClose, onImportDone }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null); // { inserted, skipped, errors: [{nama,nisn,uid_rfid,reason}] }
  const [importError, setImportError] = useState("");
  const [errorSearch, setErrorSearch] = useState("");
  const fileRef = useRef();

  // Cegah user nutup/refresh tab di tengah proses import
  useEffect(() => {
    if (!importing) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [importing]);

  const parseFile = (f) => {
    setFile(f);
    setResult(null);
    setDone(false);
    setImportError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        setTotalRows(json.length);
        setPreview(json.slice(0, 20));
        setPreviewHeaders(json.length ? Object.keys(json[0]) : []);
      } catch (err) {
        setImportError("Gagal membaca file. Pastikan format .xlsx valid.");
      }
    };
    reader.readAsBinaryString(f);
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) parseFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) parseFile(f); };

  const resetFile = () => {
    setFile(null);
    setPreview([]);
    setPreviewHeaders([]);
    setTotalRows(0);
    setResult(null);
    setDone(false);
    setImportError("");
    setErrorSearch("");
  };

  const startImport = async () => {
    if (!file) return;
    setImporting(true);
    setDone(false);
    setImportError("");
    try {
      const res = await rfidApi.importFile(file);
      if (!res?.success) throw new Error(res?.message || "Import gagal diproses server.");
      setResult(res.data || { inserted: 0, skipped: 0, errors: [] });
      onImportDone();
    } catch (err) {
      setImportError(err.message || "Terjadi kesalahan saat mengimport file.");
    } finally {
      setImporting(false);
      setDone(true);
    }
  };

  const filteredErrors = useMemo(() => {
    const errors = result?.errors || [];
    if (!errorSearch.trim()) return errors;
    const q = errorSearch.toLowerCase().trim();
    return errors.filter((r) =>
      [r.nama, r.nisn, r.uid_rfid, r.reason].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [result, errorSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Import Data RFID</h2>
            <p className="text-blue-200 text-xs mt-0.5">Upload file Excel (.xlsx) — wajib ada kolom: Nama, NISN, NIK, RFID</p>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="text-blue-200 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircleIcon />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!file && (
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-blue-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all group">
              <div className="flex justify-center mb-3 text-blue-400 group-hover:text-blue-600 transition-colors">
                <Upload className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-gray-700">Drop file Excel di sini atau <span className="text-blue-600 underline">pilih file</span></p>
              <p className="text-xs text-gray-400 mt-1">Hanya file .xlsx yang didukung. File export data siswa lengkap juga bisa langsung diupload.</p>
              <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
            </div>
          )}

          {file && !done && !importing && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-700">{file.name} · {totalRows} baris terdeteksi</p>
                <button onClick={resetFile} className="text-xs text-red-500 hover:underline">Ganti file</button>
              </div>
              <div className="overflow-auto max-h-48 border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {previewHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((r, i) => (
                      <tr key={i}>
                        {previewHeaders.map((h) => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{String(r[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalRows > preview.length && (
                <p className="text-[11px] text-gray-400 mt-1.5 text-center">Menampilkan {preview.length} dari {totalRows} baris (pratinjau saja, seluruh baris akan diproses saat import)</p>
              )}
              {importError ? (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{importError}
                </div>
              ) : null}
            </div>
          )}

          {(importing || done) && (
            <div className="space-y-3">
              {importing ? (
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Mengupload dan memproses file di server, mohon tunggu...
                </div>
              ) : null}

              {done && importError ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{importError}
                </div>
              ) : null}

              {done && result ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <InfoStatCard label="Berhasil" value={result.inserted} helper="Data RFID baru tersimpan" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                    <InfoStatCard label="Dilewati" value={result.skipped} helper="UID RFID sudah terdaftar" icon={<ShieldBan className="h-5 w-5" />} tone="amber" />
                    <InfoStatCard label="Error" value={result.errors?.length || 0} helper="Baris gagal, perlu dicek" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
                  </div>
                  {result.errors && result.errors.length > 0 ? (
                    <>
                      <input
                        type="text"
                        value={errorSearch}
                        onChange={(e) => setErrorSearch(e.target.value)}
                        placeholder="Cari nama, NISN, UID, atau alasan error..."
                        className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                        {filteredErrors.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                            <span className="text-red-500"><XCircleIcon /></span>
                            <span className="font-mono font-medium text-gray-800 shrink-0">{r.nisn || "-"}</span>
                            <span className="text-gray-600 flex-1 truncate">{r.nama || "-"}</span>
                            <span className="text-xs text-red-500 text-right max-w-xs">{r.reason}</span>
                          </div>
                        ))}
                        {filteredErrors.length === 0 ? (
                          <div className="p-4 text-center text-xs text-gray-400">Tidak ada hasil pencarian yang cocok</div>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
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
            {!done && (
              <button
                onClick={startImport}
                disabled={!file || importing}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                {importing ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Mengimport...</>
                ) : "Mulai Import"}
              </button>
            )}
            {done && (result?.errors?.length > 0) && (
              <button
                onClick={resetFile}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                Upload File Lain
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Update Modal ─────────────────────────────────────────────────────────────

function UpdateModal({ onClose, onUpdateDone, students, rfidRows }) {
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

  const startUpdate = async (isRetry = false) => {
    let currentRows = rows;
    if (isRetry) {
      currentRows = rows.filter((_, idx) => !results[idx] || !results[idx].ok);
      setRows(currentRows);
    }
    if (!currentRows.length) return;
    setUpdating(true);
    setDone(false);

    const newResults = new Array(currentRows.length);
    const toProcess = [];

    currentRows.forEach((row, idx) => {
      const uid = String(row["UID RFID"] || "").trim();
      const namaSiswa = String(row["Nama Siswa"] || "").trim();
      
      let isActive = true;
      const rawActive = row["Status Aktif (TRUE/FALSE)"];
      if (rawActive !== undefined && rawActive !== null && rawActive !== "") {
        const str = String(rawActive).trim().toUpperCase();
        if (str === "FALSE" || str === "0" || str === "N" || str === "NONAKTIF") {
          isActive = false;
        }
      }

      if (!uid) {
        newResults[idx] = { uid: "?", nama: "?", ok: false, msg: "UID RFID wajib diisi sebagai key update" };
        return;
      }

      // Cari RFID berdasarkan UID di rfidRows
      const existingRfid = rfidRows.find((r) => String(r.uid_rfid).toLowerCase() === uid.toLowerCase());
      if (!existingRfid) {
        newResults[idx] = { uid, nama: namaSiswa || "?", ok: false, msg: `RFID dengan UID "${uid}" tidak ditemukan` };
        return;
      }

      let siswaId = existingRfid.siswa_id;
      let studentName = existingRfid.siswa?.nama || "Siswa";
      if (namaSiswa) {
        const matched = students.find((s) => s.nama.toLowerCase() === namaSiswa.toLowerCase());
        if (!matched) {
          newResults[idx] = { uid, nama: namaSiswa, ok: false, msg: `Siswa "${namaSiswa}" tidak ditemukan` };
          return;
        }
        siswaId = matched.id;
        studentName = matched.nama;
      }

      const hasChanged =
        existingRfid.siswa_id !== siswaId ||
        existingRfid.is_active !== isActive;

      if (!hasChanged) {
        newResults[idx] = { uid, nama: studentName, ok: false, msg: "Data sama dengan sebelumnya (tidak ada perubahan)" };
        return;
      }

      toProcess.push({ idx, rfidId: existingRfid.id, uid, siswaId, is_active: isActive, studentName });
    });

    const preDone = currentRows.length - toProcess.length;
    setProgress({ current: preDone, total: currentRows.length });
    setResults(newResults.filter(Boolean));

    await runWithConcurrency(
      toProcess,
      CONCURRENCY,
      async ({ idx, rfidId, uid, siswaId, is_active, studentName }) => {
        try {
          const result = await rfidApi.update(rfidId, { uid_rfid: uid, siswa_id: siswaId, is_active });
          const entry = { uid, nama: studentName, ok: result?.success ?? false, msg: result?.message || "" };
          newResults[idx] = entry;
          return entry;
        } catch (err) {
          const entry = { uid, nama: studentName, ok: false, msg: err.message };
          newResults[idx] = entry;
          return entry;
        }
      },
      (doneCount) => {
        setProgress({ current: preDone + doneCount, total: currentRows.length });
        setResults(newResults.filter(Boolean));
      }
    );

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
        r.nama?.toLowerCase().includes(q) ||
        r.uid?.toLowerCase().includes(q) ||
        r.msg?.toLowerCase().includes(q)
    );
  }, [results, resultSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Update Data RFID</h2>
            <p className="text-emerald-200 text-xs mt-0.5">Upload file Excel (.xlsx) — UID RFID sebagai key update</p>
          </div>
          <button
            onClick={onClose}
            disabled={updating}
            className="text-emerald-200 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <XCircleIcon />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {!rows.length && (
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-emerald-200 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all group">
              <div className="flex justify-center mb-3 text-emerald-400 group-hover:text-emerald-600 transition-colors">
                <Upload className="h-8 w-8" />
              </div>
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
                    <tr>
                      {UPDATE_HEADERS.map((k) => (
                        <th key={k} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.slice(0, previewLimit).map((r, i) => (
                      <tr key={i}>
                        {UPDATE_HEADERS.map((h) => (
                          <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap font-mono">{String(r[h] ?? "")}</td>
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
                <InfoStatCard label="Berhasil" value={successCount} helper="Data RFID berhasil diupdate" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" />
                <InfoStatCard label="Gagal" value={failCount} helper="Baris gagal yang perlu dicek lagi" icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={resultSearch}
                  onChange={(e) => setResultSearch(e.target.value)}
                  placeholder="Cari UID, nama, atau status hasil log..."
                  className="w-full text-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="overflow-auto max-h-44 border border-gray-200 rounded-lg divide-y divide-gray-100">
                {filteredResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-sm">
                    <span className={r.ok ? "text-green-500" : "text-red-500"}>
                      {r.ok ? <CheckCircleIcon /> : <XCircleIcon />}
                    </span>
                    <span className="font-mono font-medium text-gray-800 shrink-0">{r.uid}</span>
                    <span className="text-gray-600 flex-1 truncate">{r.nama}</span>
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
                onClick={() => startUpdate(true)}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
              >
                Retry Gagal
              </button>
            )}
            {!done && (
              <button
                onClick={() => startUpdate(false)}
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

// ─── Skeleton & Helpers ───────────────────────────────────────────────────────

function SkeletonRow({ delay = 0 }) {
  return (
    <tr className="border-b border-gray-50">
      {[32, 140, 180, 120, 110, 120].map((width, index) => (
        <td key={index} className="px-6 py-4.5">
          <div className="h-3.5 animate-pulse rounded-lg bg-gray-100" style={{ width, animationDelay: `${delay}ms` }} />
        </td>
      ))}
    </tr>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function normalizeStudents(items = []) {
  return items.map((student) => ({
    id: student.id,
    nama: student.nama,
    NIPD: student.NIPD,
    NISN: student.NISN,
    classLabel: student.kelas
      ? `${student.kelas.kelas}${student.kelas.jurusan ? ` ${student.kelas.jurusan}` : ""}` : "-",
    activeRfidCount: Array.isArray(student.rfid) ? student.rfid.filter((item) => item?.is_active).length : 0,
  }));
}

function getStatusBadge(isActive) {
  return isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RfidManagement() {
  const [pageRfidRows, setPageRfidRows] = useState([]);
  const [rfidRows, setRfidRows] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const searchRef = useRef(null);
  const templateRef = useRef(null);
  const exportRef = useRef(null);
  const addRef = useRef(null);
  const pageSize = 10;
  const normalizedSearch = search.trim().toLowerCase();

  const showToast = useCallback((message, type = "success") => setToast({ message, type }), []);

  const fetchStudents = useCallback(async () => {
    const res = await siswaApi.list("page=1&limit=1000");
    if (!res?.success) throw new Error(res?.message || "Gagal memuat daftar siswa.");
    setStudentOptions(normalizeStudents(res.data || []));
  }, []);

  const fetchPageRfid = useCallback(async (targetPage) => {
    setFetchLoading(true);
    setFetchError("");
    try {
      const res = await rfidApi.list(`page=${targetPage}&limit=${pageSize}`);
      if (!res?.success) throw new Error(res?.message || "Gagal memuat data RFID.");
      setPageRfidRows(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages || 1);
        setTotalRecords(res.pagination.total || 0);
      }
    } catch (err) {
      setFetchError(err.message || "Gagal memuat data RFID.");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  const fetchRfidBackground = useCallback(async () => {
    setBackgroundLoading(true);
    try {
      const res = await rfidApi.list("page=1&limit=10000");
      if (res?.success) {
        setRfidRows(res.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat background RFID:", err);
    } finally {
      setBackgroundLoading(false);
    }
  }, []);

  useEffect(() => { fetchStudents().catch((err) => showToast(err.message || "Gagal memuat daftar siswa.", "error")); }, [fetchStudents, showToast]);
  useEffect(() => { fetchPageRfid(page); }, [fetchPageRfid, page]);
  useEffect(() => { fetchRfidBackground(); }, [fetchRfidBackground]);
  useEffect(() => { setPage(1); }, [search]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
      if (addRef.current && !addRef.current.contains(e.target)) setShowAddMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredRows = useMemo(() => {
    if (!normalizedSearch) return rfidRows;
    return rfidRows.filter((item) => {
      const kelasLabel = item.siswa?.kelas
        ? `${item.siswa.kelas.kelas} ${item.siswa.kelas.jurusan || ""}`.trim() : "";
      return [item.uid_rfid, item.siswa?.nama, kelasLabel, item.siswa?.id ? String(item.siswa.id) : ""]
        .filter(Boolean).some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [rfidRows, normalizedSearch]);

  const pagedRows = useMemo(() => {
    if (normalizedSearch) {
      const start = (page - 1) * pageSize;
      return filteredRows.slice(start, start + pageSize);
    }
    return pageRfidRows;
  }, [filteredRows, page, pageRfidRows, normalizedSearch]);

  const effectivePagination = useMemo(() => {
    if (normalizedSearch) {
      const total = filteredRows.length;
      const totalPagesVal = Math.max(1, Math.ceil(total / pageSize));
      return { page, limit: pageSize, total, totalPages: totalPagesVal };
    }
    return { page, limit: pageSize, total: totalRecords, totalPages };
  }, [filteredRows.length, page, totalRecords, totalPages, normalizedSearch]);

  const stats = useMemo(() => {
    const active = rfidRows.filter((item) => item.is_active).length;
    const inactive = rfidRows.length - active;
    const assigned = rfidRows.filter((item) => item.siswa?.id).length;
    return { total: rfidRows.length || totalRecords, active, inactive, assigned };
  }, [rfidRows, totalRecords]);

  const handleRefresh = async () => {
    await Promise.all([fetchPageRfid(page), fetchRfidBackground(), fetchStudents().catch((err) => showToast(err.message || "Gagal memuat daftar siswa.", "error"))]);
  };

  const handleSubmit = async (payload) => {
    setSubmitLoading(true);
    try {
      let res;
      if (editItem) {
        res = await rfidApi.update(editItem.id, payload);
      } else {
        res = await rfidApi.create({ uid_rfid: payload.uid_rfid, siswa_id: payload.siswa_id });
      }
      if (!res?.success) throw new Error(res?.message || "Gagal menyimpan data RFID.");
      showToast(editItem ? "Data RFID berhasil diperbarui." : "RFID baru berhasil ditambahkan.");
      await handleRefresh();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleteLoading(true);
    try {
      const res = await rfidApi.delete(confirmDelete.id);
      if (!res?.success) throw new Error(res?.message || "Gagal menghapus data RFID.");
      showToast("Data RFID berhasil dihapus.");
      setConfirmDelete(null);
      await handleRefresh();
    } catch (err) {
      showToast(err.message || "Gagal menghapus data RFID.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const summaryText = pagedRows.length === 0
    ? "Belum ada data RFID untuk ditampilkan"
    : normalizedSearch
      ? backgroundLoading
        ? "Memuat data pencarian..."
        : `Menampilkan ${pagedRows.length} hasil pencarian dari ${filteredRows.length} data, total seluruh RFID ${stats.total}`
      : `Menampilkan ${pagedRows.length} data dari total ${totalRecords} RFID`;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-50/60">
      <PageHeader
        title="Manajemen RFID"
        subtitle="Kelola kartu RFID siswa, status keaktifan, dan distribusinya ke tiap siswa."
      />

      <div className="flex-1 overflow-auto p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoStatCard label="Total RFID" value={stats.total} helper="Seluruh data RFID yang sedang tampil" icon={<ScanLine className="h-5 w-5" />} tone="blue" loading={fetchLoading} />
          <InfoStatCard label="RFID Aktif" value={stats.active} helper="Siap digunakan untuk absensi" icon={<CheckCircle2 className="h-5 w-5" />} tone="emerald" loading={fetchLoading} />
          <InfoStatCard label="RFID Nonaktif" value={stats.inactive} helper="Perlu dicek atau diaktifkan kembali" icon={<ShieldBan className="h-5 w-5" />} tone="amber" loading={fetchLoading} />
          <InfoStatCard label="Terhubung ke Siswa" value={stats.assigned} helper="Sudah punya pasangan siswa" icon={<UserRound className="h-5 w-5" />} tone="teal" loading={fetchLoading} />
        </div>

        {/* Table Card */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Title */}
              <div>
                <h3 className="font-semibold text-gray-800">Daftar RFID</h3>
                <p className="mt-0.5 text-xs text-gray-400">
                  {fetchLoading && !search.trim() ? "Memuat data..." : (
                    search.trim() ? (
                      backgroundLoading ? "Memuat data pencarian..." : `${filteredRows.length} hasil pencarian ditemukan`
                    ) : `${totalRecords} data RFID tersedia`
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari UID, nama siswa, atau kelas..."
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-8 pr-8 text-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-64"
                  />
                  {search ? (
                    <button type="button" onClick={() => { setSearch(""); searchRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Template Dropdown */}
                <div className="relative" ref={templateRef}>
                  <button
                    type="button"
                    onClick={() => { setShowTemplateMenu(!showTemplateMenu); setShowExportMenu(false); }}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh Template
                  </button>
                  {showTemplateMenu && (
                    <div className="absolute right-0 mt-1 w-52 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-20 animate-in fade-in-50 duration-150">
                      <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Import Baru</p>
                      <button
                        onClick={() => { downloadExcelTemplate(); setShowTemplateMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Template Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => { downloadPdfTemplate(); setShowTemplateMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <FileText className="h-4 w-4 text-red-500" />
                        Template PDF
                      </button>
                      <div className="border-t border-gray-100 my-1" />
                      <p className="px-4 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Update Data</p>
                      <button
                        onClick={() => { downloadUpdateExcelTemplate(); setShowTemplateMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Template Update (.xlsx)
                      </button>
                      <button
                        onClick={() => { downloadUpdatePdfTemplate(); setShowTemplateMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 pb-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <FileText className="h-4 w-4 text-red-500" />
                        Template Update (PDF)
                      </button>
                    </div>
                  )}
                </div>

                {/* Export Dropdown */}
                <div className="relative" ref={exportRef}>
                  <button
                    type="button"
                    onClick={() => { setShowExportMenu(!showExportMenu); setShowTemplateMenu(false); }}
                    className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export Data
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-1 w-52 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-20">
                      <button
                        onClick={() => { exportTableExcel(filteredRows); setShowExportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-green-600" />
                        Export Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => { exportTablePdf(filteredRows); setShowExportMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <FileText className="h-4 w-4 text-red-500" />
                        Export PDF
                      </button>
                    </div>
                  )}
                </div>

                {/* Tambah RFID Dropdown */}
                <div className="relative" ref={addRef}>
                  <button
                    type="button"
                    onClick={() => { setShowAddMenu(!showAddMenu); setShowTemplateMenu(false); setShowExportMenu(false); }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah RFID
                    <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${showAddMenu ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showAddMenu && (
                    <div className="absolute right-0 mt-1 w-52 rounded-xl border border-gray-100 bg-white shadow-lg overflow-hidden z-20">
                      <button
                        onClick={() => { setEditItem(null); setShowModal(true); setShowAddMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <ScanLine className="h-4 w-4 text-blue-600" />
                        Tambah Manual
                      </button>
                      <button
                        onClick={() => { setShowImportModal(true); setShowAddMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition"
                      >
                        <Upload className="h-4 w-4 text-green-600" />
                        Import Excel
                      </button>
                      <button
                        onClick={() => { setShowUpdateModal(true); setShowAddMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        <Upload className="h-4 w-4 text-emerald-600" />
                        Update Excel
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
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["No", "UID RFID", "Siswa", "Kelas", "Status", "Aksi"].map((label) => (
                    <th key={label} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fetchLoading ? (
                  Array.from({ length: 5 }).map((_, index) => <SkeletonRow key={index} delay={index * 60} />)
                ) : fetchError ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-red-500">
                        <div className="rounded-full bg-red-50 p-3"><AlertTriangle className="h-6 w-6" /></div>
                        <p className="text-sm font-medium">{fetchError}</p>
                        <button type="button" onClick={() => fetchPageRfid(page)} className="rounded-xl border border-red-200 px-4 py-2 text-xs text-red-600 hover:bg-red-50">Coba Lagi</button>
                      </div>
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="rounded-full bg-gray-50 p-4">
                          {search ? <Search className="h-6 w-6" /> : <ScanLine className="h-6 w-6" />}
                        </div>
                        <p className="text-sm font-medium text-gray-500">
                          {search ? `Tidak ada RFID yang cocok dengan "${search}".` : "Belum ada data RFID. Tambahkan data pertama."}
                        </p>
                        {search ? <button type="button" onClick={() => setSearch("")} className="text-xs text-blue-600 hover:underline">Hapus pencarian</button> : null}
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((item, index) => {
                    const rowNumber = ((effectivePagination.page - 1) * effectivePagination.limit) + index + 1;
                    const kelasLabel = item.siswa?.kelas
                      ? `${item.siswa.kelas.kelas}${item.siswa.kelas.jurusan ? ` ${item.siswa.kelas.jurusan}` : ""}` : "-";
                    return (
                      <tr key={item.id} className="transition-colors duration-100 hover:bg-blue-50/20">
                        <td className="px-6 py-4 font-mono text-sm text-gray-400">{rowNumber}</td>
                        <td className="px-6 py-4">
                          <div className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 font-mono text-xs text-white">{item.uid_rfid}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{item.siswa?.nama || "-"}</p>
                            <p className="mt-0.5 text-xs text-gray-400">ID Siswa: {item.siswa?.id || "-"}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{kelasLabel}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadge(item.is_active)}`}>
                            {item.is_active ? <CheckCircle2 className="h-3 w-3" /> : <ShieldBan className="h-3 w-3" />}
                            {item.is_active ? "Aktif" : "Nonaktif"}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Tooltip text="Edit RFID">
                              <button type="button" onClick={() => { setEditItem(item); setShowModal(true); }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 transition hover:border-gray-300 hover:bg-gray-50">
                                <Pencil className="h-3.5 w-3.5" />Edit
                              </button>
                            </Tooltip>
                            <Tooltip text="Hapus RFID">
                              <button type="button" onClick={() => setConfirmDelete(item)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 transition hover:border-red-300 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />Hapus
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={effectivePagination.page}
            totalPages={effectivePagination.totalPages}
            onPageChange={setPage}
            summary={summaryText}
            className="border-gray-100 bg-gray-50/50"
          />
        </div>
      </div>

      {/* Modals */}
      <RfidFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditItem(null); }}
        onSubmit={handleSubmit}
        editItem={editItem}
        loading={submitLoading}
        students={studentOptions}
      />

      <ConfirmDialog
        isOpen={!!confirmDelete}
        item={confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImportDone={handleRefresh}
        />
      )}

      {showUpdateModal && (
        <UpdateModal
          onClose={() => setShowUpdateModal(false)}
          onUpdateDone={handleRefresh}
          students={studentOptions}
          rfidRows={rfidRows}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}