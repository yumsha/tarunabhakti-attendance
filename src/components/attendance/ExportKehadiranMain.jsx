import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Search, X, CheckCircle2 } from "lucide-react";
import { kelas, tahunAjaran, finalAbsensi } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

const BULAN_ID = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",  
];

// row.tanggal comes back as "YYYY-MM-DD" from the API — parse it as plain text
// instead of `new Date(str)` so we never get bitten by a local-timezone day shift.
function parseYMD(str) {
  const [y, m, d] = String(str).split("-").map(Number);
  return { year: y, month: m, day: d };
}

function formatTanggalID(str) {
  if (!str) return "-";
  const { year, month, day } = parseYMD(str);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

// Build the ordered list of {year, month, key, label} between two "YYYY-MM-DD" strings, inclusive.
function buildMonthRange(startStr, endStr) {
  const start = parseYMD(startStr);
  const end = parseYMD(endStr);
  const months = [];
  let y = start.year, m = start.month;
  while (y < end.year || (y === end.year && m <= end.month)) {
    months.push({ year: y, month: m, key: `${y}-${m}`, label: BULAN_ID[m] });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return months;
}

function StatusAbsensiBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">Belum ada data</span>;
  const map = {
    HADIR: { label: "Hadir", cls: "bg-emerald-100 text-emerald-700" },
    Hadir: { label: "Hadir", cls: "bg-emerald-100 text-emerald-700" },
    IZIN: { label: "Izin", cls: "bg-blue-100 text-blue-700" },
    Izin: { label: "Izin", cls: "bg-blue-100 text-blue-700" },
    SAKIT: { label: "Sakit", cls: "bg-purple-100 text-purple-700" },
    Sakit: { label: "Sakit", cls: "bg-purple-100 text-purple-700" },
    ALPHA: { label: "Alpha", cls: "bg-red-100 text-red-700" },
    Alpha: { label: "Alpha", cls: "bg-red-100 text-red-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {s.label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-3">
        <div className="h-4 bg-gray-100 rounded-full animate-pulse" />
      </td>
    </tr>
  );
}

function SearchableDropdown({
  value,
  onChange,
  options,
  placeholder = "Pilih",
  searchPlaceholder = "Cari...",
  disabled = false,
  allowClear = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Treat the "Semua ..." (value === "") option as "nothing meaningfully selected"
  // so the trigger falls back to the placeholder instead of showing an empty pill.
  const selected = options.find((o) => String(o.value) === String(value) && o.value !== "");

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-gray-50 px-3 py-2 text-sm transition " +
          (open ? "border-transparent ring-2 ring-blue-500" : "border-gray-200 hover:border-gray-300") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        <span className={selected ? "text-gray-700" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && allowClear && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open ? (
        <div className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-gray-400">Tidak ditemukan</li>
            ) : (
              filtered.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <li
                    key={String(opt.value) || "__all__"}
                    onClick={() => { onChange(String(opt.value)); setOpen(false); setQuery(""); }}
                    className={
                      "flex cursor-pointer items-center justify-between px-4 py-2.5 text-sm transition " +
                      (isSelected ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50")
                    }
                  >
                    <span>{opt.label}</span>
                    {isSelected ? <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> : null}
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-gray-100 px-3 py-2 text-[11px] text-gray-400">
            {filtered.length} opsi ditampilkan · ketik untuk memfilter
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Normalize kelas data — handle nested { kelas: { id, kelas, jurusan } } or flat { id, kelas, jurusan }
function normalizeKelas(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (item?.kelas && typeof item.kelas === "object") {
        return {
          id: item.kelas.id,
          kelas: item.kelas.kelas,
          jurusan: item.kelas.jurusan || item.jurusan || "",
          tahun_ajaran_id: item.kelas.tahun_ajaran_id || item.kelas.tahun_id || item.kelas.tahun?.id || null,
          tahun_id: item.kelas.tahun_ajaran_id || item.kelas.tahun_id || item.kelas.tahun?.id || null,
          walas_id: item.kelas.walas_id || item.kelas.walas?.id || null,
          telegram_group_id: item.kelas.telegram_group_id || null,
          status_kelas: item.kelas.status_kelas || "Active",
          tahun: item.kelas.tahun || null,
          walas: item.kelas.walas || null,
        };
      }
      return {
        id: item.id,
        kelas: item.kelas || item.nama_kelas || "",
        jurusan: item.jurusan || "",
        tahun_ajaran_id: item.tahun_ajaran_id || item.tahun_id || item.tahun?.id || null,
        tahun_id: item.tahun_ajaran_id || item.tahun_id || item.tahun?.id || null,
        walas_id: item.walas_id || item.walas?.id || null,
        telegram_group_id: item.telegram_group_id || null,
        status_kelas: item.status_kelas || "Active",
        tahun: item.tahun || null,
        walas: item.walas || null,
      };
    })
    .filter((item) => item.id != null)
    .filter((item, idx, self) => idx === self.findIndex((c) => c.id === item.id));
}

function normalizeTahun(data) {
  return Array.isArray(data) ? data : [];
}

//  Date filter mode 
// Consolidating "single date" and "date range" into one explicit toggle instead of
// two always-visible input groups avoids the old bug where typing into one group
// silently cleared the other and the table appeared to lose its data mid-edit.
const DATE_MODE = { SINGLE: "single", RANGE: "range" };

export default function ExportKehadiranMain() {
  // Data states
  const [classList, setClassList] = useState([]);
  const [tahunList, setTahunList] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);

  // Cegah pemilihan tanggal yang belum terlewati (real-time, WIB)
  const TODAY_WIB = getTodayWIB();

  // Filter states
  const [dateMode, setDateMode] = useState(DATE_MODE.SINGLE);
  const [tanggal, setTanggal] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [selectedJurusan, setSelectedJurusan] = useState("");
  const [selectedTingkat, setSelectedTingkat] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedTahun, setSelectedTahun] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const filterRes = await finalAbsensi.filters();

        if (filterRes?.success && filterRes.data) {
          setClassList(normalizeKelas(filterRes.data.kelas));
          setTahunList(normalizeTahun(filterRes.data.tahun_ajaran));
        } else {
          const [kelasRes, tahunRes] = await Promise.allSettled([
            kelas.list("limit=500"),
            tahunAjaran.list(),
          ]);

          if (kelasRes.status === "fulfilled" && kelasRes.value?.success && kelasRes.value.data) {
            setClassList(normalizeKelas(kelasRes.value.data));
          }
          if (tahunRes.status === "fulfilled" && tahunRes.value?.success && tahunRes.value.data) {
            setTahunList(normalizeTahun(tahunRes.value.data));
          }
        }
      } catch (e) {
        console.error("Failed to load initial data", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Client-side filtering is used for instantaneous search-as-you-type and status filter

  // Get unique jurusan values
  const jurusanList = useMemo(() => {
    const set = new Set();
    classList.forEach((k) => {
      if (k.jurusan) set.add(k.jurusan);
    });
    return Array.from(set).sort();
  }, [classList]);

  // Filter kelas based on selected filters (hierarchical filtering)
  const filteredKelasList = useMemo(() => {
    return classList.filter((k) => {
      if (selectedJurusan && k.jurusan !== selectedJurusan) return false;
      if (selectedTahun && String(k.tahun_ajaran_id) !== selectedTahun) return false;
      if (selectedTingkat) {
        // Match tingkat (X, XI, XII) from the start of kelas name
        const namaKelas = String(k.kelas || "").trim().toUpperCase();
        const tingkat = selectedTingkat.toUpperCase();
        // e.g. "XI IPA 1" starts with "XI", not "X"
        const afterTingkat = namaKelas.slice(tingkat.length);
        if (!namaKelas.startsWith(tingkat) || (afterTingkat !== "" && !/^[^A-Z0-9]|^\s/.test(afterTingkat) && /^[A-Z]/.test(afterTingkat))) return false;
      }
      return true;
    });
  }, [classList, selectedJurusan, selectedTahun, selectedTingkat]);

  // Options for the searchable dropdowns (mirrors the old <option> lists)
  const jurusanOptions = useMemo(
    () => [
      { value: "", label: "Semua Jurusan" },
      ...jurusanList.map((j) => ({ value: j, label: j })),
    ],
    [jurusanList]
  );

  const kelasOptions = useMemo(
    () => [
      { value: "", label: "Semua Kelas" },
      ...filteredKelasList.map((k) => ({
        value: k.id,
        label: `${k.kelas}${k.jurusan ? ` - ${k.jurusan}` : ""}`,
      })),
    ],
    [filteredKelasList]
  );

  const tahunOptions = useMemo(
    () => [
      { value: "", label: "Semua Tahun Ajaran" },
      ...tahunList.map((t) => ({ value: t.id, label: t.tahun_ajaran })),
    ],
    [tahunList]
  );

  const tingkatOptions = useMemo(
    () => [
      { value: "", label: "Semua Tingkat" },
      { value: "X", label: "Kelas X" },
      { value: "XI", label: "Kelas XI" },
      { value: "XII", label: "Kelas XII" },
    ],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: "", label: "Semua Status" },
      { value: "Hadir", label: "Hadir" },
      { value: "Izin", label: "Izin" },
      { value: "Sakit", label: "Sakit" },
      { value: "Alpha", label: "Alpha" },
    ],
    []
  );

  // Simple filter handlers — selecting a class doesn't auto-lock Jurusan/Tahun
  const handleKelasChange = useCallback((kelasId) => {
    setSelectedKelas(kelasId);
  }, []);

  const handleJurusanChange = useCallback((jurusan) => {
    setSelectedJurusan(jurusan);
    // If current selected class doesn't belong to the new jurusan, clear it
    if (selectedKelas && jurusan) {
      const kelasObj = classList.find((k) => String(k.id) === String(selectedKelas));
      if (kelasObj && kelasObj.jurusan !== jurusan) {
        setSelectedKelas("");
      }
    }
  }, [selectedKelas, classList]);

  const handleTingkatChange = useCallback((tingkat) => {
    setSelectedTingkat(tingkat);
    // If current selected class doesn't match the new tingkat, clear it
    if (selectedKelas && tingkat) {
      const kelasObj = classList.find((k) => String(k.id) === String(selectedKelas));
      if (kelasObj) {
        const namaKelas = String(kelasObj.kelas || "").trim().toUpperCase();
        const t = tingkat.toUpperCase();
        const afterTingkat = namaKelas.slice(t.length);
        if (!namaKelas.startsWith(t) || (afterTingkat !== "" && !/^[^A-Z0-9]|^\s/.test(afterTingkat) && /^[A-Z]/.test(afterTingkat))) {
          setSelectedKelas("");
        }
      }
    }
  }, [selectedKelas, classList]);

  const handleTahunChange = useCallback((tahunId) => {
    setSelectedTahun(tahunId);
    // If current selected class doesn't belong to the new tahun, clear it
    if (selectedKelas && tahunId) {
      const kelasObj = classList.find((k) => String(k.id) === String(selectedKelas));
      if (kelasObj && String(kelasObj.tahun_ajaran_id) !== String(tahunId)) {
        setSelectedKelas("");
      }
    }
  }, [selectedKelas, classList]);

  // Is the currently-active date mode "complete" enough to query?
  const isRangeIncomplete =
    dateMode === DATE_MODE.RANGE && (!!tanggalMulai !== !!tanggalAkhir);
  const hasDateFilter =
    dateMode === DATE_MODE.SINGLE ? !!tanggal : !!(tanggalMulai && tanggalAkhir);

  // Fetch attendance data based on filters
  const fetchAttendance = useCallback(async () => {
    setFetchingAttendance(true);
    try {
      const params = new URLSearchParams({ limit: "1000", include_empty: "false" });
      if (dateMode === DATE_MODE.SINGLE) {
        params.set("tanggal", tanggal);
      } else {
        params.set("tanggal_mulai", tanggalMulai);
        params.set("tanggal_akhir", tanggalAkhir);
      }
      
      if (selectedKelas) {
        params.set("kelas_id", selectedKelas);
      } else {
        if (selectedJurusan) params.set("jurusan", selectedJurusan);
        if (selectedTahun) params.set("tahun_ajaran_id", selectedTahun);
      }

      const rows = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        params.set("page", String(currentPage));
        const res = await finalAbsensi.list(params.toString());
        rows.push(...(Array.isArray(res?.data) ? res.data : []));
        totalPages = res?.pagination?.totalPages || 1;
        currentPage += 1;
      } while (currentPage <= totalPages);

      setAttendanceData(rows.map((a) => ({
        siswa_id: a.siswa_id,
        nama: a.nama,
        NISN: a.nisn || a.NISN || "",
        NIPD: a.nipd || a.NIPD || "",
        JK: a.jenis_kelamin || a.JK || "",
        kelas_nama: a.kelas?.kelas || "",
        jurusan: a.kelas?.jurusan || "",
        tahun_ajaran: a.kelas?.tahun?.tahun_ajaran || "",
        status_saat_ini: a.status_final || null,
        tanggal: a.tanggal,
      })));
    } catch (e) {
      console.error("Failed to fetch attendance", e);
      setAttendanceData([]);
    } finally {
      setFetchingAttendance(false);
    }
  }, [dateMode, tanggal, tanggalMulai, tanggalAkhir, selectedJurusan, selectedKelas, selectedTahun]);

  // Auto-fetch when filters change
  useEffect(() => {
    if (hasDateFilter) {
      fetchAttendance();
    } else if (!tanggal && !tanggalMulai && !tanggalAkhir) {
      setAttendanceData([]);
    }
  }, [hasDateFilter, tanggal, tanggalMulai, tanggalAkhir, fetchAttendance]);

  const mergedData = useMemo(() => {
    if (!hasDateFilter) return [];
    return attendanceData.filter((row) => {
      // Filter by name or NISN (case-insensitive)
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const nama = (row.nama || "").toLowerCase();
        const nisn = (row.NISN || "").toLowerCase();
        if (!nama.includes(query) && !nisn.includes(query)) return false;
      }
      // Filter by status (case-insensitive)
      if (selectedStatus) {
        const rowStatus = String(row.status_saat_ini || "").toUpperCase();
        if (rowStatus !== selectedStatus.toUpperCase()) return false;
      }
      // Client-side jurusan guard
      if (selectedJurusan) {
        if ((row.jurusan || "") !== selectedJurusan) return false;
      }
      // Client-side tingkat guard (X, XI, XII)
      if (selectedTingkat) {
        const namaKelas = String(row.kelas_nama || "").trim().toUpperCase();
        const t = selectedTingkat.toUpperCase();
        const afterTingkat = namaKelas.slice(t.length);
        if (!namaKelas.startsWith(t) || (afterTingkat !== "" && !/^[^A-Z0-9]|^\s/.test(afterTingkat) && /^[A-Z]/.test(afterTingkat))) return false;
      }
      // Client-side kelas guard: match both kelas and jurusan precisely
      if (selectedKelas) {
        const kelasObj = classList.find((k) => String(k.id) === String(selectedKelas));
        if (kelasObj) {
          if ((row.kelas_nama || "") !== kelasObj.kelas) return false;
          if ((row.jurusan || "") !== kelasObj.jurusan) return false;
        }
      }
      return true;
    });
  }, [hasDateFilter, attendanceData, searchTerm, selectedStatus, selectedJurusan, selectedTingkat, selectedKelas, classList]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(mergedData.length / pageSize));
  const pagedData = mergedData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedStatus, selectedJurusan, selectedTingkat, selectedKelas, selectedTahun, tanggal, tanggalMulai, tanggalAkhir, dateMode]);

  // Switch date mode: clear both sets of date values explicitly so there's never
  // a moment where stale values from the other mode silently affect the query.
  const switchDateMode = (mode) => {
    if (mode === dateMode) return;
    setDateMode(mode);
    setTanggal("");
    setTanggalMulai("");
    setTanggalAkhir("");
  };

  const prepareExportData = () => {
    if (mergedData.length === 0) return null;

    const rangeStart = dateMode === DATE_MODE.SINGLE ? tanggal : tanggalMulai;
    const rangeEnd = dateMode === DATE_MODE.SINGLE ? tanggal : tanggalAkhir;
    const months = buildMonthRange(rangeStart, rangeEnd);

    const kelasInfo = selectedKelas ? classList.find((k) => String(k.id) === String(selectedKelas)) : null;
    const tahunInfo = selectedTahun ? tahunList.find((t) => String(t.id) === String(selectedTahun)) : null;
    const showKelasCol = !selectedKelas;

    const bySiswa = new Map();
    const uniqueDates = new Set();

    mergedData.forEach((row) => {
      if (!row.tanggal) return;
      uniqueDates.add(row.tanggal);
      const { year, month } = parseYMD(row.tanggal);
      const monthKey = `${year}-${month}`;

      if (!bySiswa.has(row.siswa_id)) {
        bySiswa.set(row.siswa_id, {
          nipd: row.NIPD || row.NISN || "-",
          nama: row.nama || "-",
          jk: row.JK === "L" || row.JK === "P" ? row.JK : "-",
          kelas: row.kelas_nama || "-",
          perMonth: {},
        });
      }
      const siswa = bySiswa.get(row.siswa_id);
      if (!siswa.perMonth[monthKey]) siswa.perMonth[monthKey] = { S: 0, I: 0, A: 0 };

      const status = row.status_saat_ini;
      if (status === "Sakit") siswa.perMonth[monthKey].S += 1;
      else if (status === "Izin") siswa.perMonth[monthKey].I += 1;
      else if (status === "Alpha") siswa.perMonth[monthKey].A += 1;
    });

    const siswaList = Array.from(bySiswa.values()).sort((a, b) => a.nama.localeCompare(b.nama));
    const hariEfektif = uniqueDates.size;
    const jumlahSiswa = siswaList.length;

    const baseCols = ["No", "NIPD", "Nama Peserta Didik", "JK"];
    if (showKelasCol) baseCols.push("Kelas");
    const baseColCount = baseCols.length;
    const monthColCount = months.length * 3;
    const totalColCount = baseColCount + monthColCount + 3 + 1; // + TOTAL ABSENSI(S/I/A) + T
    const lastColIdx = totalColCount - 1;

    // Body rows for autoTable (also used by Excel)
    const bodyData = [];
    siswaList.forEach((s, idx) => {
      const r = new Array(totalColCount).fill(null);
      r[0] = idx + 1;
      r[1] = s.nipd;
      r[2] = s.nama;
      r[3] = s.jk;
      if (showKelasCol) r[4] = s.kelas;

      let totS = 0, totI = 0, totA = 0;
      months.forEach((m, i) => {
        const c = baseColCount + i * 3;
        const v = s.perMonth[m.key] || { S: 0, I: 0, A: 0 };
        r[c] = v.S; r[c + 1] = v.I; r[c + 2] = v.A;
        totS += v.S; totI += v.I; totA += v.A;
      });
      const totalStart = baseColCount + monthColCount;
      r[totalStart] = totS; r[totalStart + 1] = totI; r[totalStart + 2] = totA;
      r[lastColIdx] = totS + totI + totA;
      bodyData.push(r);
    });

    const jumlahRow = new Array(totalColCount).fill(0);
    jumlahRow[0] = "J U M L A H";
    for (let c = baseColCount; c < totalColCount; c++) {
      jumlahRow[c] = bodyData.reduce((sum, r) => sum + (r[c] || 0), 0);
    }
    for (let c = 1; c < baseColCount; c++) jumlahRow[c] = null;

    const jumlahKetidakhadiran = jumlahRow[lastColIdx];
    const presentaseKetidakhadiran =
      jumlahSiswa > 0 && hariEfektif > 0 ? jumlahKetidakhadiran / (jumlahSiswa * hariEfektif) : 0;
    const presentaseKehadiran = 1 - presentaseKetidakhadiran;
    
    const strKetidakhadiran = (presentaseKetidakhadiran * 100).toFixed(2) + "%";
    const strKehadiran = (presentaseKehadiran * 100).toFixed(2) + "%";

    const periodeLabel =
      dateMode === DATE_MODE.SINGLE
        ? `Tanggal: ${formatTanggalID(tanggal)}`
        : `Periode: ${formatTanggalID(tanggalMulai)} s/d ${formatTanggalID(tanggalAkhir)}`;

    const infoLeft = [
      kelasInfo ? `Kelas: ${kelasInfo.kelas}` : null,
      selectedJurusan ? `Jurusan: ${selectedJurusan}` : null,
      tahunInfo ? `Tahun Ajaran: ${tahunInfo.tahun_ajaran}` : null,
    ].filter(Boolean).join("   |   ") || "Semua Kelas";

    return {
      rangeStart, rangeEnd, months,
      kelasInfo, tahunInfo, showKelasCol,
      baseCols, baseColCount, monthColCount, totalColCount, lastColIdx,
      bodyData, jumlahRow,
      jumlahSiswa, hariEfektif, jumlahKetidakhadiran,
      strKetidakhadiran, strKehadiran,
      periodeLabel, infoLeft
    };
  };

  // Export to PDF
  const handleExportPdf = () => {
    const data = prepareExportData();
    if (!data) return;

    const {
      months, baseCols, baseColCount, monthColCount,
      bodyData, jumlahRow,
      jumlahSiswa, hariEfektif, jumlahKetidakhadiran,
      strKetidakhadiran, strKehadiran,
      periodeLabel, infoLeft, rangeStart, rangeEnd
    } = data;

    const doc = new jsPDF("landscape");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("REKAP KEHADIRAN SISWA", 14, 16);
    doc.setFontSize(10);
    
    let yPos = 24;
    doc.text(periodeLabel, 14, yPos);
    doc.setFont("helvetica", "normal");
    yPos += 6;
    doc.text(infoLeft, 14, yPos);
    yPos += 10;

    // Building headers for autoTable
    const headRow1 = [];
    const headRow2 = [];

    baseCols.forEach((col) => {
      headRow1.push({ content: col, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } });
    });

    months.forEach((m) => {
      headRow1.push({ content: m.label.toUpperCase(), colSpan: 3, styles: { halign: 'center' } });
      headRow2.push({ content: "S", styles: { halign: 'center' } });
      headRow2.push({ content: "I", styles: { halign: 'center' } });
      headRow2.push({ content: "A", styles: { halign: 'center' } });
    });

    headRow1.push({ content: "TOTAL ABSENSI", colSpan: 3, styles: { halign: 'center' } });
    headRow2.push({ content: "S", styles: { halign: 'center' } });
    headRow2.push({ content: "I", styles: { halign: 'center' } });
    headRow2.push({ content: "A", styles: { halign: 'center' } });

    headRow1.push({ content: "T", rowSpan: 2, styles: { halign: 'center', valign: 'middle' } });
    
    autoTable(doc, {
      startY: yPos,
      head: [headRow1, headRow2],
      body: bodyData,
      foot: [
        [
          { content: "J U M L A H", colSpan: baseColCount, styles: { halign: 'center', fontStyle: 'bold' } },
          ...jumlahRow.slice(baseColCount).map(val => ({ content: val, styles: { halign: 'center', fontStyle: 'bold' } }))
        ]
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2, textColor: [0, 0, 0] },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [150, 150, 150] },
      footStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0] },
      columnStyles: {
        0: { halign: 'center' },
        2: { halign: 'left' },
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index >= baseColCount) {
          data.cell.styles.halign = 'center';
        }
      }
    });

    // Summary box
    const finalY = doc.lastAutoTable.finalY + 10;
    
    doc.setFont("helvetica", "normal");
    doc.text("Jumlah Ketidakhadiran:", 14, finalY);
    doc.text(String(jumlahKetidakhadiran), 60, finalY);
    
    doc.text("Jumlah Siswa:", 14, finalY + 5);
    doc.text(String(jumlahSiswa), 60, finalY + 5);
    
    doc.text("Presentase Ketidakhadiran:", 14, finalY + 10);
    doc.setFont("helvetica", "bold");
    doc.text(strKetidakhadiran, 60, finalY + 10);
    
    doc.setFont("helvetica", "normal");
    doc.text("Jumlah Hari Efektif:", 14, finalY + 15);
    doc.text(String(hariEfektif), 60, finalY + 15);
    
    doc.text("Presentase Kehadiran:", 14, finalY + 20);
    doc.setFont("helvetica", "bold");
    doc.text(strKehadiran, 60, finalY + 20);

    doc.setFont("helvetica", "normal");
    doc.text(`Diekspor pada: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`, 14, finalY + 30);

    doc.save(`Rekap_Kehadiran_${rangeStart}_sd_${rangeEnd}.pdf`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = prepareExportData();
    if (!data) return;

    const {
      rangeStart, rangeEnd, months,
      kelasInfo, showKelasCol,
      baseCols, baseColCount, monthColCount, totalColCount, lastColIdx,
      bodyData, jumlahRow,
      jumlahSiswa, hariEfektif, jumlahKetidakhadiran,
      strKetidakhadiran, strKehadiran,
      periodeLabel, infoLeft
    } = data;

    const FILL_A = "FFF2CC";
    const FILL_B = "D9EAD3";
    const FILL_TOTAL = "D9D9D9";
    const FILL_JUMLAH = "A5A5A5";

    const rows = [];
    rows.push(["REKAP KEHADIRAN SISWA"]);
    rows.push([periodeLabel]);
    rows.push([infoLeft]);
    rows.push([]);

    const headRow1 = new Array(totalColCount).fill(null);
    const headRow2 = new Array(totalColCount).fill(null);
    baseCols.forEach((label, i) => { headRow1[i] = label; });
    months.forEach((m, i) => {
      const c = baseColCount + i * 3;
      headRow1[c] = m.label.toUpperCase();
      headRow2[c] = "S"; headRow2[c + 1] = "I"; headRow2[c + 2] = "A";
    });
    const totalStart = baseColCount + monthColCount;
    headRow1[totalStart] = "TOTAL ABSENSI";
    headRow2[totalStart] = "S"; headRow2[totalStart + 1] = "I"; headRow2[totalStart + 2] = "A";
    headRow1[lastColIdx] = "T";
    rows.push(headRow1);
    rows.push(headRow2);
    const headerRow1Idx = rows.length - 2; 
    const headerRow2Idx = rows.length - 1;

    const dataStartIdx = rows.length;
    bodyData.forEach(r => rows.push(r));
    const dataEndIdx = rows.length - 1;

    // JUMLAH footer row
    rows.push(jumlahRow);
    const jumlahRowIdx = rows.length - 1;

    rows.push([]); // spacer

    const summaryLabelCol = 2; // column C
    const summaryValueCol = lastColIdx >= 6 ? lastColIdx - 1 : summaryLabelCol + 4;
    const summaryStartRow = rows.length;
    const pushSummary = (label, value) => {
      const r = new Array(totalColCount).fill(null);
      r[summaryLabelCol] = label;
      r[summaryValueCol] = value;
      rows.push(r);
    };
    pushSummary("Jumlah Ketidakhadiran", jumlahKetidakhadiran);
    pushSummary("Jumlah Siswa", jumlahSiswa);
    pushSummary("Presentase Ketidakhadiran", strKetidakhadiran);
    pushSummary("Jumlah Hari Efektif", hariEfektif);
    pushSummary("Presentase Kehadiran", strKehadiran);

    rows.push([]);
    rows.push([null, null, `Diekspor pada: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`]);

    // ---- Build worksheet ----
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const col = (i) => XLSX.utils.encode_col(i);
    const cellRef = (r, c) => `${col(c)}${r + 1}`;
    const setStyle = (r, c, style) => {
      const ref = cellRef(r, c);
      if (!ws[ref]) ws[ref] = { t: "s", v: "" };
      ws[ref].s = { ...(ws[ref].s || {}), ...style };
    };

    const thinBorder = {
      top: { style: "thin", color: { rgb: "999999" } },
      bottom: { style: "thin", color: { rgb: "999999" } },
      left: { style: "thin", color: { rgb: "999999" } },
      right: { style: "thin", color: { rgb: "999999" } },
    };
    const centerMid = { horizontal: "center", vertical: "center", wrapText: true };

    // Title & info rows
    setStyle(0, 0, { font: { name: "Arial", bold: true, sz: 14 }, alignment: { horizontal: "center" } });
    setStyle(1, 0, { font: { name: "Arial", bold: true, sz: 11 }, alignment: { horizontal: "center" } });
    setStyle(2, 0, { font: { name: "Arial", sz: 10, italic: true }, alignment: { horizontal: "center" } });
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: lastColIdx } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastColIdx } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: lastColIdx } },
    ];

    // Header rows (2 rows): month group + S/I/A subheader
    baseCols.forEach((_, i) => {
      ws["!merges"].push({ s: { r: headerRow1Idx, c: i }, e: { r: headerRow2Idx, c: i } });
      setStyle(headerRow1Idx, i, { font: { name: "Arial", bold: true }, alignment: centerMid, border: thinBorder });
      setStyle(headerRow2Idx, i, { border: thinBorder });
    });
    months.forEach((m, i) => {
      const c = baseColCount + i * 3;
      const fill = i % 2 === 0 ? FILL_A : FILL_B;
      ws["!merges"].push({ s: { r: headerRow1Idx, c }, e: { r: headerRow1Idx, c: c + 2 } });
      for (let cc = c; cc < c + 3; cc++) {
        setStyle(headerRow1Idx, cc, { font: { name: "Arial", bold: true }, fill: { fgColor: { rgb: fill } }, alignment: centerMid, border: thinBorder });
        setStyle(headerRow2Idx, cc, { font: { name: "Arial", bold: true }, fill: { fgColor: { rgb: fill } }, alignment: centerMid, border: thinBorder });
      }
    });
    ws["!merges"].push({ s: { r: headerRow1Idx, c: totalStart }, e: { r: headerRow1Idx, c: totalStart + 2 } });
    for (let cc = totalStart; cc < totalStart + 3; cc++) {
      setStyle(headerRow1Idx, cc, { font: { name: "Arial", bold: true }, alignment: centerMid, border: thinBorder });
      setStyle(headerRow2Idx, cc, { font: { name: "Arial", bold: true }, alignment: centerMid, border: thinBorder });
    }
    ws["!merges"].push({ s: { r: headerRow1Idx, c: lastColIdx }, e: { r: headerRow2Idx, c: lastColIdx } });
    setStyle(headerRow1Idx, lastColIdx, { font: { name: "Arial", bold: true }, fill: { fgColor: { rgb: FILL_TOTAL } }, alignment: centerMid, border: thinBorder });
    setStyle(headerRow2Idx, lastColIdx, { border: thinBorder });

    // Data rows
    for (let r = dataStartIdx; r <= dataEndIdx; r++) {
      for (let c = 0; c < totalColCount; c++) {
        const base = { font: { name: "Arial" }, border: thinBorder, alignment: { horizontal: c === 2 ? "left" : "center", vertical: "center" } };
        if (c >= baseColCount && c < totalStart) {
          const monthIdx = Math.floor((c - baseColCount) / 3);
          base.fill = { fgColor: { rgb: monthIdx % 2 === 0 ? FILL_A : FILL_B } };
          base.font.bold = true;
        } else if (c === lastColIdx) {
          base.fill = { fgColor: { rgb: FILL_TOTAL } };
        }
        setStyle(r, c, base);
      }
    }

    // JUMLAH footer row
    for (let c = 0; c < totalColCount; c++) {
      setStyle(jumlahRowIdx, c, {
        font: { name: "Arial", bold: true },
        fill: { fgColor: { rgb: FILL_JUMLAH } },
        alignment: { horizontal: "center", vertical: "center" },
        border: thinBorder,
      });
    }
    ws["!merges"].push({ s: { r: jumlahRowIdx, c: 0 }, e: { r: jumlahRowIdx, c: baseColCount - 1 } });

    // Summary box
    for (let i = 0; i < 5; i++) {
      setStyle(summaryStartRow + i, summaryLabelCol, { font: { name: "Arial", sz: 10 } });
      setStyle(summaryStartRow + i, summaryValueCol, {
        font: { name: "Arial", sz: 10, bold: true },
        alignment: { horizontal: "right" },
      });
    }

    // Column widths
    const colWidths = [
      { wch: 5 },   // No
      { wch: 14 },  // NIPD
      { wch: 28 },  // Nama
      { wch: 5 },   // JK
    ];
    if (showKelasCol) colWidths.push({ wch: 12 }); // Kelas
    for (let i = 0; i < months.length * 3 + 3; i++) colWidths.push({ wch: 5 });
    colWidths.push({ wch: 6 }); // T
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = (kelasInfo?.kelas ? `Rekap ${kelasInfo.kelas}` : "Rekap Kehadiran").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Rekap_Kehadiran_${rangeStart}_sd_${rangeEnd}.xlsx`);
  };

  // Clear all filters
  const clearFilters = () => {
    setDateMode(DATE_MODE.SINGLE);
    setTanggal("");
    setTanggalMulai("");
    setTanggalAkhir("");
    setSelectedJurusan("");
    setSelectedKelas("");
    setSelectedTahun("");
    setSelectedStatus("");
    setSearchTerm("");
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title="Export Data Kehadiran"
        subtitle="Lihat dan ekspor data kehadiran seluruh siswa"
      />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-5">
        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Data
            </h3>
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reset Filter
            </button>
          </div>

          {/* Date mode toggle — replaces the old dual always-visible date groups.
              Only one mode is active at a time so filters can no longer silently
              clear each other while you're mid-selection. */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Mode Tanggal</label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => switchDateMode(DATE_MODE.SINGLE)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateMode === DATE_MODE.SINGLE
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Tanggal Tunggal
              </button>
              <button
                type="button"
                onClick={() => switchDateMode(DATE_MODE.RANGE)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateMode === DATE_MODE.RANGE
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Rentang Tanggal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Cari nama atau NISN..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Tanggal Tunggal */}
            {dateMode === DATE_MODE.SINGLE && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={tanggal}
                  max={TODAY_WIB}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTanggal(v > TODAY_WIB ? TODAY_WIB : v);
                  }}
                  className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer w-full"
                />
              </div>
            )}

            {/* Rentang Tanggal */}
            {dateMode === DATE_MODE.RANGE && (
              <div className="lg:col-span-2 flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={tanggalMulai}
                  max={tanggalAkhir || TODAY_WIB}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTanggalMulai(v > TODAY_WIB ? TODAY_WIB : v);
                  }}
                  className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                />
                <span className="text-gray-400 text-xs shrink-0">s/d</span>
                <input
                  type="date"
                  value={tanggalAkhir}
                  min={tanggalMulai || undefined}
                  max={TODAY_WIB}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTanggalAkhir(v > TODAY_WIB ? TODAY_WIB : v);
                  }}
                  className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                />
              </div>
            )}

            <SearchableDropdown
              value={selectedJurusan}
              onChange={handleJurusanChange}
              options={jurusanOptions}
              placeholder="Semua Jurusan"
              searchPlaceholder="Cari jurusan..."
            />

            <SearchableDropdown
              value={selectedTingkat}
              onChange={handleTingkatChange}
              options={tingkatOptions}
              placeholder="Semua Tingkat"
              searchPlaceholder="Cari tingkat..."
            />

            <SearchableDropdown
              value={selectedKelas}
              onChange={handleKelasChange}
              options={kelasOptions}
              placeholder="Semua Kelas"
              searchPlaceholder="Cari kelas..."
            />

            <SearchableDropdown
              value={selectedTahun}
              onChange={handleTahunChange}
              options={tahunOptions}
              placeholder="Semua Tahun Ajaran"
              searchPlaceholder="Cari tahun ajaran..."
            />

            <SearchableDropdown
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              placeholder="Semua Status"
              searchPlaceholder="Cari status..."
            />
          </div>

          {isRangeIncomplete && (
            <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Lengkapi kedua tanggal (mulai dan akhir) untuk menampilkan data.
            </p>
          )}
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
            disabled={mergedData.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-100 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Unduh PDF ({mergedData.length} data)
          </button>
          <button
            onClick={handleExportExcel}
            disabled={mergedData.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-green-100 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Unduh Excel ({mergedData.length} data)
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {loading || fetchingAttendance ? (
                <span className="text-gray-400">Memuat data...</span>
              ) : !hasDateFilter ? (
                <span className="text-gray-400 italic">
                  {dateMode === DATE_MODE.SINGLE
                    ? "Pilih tanggal untuk menampilkan data"
                    : "Pilih tanggal mulai dan akhir untuk menampilkan data"}
                </span>
              ) : (
                <span className="font-medium text-gray-800">
                  Menampilkan {pagedData.length} dari {mergedData.length} data
                </span>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">NISN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Kelas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Jurusan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading || fetchingAttendance ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm text-gray-400">
                          {!hasDateFilter
                            ? dateMode === DATE_MODE.SINGLE
                              ? "Pilih tanggal untuk menampilkan data kehadiran."
                              : "Pilih tanggal mulai dan akhir untuk menampilkan data kehadiran."
                            : searchTerm || selectedStatus || selectedJurusan || selectedKelas || selectedTahun
                            ? `Tidak ada data kehadiran yang cocok dengan filter yang dipilih.`
                            : "Tidak ada data kehadiran untuk tanggal ini."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedData.map((row, idx) => (
                    <tr
                      key={`${row.siswa_id || row.NISN}-${row.tanggal || idx}`}
                      className="hover:bg-blue-50/20 transition-colors"
                    >
                      <td className="px-4 py-4 text-sm text-gray-400 font-medium">
                        {(page - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold text-gray-900">{row.nama || "-"}</p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                        {row.NISN || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {row.kelas_nama || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {row.jurusan || "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatTanggalID(row.tanggal)}
                      </td>
                      <td className="px-4 py-4">
                        <StatusAbsensiBadge status={row.status_saat_ini} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && !fetchingAttendance && mergedData.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`Menampilkan ${pagedData.length} data dari total ${mergedData.length} siswa`}
              className="border-gray-100 bg-gray-50/50"
            />
          )}
        </div>
      </div>
    </main>
  );
}