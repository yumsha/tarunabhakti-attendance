import { useState, useEffect, useCallback, useRef } from "react";
import { detailAbsensi, jadwal, statusRequest } from "../../lib/backendApi.js";
import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import { ChevronDown } from "lucide-react";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

// Tanggal hari ini (WIB) — digunakan sebagai batas max date picker
const TODAY_WIB = getTodayWIB();
const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
function getTodayHari() { return HARI_MAP[new Date().getDay()]; }
function getUserFromStorage() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}
function resolveRoles(userData) {
  const fromRoles = Array.isArray(userData?.roles)
    ? userData.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean) : [];
  const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
  const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
  const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];
  return Array.from(new Set(
    [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
      .filter(Boolean).map((i) => String(i).toUpperCase())
      .map((i) => (i === "WALI KELAS" ? "WALAS" : i))
  ));
}
function normalizeKelas(items = []) {
  return items.map((item) => {
    if (item?.kelas && typeof item.kelas === "object")
      return { id: item.kelas.id, kelas: item.kelas.kelas, jurusan: item.kelas.jurusan || "" };
    return { id: item?.id, kelas: item?.kelas || item?.nama_kelas || "", jurusan: item?.jurusan || "" };
  }).filter((i) => i.id != null)
    .filter((i, idx, self) => idx === self.findIndex((c) => c.id === i.id));
}
function formatClassName(cls) {
  if (!cls) return "";
  return `${cls.kelas} ${cls.jurusan || ""}`.trim();
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "HADIR",  label: "Hadir",  cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { value: "IZIN",   label: "Izin",   cls: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  { value: "SAKIT",  label: "Sakit",  cls: "bg-purple-100 text-purple-700",   dot: "bg-purple-500"  },
  { value: "ALPHA",  label: "Alpha",  cls: "bg-red-100 text-red-700",         dot: "bg-red-500"     },
];
function normalizeStatusCode(value) {
  if (!value) return "";
  const normalized = String(value).trim();
  const upper = normalized.toUpperCase();

  const matchedByCode = STATUS_OPTIONS.find((o) => o.value === upper);
  if (matchedByCode) return matchedByCode.value;

  const matchedByLabel = STATUS_OPTIONS.find((o) => o.label.toUpperCase() === upper);
  if (matchedByLabel) return matchedByLabel.value;

  return "ALPHA";
}

function getStatusApiValue(value) {
  const statusCode = normalizeStatusCode(value);
  return STATUS_OPTIONS.find((o) => o.value === statusCode)?.label ?? value;
}

function getStatusConfig(value) {
  const statusCode = normalizeStatusCode(value);
  return STATUS_OPTIONS.find((o) => o.value === statusCode)
    ?? { label: value || "-", cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
}

function StatusTapBadge({ status }) {
  if (!status) return <span className="text-gray-300 text-xs">-</span>;
  const map = {
    TEPAT_WAKTU: { label: "Tepat Waktu", cls: "bg-emerald-100 text-emerald-700" },
    TERLAMBAT:   { label: "Terlambat",   cls: "bg-amber-100 text-amber-700"     },
    Tepat_Waktu: { label: "Tepat Waktu", cls: "bg-emerald-100 text-emerald-700" },
    Terlambat:   { label: "Terlambat",   cls: "bg-amber-100 text-amber-700"     },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

function StatusDropdown({ currentStatus, rowState, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  const current = getStatusConfig(currentStatus);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
    });
  }, [open]);

  if (rowState === "pending") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Menunggu Walas…
      </span>
    );
  }
  if (rowState === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
        {current.label}
        <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (rowState === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        Gagal — coba lagi
      </span>
    );
  }

  return (
    <>
      <div className="relative inline-block text-left">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition
            ${current.cls} border-current/20 hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
          {current.label}
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Portal-style dropdown positioned absolutely on viewport */}
          <div
            ref={dropdownRef}
            className="fixed bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden py-1 w-36"
            style={{
              top: `${dropdownPos.top}px`,
              left: `${dropdownPos.left}px`,
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setOpen(false); onSelect(opt.value); }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 transition
                  ${opt.value === currentStatus ? "font-semibold" : "font-normal"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${opt.dot}`} />
                <span className={opt.value === currentStatus ? opt.cls.split(" ")[1] : "text-gray-700"}>
                  {opt.label}
                </span>
                {opt.value === currentStatus && (
                  <svg className="w-3 h-3 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

StatusDropdown.propTypes = {};

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-3">
        <div className="h-4 bg-gray-100 rounded-full animate-pulse" />
      </td>
    </tr>
  );
}

export default function KehadiranTableV2() {
  const [isMounted, setIsMounted] = useState(false);
  const [classList, setClassList] = useState([]);
  const [kelasId, setKelasId] = useState("");
  const [tanggal, setTanggal] = useState(getTodayWIB());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  // rowState: map siswa_id → "idle"|"pending"|"approved"|"error"
  const [rowState, setRowState] = useState({});
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setIsMounted(true);
    const searchParams = new URLSearchParams(window.location.search);
    setKelasId(searchParams.get("kelasId") || "");
  }, []);

  const user = isMounted ? getUserFromStorage() : null;
  const guruId = user?.guru?.id ?? null;
  const roles = isMounted ? resolveRoles(user) : [];
  const isGuru = roles.includes("GURU");
  const isWalas = roles.includes("WALAS");
  const canViewAttendance = isMounted ? (isGuru || isWalas) : false;

  useEffect(() => {
    if (!isMounted || !canViewAttendance || !guruId) { setClassList([]); return; }
    const loadClasses = async () => {
      try {
        const res = await jadwal.list(`hari=${getTodayHari()}&guru_id=${guruId}`);
        if (!res?.success) return;
        const normalizedList = normalizeKelas(res.data ?? []);
        setClassList(normalizedList);
        setKelasId((cur) => {
          if (cur && normalizedList.some((cls) => String(cls.id) === String(cur))) return cur;
          return String(normalizedList[0]?.id ?? "");
        });
      } catch (err) { console.error("Failed to load kelas", err); }
    };
    loadClasses();
  }, [canViewAttendance, guruId, isMounted]);

  const fetchRows = useCallback(async () => {
    if (!canViewAttendance || !kelasId || !tanggal) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ kelas_id: kelasId, tanggal });
      const res = await detailAbsensi.pratinjauWalas(params.toString());
      setRows(res.data?.daftar_siswa ?? []);
      setRowState({});
    } catch (err) { console.error("Failed to load kehadiran", err); setRows([]); }
    finally { setLoading(false); }
  }, [canViewAttendance, kelasId, tanggal]);

  useEffect(() => { setPage(1); fetchRows(); }, [fetchRows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // Called when GURU picks a status from the dropdown
  const handleStatusChange = async (row, newStatus) => {
    if (!guruId) { alert("Informasi guru tidak ditemukan."); return; }
    const sid = row.siswa_id;
    const currentStatus = normalizeStatusCode(row._pending_status || row.status_saat_ini || row.status_rekomendasi || (row.tap_in ? "HADIR" : "ALPHA"));
    if (newStatus === currentStatus) return; // nothing changed

    setRowState((prev) => ({ ...prev, [sid]: "pending" }));
    try {
      const res = await statusRequest.create({
        guru_id: guruId,
        siswa_id: sid,
        kelas_id: parseInt(kelasId),
        tanggal,
        status_baru: getStatusApiValue(newStatus),
      });
      if (!res?.success) throw new Error(res?.message || "Gagal mengirim permintaan");

      // optimistic update – mark as pending (walas must approve)
      setRowState((prev) => ({ ...prev, [sid]: "pending" }));
      setRows((prev) =>
        prev.map((r) => r.siswa_id === sid ? { ...r, _pending_status: newStatus } : r)
      );
    } catch (err) {
      console.error("Status request error:", err);
      setRowState((prev) => ({ ...prev, [sid]: "error" }));
      setTimeout(() => setRowState((prev) => ({ ...prev, [sid]: "idle" })), 3000);
    }
  };

  const selectedKelas = classList.find((cls) => String(cls.id) === String(kelasId));

  if (!isMounted) return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Daftar Kehadiran" subtitle="Memuat..." />
    </main>
  );

  if (!canViewAttendance) return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader title="Daftar Kehadiran" subtitle="Halaman ini hanya bisa diakses oleh guru." />
      <div className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Role ini tidak dapat mengakses halaman daftar kehadiran.
        </div>
      </div>
    </main>
  );

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title={selectedKelas ? `Kehadiran ${formatClassName(selectedKelas)}` : "Daftar Kehadiran"}
        subtitle={`Kehadiran siswa dari kelas ${formatClassName(selectedKelas)}`}
      />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {classList.length > 1 && (
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <select
                value={kelasId}
                onChange={(e) => setKelasId(e.target.value)}
                className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
              >
                {classList.map((cls) => (
                  <option key={cls.id} value={String(cls.id)}>{formatClassName(cls)}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div className="text-sm text-gray-500">Tanggal</div>
            <input
              type="date"
              value={tanggal}
              max={TODAY_WIB}
              onChange={(e) => {
                const v = e.target.value;
                setTanggal(v > TODAY_WIB ? TODAY_WIB : v);
              }}
              className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
            />
          </div>

          {/* Legend */}
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Menunggu Walas (15 mnt)
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading ? <span className="text-gray-400">Memuat data...</span>
                       : <><span className="font-semibold text-gray-800">{rows.length}</span> siswa</>}
            </p>
            {!loading && rows.length > 0 && (
              <p className="text-xs text-gray-400">
                Ubah status via dropdown — WALAS akan dikonfirmasi
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {["No", "Nama", "NISN", "No Telp", "Waktu Tap In", "Status Tap", "Status Absensi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(6)].map((_, i) => <SkeletonRow key={i} />)
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm text-gray-400">Tidak ada data untuk filter ini.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, index) => {
                    const sid = row.siswa_id;
                    const state = rowState[sid] ?? "idle";
                    const effectiveStatus = normalizeStatusCode(
                      row._pending_status ||
                      row.status_saat_ini ||
                      row.status_rekomendasi ||
                      (row.tap_in ? "HADIR" : "ALPHA")
                    );

                    return (
                      <tr key={sid} className="transition-colors duration-150 hover:bg-blue-50/20">
                        <td className="px-4 py-4 text-sm text-gray-400 font-medium">
                          {(page - 1) * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-gray-900">{row.nama || "-"}</p>
                          {!row.punya_rfid && <span className="text-xs text-orange-400">Tanpa RFID</span>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 font-mono">{row.nisn || row.NISN || "-"}</td>
                        <td className="px-4 py-4 text-sm text-gray-600">{row.nomor_telepon || "-"}</td>
                        <td className="px-4 py-4 text-sm text-gray-700">
                          {row.tap_in
                            ? <span className="font-medium">{row.tap_in}</span>
                            : <span className="text-gray-300">-</span>}
                        </td>
                        <td className="px-4 py-4">
                          <StatusTapBadge status={row.status_tapin} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusDropdown
                            currentStatus={effectiveStatus}
                            rowState={state}
                            onSelect={(newStatus) => handleStatusChange(row, newStatus)}
                            disabled={false}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && rows.length > 0 && (
            <Pagination
              page={page} totalPages={totalPages} onPageChange={setPage}
              summary={`Menampilkan ${pagedRows.length} dari ${rows.length} siswa`}
              className="border-gray-100 bg-gray-50/50"
            />
          )}
        </div>
      </div>
    </main>
  );
}
