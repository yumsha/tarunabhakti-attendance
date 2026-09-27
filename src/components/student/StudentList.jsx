import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { siswa, kelas } from "../../lib/backendApi";
import Pagination from "../layout/Pagination.jsx";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

const resolveRoles = (userData) => {
  const fromRoles = Array.isArray(userData?.roles)
    ? userData.roles.map((r) => r?.name).filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
  const fromUserRole = Array.isArray(userData?.userRole)
    ? userData.userRole.map((r) => r?.role?.name).filter(Boolean)
    : [];
  const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
  const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];

  const merged = [
    ...fromRoles,
    ...fromRoleNames,
    ...fromUserRole,
    ...fromRoleObj,
    ...fromRoleStr,
  ]
    .filter(Boolean)
    .map((r) => String(r).toUpperCase());

  const normalized = merged.map((r) => (r === "WALI KELAS" ? "WALAS" : r));
  return Array.from(new Set(normalized));
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// Ambil no telp ortu dari berbagai kemungkinan bentuk field
const getNoTelpOrtu = (student) => {
  return (
    student?.orang_tua?.nomor_telepon ||
    "-"
  );
};

const getNamaOrtu = (student) => {
  return (
    student?.orang_tua?.nama_orangtua ||
    student?.orangTua?.nama_orangtua ||
    "-"
  );
};

// -----------------------------------------------------------------------
// Dropdown Searchable Select Kelas Component
// -----------------------------------------------------------------------

