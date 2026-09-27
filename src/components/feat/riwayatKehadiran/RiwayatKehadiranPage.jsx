import { useState, useEffect, useMemo } from "react";
import { absensiSiswa, auth } from "../../../lib/backendApi";
import PageHeader from "../../layout/PageHeader.jsx";
import {
  RefreshCw,
  CalendarDays,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function formatTimeShort(val) {
  if (!val) return "-";
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    });
  }
  if (typeof val === "string" && val.length <= 8) return val.slice(0, 5);
  return "-";
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ROWS_PER_PAGE = 10;

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "HADIR",     label: "Hadir",     color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "TERLAMBAT", label: "Terlambat", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "IZIN",      label: "Izin",      color: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "SAKIT",     label: "Sakit",     color: "bg-purple-50 text-purple-700 border-purple-200" },
  { value: "ALPHA",     label: "Alpha",     color: "bg-red-50 text-red-700 border-red-200" },
];

function resolveStatus(row) {
  return String(row.status_final || row.status_tapin || row.status || "").toUpperCase();
}

// Normalise ke key yang sama dengan STATUS_OPTIONS
function normalizeStatusKey(raw) {
  if (raw === "TEPAT_WAKTU" || raw === "HADIR") return "HADIR";
  return raw;
}

function getStatusBadge(raw) {
  const key = normalizeStatusKey(raw);
  const opt = STATUS_OPTIONS.find((o) => o.value === key);
  if (opt && opt.value) {
    return { label: opt.label, color: `${opt.color} border` };
  }
  return { label: raw || "-", color: "bg-gray-100 text-gray-600 border border-gray-200" };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function RiwayatKehadiranPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [studentInfo, setStudentInfo] = useState({ nama: "Siswa", kelas: "", jurusan: "" });

  // Filter state (pending — belum di-apply)
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Active filter (sudah di-apply)
  const [activeFilter, setActiveFilter] = useState({ from: "", to: "", status: "" });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const todayWIB = getTodayWIB();

  // ── Load student info ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem("user");
        if (raw) applyStudentInfo(JSON.parse(raw));
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const res = await auth.me();
        if (res?.success) {
          const u = res.data?.user || res.data;
          applyStudentInfo(u);
          try { localStorage.setItem("user", JSON.stringify(u)); } catch (_) {}
        }
      } catch (e) {
        console.debug("Failed to load user info:", e);
      }
    })();
  }, []);

  function applyStudentInfo(u) {
    const s = u?.siswa;
    const k = s?.kelas;
    setStudentInfo({
      id: s?.id || u?.id || "",
      nama: s?.nama || u?.username || "Siswa",
      kelas: k?.kelas || "",
      jurusan: k?.jurusan || "",
    });
  }

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const rekapRes = await absensiSiswa.rekapSaya("limit=200");
      if (rekapRes?.success && rekapRes.data?.riwayat) {
        setAttendanceHistory(rekapRes.data.riwayat);
      } else {
        setAttendanceHistory([]);
      }
    } catch (e) {
      console.debug("Rekap siswa error:", e);
      setAttendanceHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Filter Logic ───────────────────────────────────────────────────────────
  const filteredHistory = useMemo(() => {
    return attendanceHistory.filter((row) => {
      const tanggal = row.tanggal ? row.tanggal.slice(0, 10) : "";
      if (activeFilter.from && tanggal < activeFilter.from) return false;
      if (activeFilter.to   && tanggal > activeFilter.to)   return false;
      if (activeFilter.status) {
        const key = normalizeStatusKey(resolveStatus(row));
        if (key !== activeFilter.status) return false;
      }
      return true;
    });
  }, [attendanceHistory, activeFilter]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / ROWS_PER_PAGE));
  const pagedHistory = filteredHistory.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  function applyFilter() {
    setActiveFilter({ from: filterFrom, to: filterTo, status: filterStatus });
    setCurrentPage(1);
  }

  function resetFilter() {
    setFilterFrom("");
    setFilterTo("");
    setFilterStatus("");
    setActiveFilter({ from: "", to: "", status: "" });
    setCurrentPage(1);
  }

  const isFilterActive = activeFilter.from || activeFilter.to || activeFilter.status;

  // Active filter labels
  const activeStatusOpt = STATUS_OPTIONS.find((o) => o.value === activeFilter.status);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70 font-[Poppins]">
        <PageHeader title="Riwayat Kehadiran" subtitle="Catatan lengkap presensi RFID siswa" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="bg-white rounded-2xl border border-gray-200/70 shadow-xs p-6 animate-pulse h-64" />
        </main>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70 font-[Poppins]">
      <PageHeader
        title="Riwayat Kehadiran"
        subtitle={`Catatan lengkap presensi RFID${studentInfo.kelas ? ` — ${studentInfo.kelas}${studentInfo.jurusan ? ` ${studentInfo.jurusan}` : ""}` : ""}`}
        right={
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200/90 rounded-xl text-xs font-semibold text-gray-700 shadow-xs transition cursor-pointer disabled:opacity-60"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : "text-gray-500"}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ─── Filter + Table ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-xs overflow-hidden">

          {/* Card Header Filter Controls */}
          <div className="p-3 sm:p-4 border-b border-gray-100 bg-white">
            <div className="flex flex-wrap items-end gap-2">

              {/* Tanggal Dari */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Dari</label>
                <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <CalendarDays className="w-3 h-3 text-gray-400 shrink-0" />
                  <input
                    type="date"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    max={filterTo || todayWIB}
                    className="text-[11px] text-gray-700 bg-transparent outline-none cursor-pointer w-28"
                  />
                </div>
              </div>

              {/* Tanggal Sampai */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Sampai</label>
                <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <CalendarDays className="w-3 h-3 text-gray-400 shrink-0" />
                  <input
                    type="date"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                    min={filterFrom || undefined}
                    max={todayWIB}
                    className="text-[11px] text-gray-700 bg-transparent outline-none cursor-pointer w-28"
                  />
                </div>
              </div>

              {/* Filter Status */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide">Status</label>
                <div className="flex items-center gap-1 bg-slate-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <Filter className="w-3 h-3 text-gray-400 shrink-0" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="text-[11px] text-gray-700 bg-transparent outline-none cursor-pointer pr-1"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tombol aksi */}
              <div className="flex items-end gap-1.5">
                <button
                  onClick={applyFilter}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 border border-blue-600 hover:border-blue-700 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer shadow-xs"
                >
                  <Filter className="w-3 h-3" />
                  Filter
                </button>

                {isFilterActive && (
                  <button
                    onClick={resetFilter}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-[11px] font-medium transition cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filter Banner */}
          {isFilterActive && (
            <div className="px-5 sm:px-6 py-2 bg-blue-50 border-b border-blue-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-blue-700">
              <Filter className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium">Filter aktif:</span>
              {(activeFilter.from || activeFilter.to) && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {activeFilter.from ? <strong>{formatDateLabel(activeFilter.from)}</strong> : <span className="text-blue-400">awal</span>}
                  {" — "}
                  {activeFilter.to ? <strong>{formatDateLabel(activeFilter.to)}</strong> : <span className="text-blue-400">sekarang</span>}
                </span>
              )}
              {activeFilter.status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${activeStatusOpt?.color || "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {activeStatusOpt?.label || activeFilter.status}
                </span>
              )}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Tap In</th>
                  <th className="py-3 px-4">Tap Out</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagedHistory.length > 0 ? (
                  pagedHistory.map((row, i) => {
                    const tanggalStr = row.tanggal ? row.tanggal.slice(0, 10) : "";
                    const isFuture   = tanggalStr > todayWIB;
                    const rawStatus  = resolveStatus(row);
                    const badge      = getStatusBadge(rawStatus);
                    const rowNum     = (currentPage - 1) * ROWS_PER_PAGE + i + 1;

                    return (
                      <tr
                        key={row.id || i}
                        className={`transition-colors ${
                          isFuture ? "opacity-40 bg-slate-50/80 pointer-events-none select-none" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-400">{rowNum}</td>

                        <td className="py-3 px-4 font-medium text-gray-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {formatDateLabel(tanggalStr)}
                            {isFuture && (
                              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-slate-200 text-slate-500 uppercase tracking-wide">
                                Akan Datang
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-gray-700">{formatTimeShort(row.tap_in)}</td>
                        <td className="py-3 px-4 font-mono text-gray-700">{formatTimeShort(row.tap_out)}</td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-gray-500 max-w-xs truncate">
                          {row.keterangan || row.catatan || "-"}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <CalendarDays className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-500">
                        {isFilterActive ? "Tidak ada data yang cocok dengan filter ini" : "Belum ada riwayat kehadiran"}
                      </p>
                      {isFilterActive && (
                        <button
                          onClick={resetFilter}
                          className="mt-3 text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                          Reset filter untuk melihat semua data
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Halaman {currentPage} dari {totalPages} · {filteredHistory.length} data
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let page;
                  if (totalPages <= 5)              page = idx + 1;
                  else if (currentPage <= 3)        page = idx + 1;
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + idx;
                  else                              page = currentPage - 2 + idx;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        currentPage === page
                          ? "bg-blue-600 text-white shadow-xs"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