function SearchableSelectKelas({ value, onChange, kelasList, isWalas, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 220 });
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  const updateCoords = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
    });
  };

  useEffect(() => {
    if (!open) return;
    updateCoords();

    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    const handleReposition = () => updateCoords();

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kelasList;
    return kelasList.filter((k) => {
      const label = `${k.kelas ?? ""} ${k.jurusan ?? ""}`.toLowerCase();
      return label.includes(q);
    });
  }, [kelasList, query]);

  const getSelectedLabel = () => {
    if (value === "walas") return "Kelas Saya (Walas)";
    if (value === "all" || !value) return "Semua Kelas";
    const found = kelasList.find((k) => String(k.id) === String(value));
    return found ? `${found.kelas} ${found.jurusan ?? ""}` : "Pilih Kelas...";
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          "flex items-center justify-between gap-2 rounded-lg border bg-gray-50 px-3 py-1.5 text-sm transition min-w-[200px] " +
          (open
            ? "border-transparent ring-2 ring-blue-500 bg-white"
            : "border-gray-200 hover:border-gray-300") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        <span className={value && value !== "all" ? "text-gray-800 font-medium" : "text-gray-500"}>
          {getSelectedLabel()}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-gray-400">
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
          className="z-[999] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl mt-1 animate-dropdown"
        >
          <div className="border-b border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1">
              <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kelas atau jurusan..."
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              ) : null}
            </div>
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            {isWalas && (
              <li
                onClick={() => { onChange("walas"); setOpen(false); setQuery(""); }}
                className={
                  "flex cursor-pointer items-center justify-between px-4 py-2 text-sm transition " +
                  (value === "walas" ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50")
                }
              >
                <span>Kelas Saya (Walas)</span>
                {value === "walas" ? <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> : null}
              </li>
            )}
            <li
              onClick={() => { onChange("all"); setOpen(false); setQuery(""); }}
              className={
                "flex cursor-pointer items-center justify-between px-4 py-2 text-sm transition " +
                (value === "all" || !value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50")
              }
            >
              <span>Semua Kelas</span>
              {(value === "all" || !value) ? <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> : null}
            </li>

            {filtered.length === 0 ? (
              query && <li className="px-4 py-4 text-center text-sm text-gray-400">Kelas tidak ditemukan</li>
            ) : (
              filtered.map((kls) => {
                const isSelected = String(kls.id) === String(value);
                return (
                  <li
                    key={kls.id}
                    onClick={() => { onChange(String(kls.id)); setOpen(false); setQuery(""); }}
                    className={
                      "flex cursor-pointer items-center justify-between px-4 py-2 text-sm transition " +
                      (isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 hover:bg-gray-50")
                    }
                  >
                    <span>{kls.kelas} {kls.jurusan ?? ""}</span>
                    {isSelected ? <svg className="h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState({ excel: false, pdf: false });
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [roles, setRoles] = useState(null);
  const [userData, setUserData] = useState(null);

  // -----------------------------------------------------------------------
  // Derived roles
  // -----------------------------------------------------------------------

  const { isWalas, canSeeAllKelas } = useMemo(() => {
    if (!roles) return { isWalas: false, canSeeAllKelas: false };
    return {
      isWalas: roles.includes("WALAS"),
      canSeeAllKelas: roles.includes("ADMIN") || roles.includes("KESISWAAN"),
    };
  }, [roles]);

  // -----------------------------------------------------------------------
  // Load user dari localStorage
  // -----------------------------------------------------------------------

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      setRoles([]);
      return;
    }
    try {
      const parsed = JSON.parse(userStr);
      setUserData(parsed);
      const resolved = resolveRoles(parsed);
      setRoles(resolved.length > 0 ? resolved : ["UNKNOWN"]);
    } catch (e) {
      console.error("Error parsing user:", e);
      setRoles([]);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Fetch daftar kelas — hanya untuk admin & kesiswaan (untuk dropdown)
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!roles || !canSeeAllKelas) return;

    const fetchKelas = async () => {
      try {
        const res = await kelas.list("limit=100");
        if (res.success && res.data) setKelasList(res.data);
      } catch (err) {
        console.error("Error fetching kelas:", err);
      }
    };

    fetchKelas();
  }, [roles, canSeeAllKelas]);

  // Set default filter based on roles

  useEffect(() => {
    if (roles && selectedKelas === "") {
      setSelectedKelas(roles.includes("WALAS") ? "walas" : "all");
    }
  }, [roles]);

  // Reset page saat filter kelas berubah

  useEffect(() => {
    setPage(1);
  }, [selectedKelas]);

  // Fetch siswa

  useEffect(() => {
    if (!roles || !userData || !selectedKelas) return;

    const fetchStudents = async () => {
      setLoading(true);
      setError("");
      try {
        const queryParams = { page: page.toString(), limit: "10" };

        if (selectedKelas === "walas" && userData?.guru?.id) {
          queryParams.walas_id = userData.guru.id.toString();
        } else if (selectedKelas !== "all" && selectedKelas !== "walas") {
          queryParams.kelas_id = selectedKelas;
        }

        const res = await siswa.list(new URLSearchParams(queryParams).toString());

        if (res.success) {
          setStudents(res.data);
          setTotalPages(res.pagination?.totalPages ?? 1);
        } else {
          setError(res.message || "Gagal memuat data siswa");
        }
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [page, selectedKelas, roles, userData]);

  // Export helpers
  const buildExportParams = () => {
    const params = new URLSearchParams();
    if (selectedKelas === "walas" && userData?.guru?.id) {
      params.set("walas_id", userData.guru.id.toString());
    } else if (selectedKelas !== "all" && selectedKelas !== "walas") {
      params.set("kelas_id", selectedKelas);
    }
    return params.toString();
  };

  const getFileSuffix = () => {
    if (selectedKelas === "walas") return "_Kelas_Saya";
    if (selectedKelas === "all") return "_Semua_Kelas";
    const found = kelasList.find((k) => k.id.toString() === selectedKelas);
    return found
      ? `_${found.kelas}${found.jurusan ? `_${found.jurusan}` : ""}`
      : `_${selectedKelas}`;
  };

  // Ambil SEMUA data siswa sesuai filter aktif (bukan cuma 1 halaman) untuk keperluan export
  const fetchAllStudentsForExport = async () => {
    const queryParams = { page: "1", limit: "10000" };
    if (selectedKelas === "walas" && userData?.guru?.id) {
      queryParams.walas_id = userData.guru.id.toString();
    } else if (selectedKelas !== "all" && selectedKelas !== "walas") {
      queryParams.kelas_id = selectedKelas;
    }
    const res = await siswa.list(new URLSearchParams(queryParams).toString());
    if (!res?.success) {
      throw new Error(res?.message || "Gagal memuat data siswa untuk export");
    }
    return res.data || [];
  };

  const toExportRows = (data) =>
    data.map((s) => ({
      Nama: s.nama || "-",
      Kelas: s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-",
      NIPD: s.nipd || s.NIPD || "-",
      NISN: s.nisn || s.NISN || "-",
      NIK: s.nik || s.NIK || "-",
      "Nama Orang Tua": getNamaOrtu(s),
      "No Telp Ortu": getNoTelpOrtu(s),
    }));

  // Export Excel di sisi client (browser), tidak butuh backend
  const exportExcelClientSide = async (data) => {
    const XLSX = await import("xlsx");
    const rows = toExportRows(data);
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom otomatis biar rapi
    worksheet["!cols"] = [
      { wch: 25 }, // Nama
      { wch: 15 }, // Kelas
      { wch: 12 }, // NIPD
      { wch: 12 }, // NISN
      { wch: 18 }, // NIK
      { wch: 25 }, // Nama Orang Tua
      { wch: 18 }, // No Telp Ortu
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Siswa");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const date = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `Data_Siswa${getFileSuffix()}_${date}.xlsx`);
  };

  // Export PDF di sisi client (browser), tidak butuh backend
  const exportPdfClientSide = async (data) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape", unit: "pt" });

    doc.setFontSize(14);
    doc.text("Data Siswa", 40, 40);

    doc.setFontSize(10);
    const date = new Date().toISOString().split("T")[0];
    doc.text(`Tanggal export: ${date}`, 40, 58);

    autoTable(doc, {
      startY: 75,
      head: [["Nama", "Kelas", "NIPD", "NISN", "NIK", "Nama Orang Tua", "No Telp Ortu"]],
      body: data.map((s) => [
        s.nama || "-",
        s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "-",
        s.nipd || s.NIPD || "-",
        s.nisn || s.NISN || "-",
        s.nik || s.NIK || "-",
        getNamaOrtu(s),
        getNoTelpOrtu(s),
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 40, right: 40 },
    });

    doc.save(`Data_Siswa${getFileSuffix()}_${date}.pdf`);
  };

  // Coba backend dulu, kalau 404 / gagal diakses -> fallback ke client-side
  const tryBackendExport = async (endpoint, token, query) => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      // Tidak ada base URL dikonfigurasi, langsung anggap backend tidak tersedia
      return { ok: false, notAvailable: true };
    }

    try {
      const res = await fetch(
        `${apiUrl}/export/siswa/${endpoint}${query ? `?${query}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 404) {
        // Endpoint memang belum ada di backend
        return { ok: false, notAvailable: true };
      }

      if (!res.ok) {
        // Endpoint ada tapi error asli (401/403/500/dll) -> jangan disembunyikan
        const text = await res.text().catch(() => "");
        throw new Error(`Export dari server gagal (status ${res.status}) ${text}`.trim());
      }

      const blob = await res.blob();
      return { ok: true, blob };
    } catch (err) {
      if (err instanceof TypeError) {
        // Network error / CORS / server mati -> anggap backend tidak tersedia, fallback
        console.warn("Backend export tidak dapat diakses, fallback ke client-side:", err);
        return { ok: false, notAvailable: true };
      }
      // Error asli dari server (bukan network) -> lempar supaya user tahu
      throw err;
    }
  };

  const handleExport = async (type) => {
    const isExcel = type === "excel";
    setExporting((prev) => ({ ...prev, [type]: true }));
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      const query = buildExportParams();
      const endpoint = isExcel ? "excel" : "pdf";

      const result = await tryBackendExport(endpoint, token, query);

      if (result.ok) {
        const date = new Date().toISOString().split("T")[0];
        const ext = isExcel ? "xlsx" : "pdf";
        downloadBlob(result.blob, `Data_Siswa${getFileSuffix()}_${date}.${ext}`);
      } else {
        // Fallback: generate file langsung di browser
        const allData = await fetchAllStudentsForExport();
        if (allData.length === 0) {
          setError("Tidak ada data siswa untuk diexport pada filter ini");
          return;
        }
        if (isExcel) {
          await exportExcelClientSide(allData);
        } else {
          await exportPdfClientSide(allData);
        }
      }
    } catch (err) {
      console.error(`Export ${type} error:`, err);
      setError(`Gagal mengekspor ${isExcel ? "Excel" : "PDF"}: ${err.message || ""}`);
    } finally {
      setExporting((prev) => ({ ...prev, [type]: false }));
    }
  };

  //
  // Render: belum load roles
  //

  if (roles === null) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-400 text-sm italic">
        Memuat...
      </div>
    );
  }

  // Render utama
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border-b border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Toolbar: Filter + Export */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">

        {/* Dropdown filter kelas — hanya tampil untuk admin & kesiswaan */}
        {canSeeAllKelas && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium whitespace-nowrap">
              Filter Kelas:
            </label>
            <SearchableSelectKelas
              value={selectedKelas}
              onChange={setSelectedKelas}
              kelasList={kelasList}
              isWalas={isWalas}
            />
          </div>
        )}

        {/* Spacer jika walas (tidak ada dropdown, export tetap di kanan) */}
        {isWalas && !canSeeAllKelas && <div />}

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting.pdf}
            className="flex items-center gap-2 px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {exporting.pdf ? (
              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            Unduh PDF
          </button>

          <button
            onClick={() => handleExport("excel")}
            disabled={exporting.excel}
            className="flex items-center gap-2 px-4 py-2 border border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            {exporting.excel ? (
              <span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
            Unduh Excel
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Kelas</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">NIPD</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">NISN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">NIK</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama Orang Tua</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">No Telp Ortu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                </tr>
              ))
            ) : students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">{student.nama}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {student.kelas
                      ? `${student.kelas.kelas} ${student.kelas.jurusan ?? ""}`.trim()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.nipd || student.NIPD || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.nisn || student.NISN || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.nik || student.NIK || "-"}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getNamaOrtu(student)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{getNoTelpOrtu(student)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  Tidak ada data siswa{selectedKelas && selectedKelas !== "all" ? " untuk filter ini" : ""}.
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
        summary={`Halaman ${page} dari ${totalPages}`}
        className="border-gray-200 bg-white"
      />
    </div>
  );
}