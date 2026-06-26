import { useState, useEffect, useCallback, useMemo } from "react";
import { kelas, tahunAjaran, finalAbsensi } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
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
      <td colSpan={9} className="px-4 py-3">
        <div className="h-4 bg-gray-100 rounded-full animate-pulse" />
      </td>
    </tr>
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
          tahun_id: item.kelas.tahun_ajaran_id || item.kelas.tahun_id || item.kelas.tahun?.id || null,
          tahun: item.kelas.tahun || null,
          walas: item.kelas.walas || null,
        };
      }
      return {
        id: item.id,
        kelas: item.kelas || item.nama_kelas || "",
        jurusan: item.jurusan || "",
        tahun_id: item.tahun_ajaran_id || item.tahun_id || item.tahun?.id || null,
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

export default function ExportKehadiranMain() {
  // Data states
  const [classList, setClassList] = useState([]);
  const [tahunList, setTahunList] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingAttendance, setFetchingAttendance] = useState(false);

  // Filter states
  const [tanggal, setTanggal] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [selectedJurusan, setSelectedJurusan] = useState("");
  const [selectedKelas, setSelectedKelas] = useState("");
  const [selectedTahun, setSelectedTahun] = useState("");
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

  // Get unique jurusan values
  const jurusanList = useMemo(() => {
    const set = new Set();
    classList.forEach((k) => {
      if (k.jurusan) set.add(k.jurusan);
    });
    return Array.from(set).sort();
  }, [classList]);

  // Filter kelas based on selected filters
  const filteredKelasList = useMemo(() => {
    return classList.filter((k) => {
      if (selectedJurusan && k.jurusan !== selectedJurusan) return false;
      if (selectedTahun && String(k.tahun_id || k.tahun?.id) !== selectedTahun) return false;
      return true;
    });
  }, [classList, selectedJurusan, selectedTahun]);

  // Fetch attendance data based on filters
  const fetchAttendance = useCallback(async () => {
    if (!tanggal && !tanggalMulai && !tanggalAkhir) {
      setAttendanceData([]);
      return;
    }

    setFetchingAttendance(true);
    try {
      const params = new URLSearchParams({ limit: "1000" });
      if (tanggal) params.set("tanggal", tanggal);
      if (tanggalMulai && tanggalAkhir) {
        params.set("tanggal_mulai", tanggalMulai);
        params.set("tanggal_akhir", tanggalAkhir);
      }
      if (selectedJurusan) params.set("jurusan", selectedJurusan);
      if (selectedKelas) params.set("kelas_id", selectedKelas);
      if (selectedTahun) params.set("tahun_ajaran_id", selectedTahun);
      if (searchTerm) params.set("search", searchTerm);

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
        NISN: a.NISN,
        kelas_nama: a.kelas?.kelas || "",
        jurusan: a.kelas?.jurusan || "",
        tahun_ajaran: a.kelas?.tahun?.tahun_ajaran || "",
        tap_in: a.tap_in || null,
        tap_out: a.tap_out || null,
        status_tapin: a.status_tapin || null,
        status_saat_ini: a.status_final || null,
        tanggal: a.tanggal,
      })));
    } catch (e) {
      console.error("Failed to fetch attendance", e);
      setAttendanceData([]);
    } finally {
      setFetchingAttendance(false);
    }
  }, [tanggal, tanggalMulai, tanggalAkhir, selectedJurusan, selectedKelas, selectedTahun, searchTerm]);

  // Auto-fetch when filters change
  useEffect(() => {
    if (tanggal || (tanggalMulai && tanggalAkhir)) {
      fetchAttendance();
    } else {
      setAttendanceData([]);
    }
  }, [tanggal, tanggalMulai, tanggalAkhir, selectedJurusan, selectedKelas, selectedTahun, searchTerm, fetchAttendance]);

  // Only show data when a date filter is applied
  const hasDateFilter = tanggal || (tanggalMulai && tanggalAkhir);
  const mergedData = useMemo(() => (hasDateFilter ? attendanceData : []), [hasDateFilter, attendanceData]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(mergedData.length / pageSize));
  const pagedData = mergedData.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedJurusan, selectedKelas, selectedTahun, tanggal, tanggalMulai, tanggalAkhir]);

  // Export to PDF
  const handleExportPdf = () => {
    const doc = new jsPDF("landscape");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Data Kehadiran Siswa", 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let yPos = 24;
    if (tanggal) {
      doc.text(`Tanggal: ${tanggal}`, 14, yPos);
      yPos += 6;
    }
    if (tanggalMulai && tanggalAkhir) {
      doc.text(`Rentang Tanggal: ${tanggalMulai} s/d ${tanggalAkhir}`, 14, yPos);
      yPos += 6;
    }
    if (selectedJurusan) {
      doc.text(`Jurusan: ${selectedJurusan}`, 14, yPos);
      yPos += 6;
    }
    if (selectedKelas) {
      const kelasInfo = classList.find((k) => String(k.id) === String(selectedKelas));
      doc.text(`Kelas: ${kelasInfo?.kelas || selectedKelas}`, 14, yPos);
      yPos += 6;
    }
    if (selectedTahun) {
      const tahunInfo = tahunList.find((t) => String(t.id) === String(selectedTahun));
      doc.text(`Tahun Ajaran: ${tahunInfo?.tahun_ajaran || selectedTahun}`, 14, yPos);
      yPos += 6;
    }
    doc.text(`Total Data: ${mergedData.length} siswa`, 14, yPos);
    yPos += 10;

    const headers = ["No", "Nama", "NISN", "Kelas", "Jurusan", "Tanggal", "Tap In", "Tap Out", "Status"];
    const body = mergedData.map((row, idx) => [
      idx + 1,
      row.nama || "-",
      row.NISN || "-",
      row.kelas_nama || "-",
      row.jurusan || "-",
      row.tanggal ? new Date(row.tanggal).toLocaleDateString("id-ID") : "-",
      row.tap_in || "-",
      row.tap_out || "-",
      row.status_saat_ini || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`Kehadiran_Siswa_${getTodayWIB()}.pdf`);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Header info
    const infoRows = [
      ["DATA KEHADIRAN SISWA"],
      [""],
    ];
    if (tanggal) infoRows.push([`Tanggal: ${tanggal}`]);
    if (tanggalMulai && tanggalAkhir) infoRows.push([`Rentang Tanggal: ${tanggalMulai} s/d ${tanggalAkhir}`]);
    if (selectedJurusan) infoRows.push([`Jurusan: ${selectedJurusan}`]);
    if (selectedKelas) {
      const kelasInfo = classList.find((k) => String(k.id) === String(selectedKelas));
      infoRows.push([`Kelas: ${kelasInfo?.kelas || selectedKelas}`]);
    }
    if (selectedTahun) {
      const tahunInfo = tahunList.find((t) => String(t.id) === String(selectedTahun));
      infoRows.push([`Tahun Ajaran: ${tahunInfo?.tahun_ajaran || selectedTahun}`]);
    }
    infoRows.push([`Total Data: ${mergedData.length} siswa`]);
    infoRows.push([""]);

    // Column headers
    infoRows.push(["No", "Nama", "NISN", "Kelas", "Jurusan", "Tanggal", "Tap In", "Tap Out", "Status"]);

    // Data rows
    mergedData.forEach((row, idx) => {
      infoRows.push([
        idx + 1,
        row.nama || "-",
        row.NISN || "-",
        row.kelas_nama || "-",
        row.jurusan || "-",
        row.tanggal ? new Date(row.tanggal).toLocaleDateString("id-ID") : "-",
        row.tap_in || "-",
        row.tap_out || "-",
        row.status_saat_ini || "-",
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(infoRows);

    // Style definitions
    const titleStyle = {
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center", vertical: "center" },
    };

    const headerStyle = {
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "1D4ED8" } },
        bottom: { style: "thin", color: { rgb: "1D4ED8" } },
        left: { style: "thin", color: { rgb: "1D4ED8" } },
        right: { style: "thin", color: { rgb: "1D4ED8" } },
      },
    };

    const infoStyle = {
      font: { sz: 10, color: { rgb: "1E3A8A" } },
      fill: { fgColor: { rgb: "EFF6FF" } },
      alignment: { horizontal: "left", vertical: "center" },
    };

    // Apply title style
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];
    cols.forEach((c) => {
      if (!ws[`${c}1`]) ws[`${c}1`] = { t: "s", v: "" };
      ws[`${c}1`].s = titleStyle;
    });

    // Apply info styles
    for (let r = 2; r < infoRows.length; r++) {
      cols.forEach((c) => {
        if (!ws[`${c}${r}`]) ws[`${c}${r}`] = { t: "s", v: "" };
        ws[`${c}${r}`].s = infoStyle;
      });
    }

    // Apply header row style (last info row + 1)
    const headerRowIdx = infoRows.length;
    cols.forEach((c) => {
      if (!ws[`${c}${headerRowIdx}`]) ws[`${c}${headerRowIdx}`] = { t: "s", v: "" };
      ws[`${c}${headerRowIdx}`].s = headerStyle;
    });

    // Column widths
    ws["!cols"] = [
      { wch: 6 },  // No
      { wch: 30 }, // Nama
      { wch: 15 }, // NISN
      { wch: 10 }, // Kelas
      { wch: 15 }, // Jurusan
      { wch: 15 }, // Tanggal
      { wch: 10 }, // Tap In
      { wch: 10 }, // Tap Out
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Kehadiran Siswa");
    XLSX.writeFile(wb, `Kehadiran_Siswa_${getTodayWIB()}.xlsx`);
  };

  // Clear all filters
  const clearFilters = () => {
    setTanggal("");
    setTanggalMulai("");
    setTanggalAkhir("");
    setSelectedJurusan("");
    setSelectedKelas("");
    setSelectedTahun("");
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

            {/* Tanggal */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => {
                  setTanggal(e.target.value);
                  if (e.target.value) {
                    setTanggalMulai("");
                    setTanggalAkhir("");
                  }
                }}
                className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
              />
            </div>

            {/* Range Tanggal */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => {
                  setTanggalMulai(e.target.value);
                  if (e.target.value) setTanggal("");
                }}
                className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                placeholder="Dari"
              />
              <span className="text-gray-400 text-xs">s/d</span>
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => {
                  setTanggalAkhir(e.target.value);
                  if (e.target.value) setTanggal("");
                }}
                className="outline-none text-sm text-gray-700 bg-transparent cursor-pointer"
                placeholder="Sampai"
              />
            </div>

            {/* Jurusan */}
            <select
              value={selectedJurusan}
              onChange={(e) => {
                setSelectedJurusan(e.target.value);
                setSelectedKelas("");
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
            >
              <option value="">Semua Jurusan</option>
              {jurusanList.map((j) => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>

            {/* Kelas */}
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
            >
              <option value="">Semua Kelas</option>
              {filteredKelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.kelas} {k.jurusan ? `- ${k.jurusan}` : ""}
                </option>
              ))}
            </select>

            {/* Tahun Ajaran */}
            <select
              value={selectedTahun}
              onChange={(e) => {
                setSelectedTahun(e.target.value);
                setSelectedKelas("");
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-gray-50"
            >
              <option value="">Semua Tahun Ajaran</option>
              {tahunList.map((t) => (
                <option key={t.id} value={t.id}>{t.tahun_ajaran}</option>
              ))}
            </select>
          </div>
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
                <span className="text-gray-400 italic">Pilih tanggal atau rentang tanggal untuk menampilkan data</span>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tap In</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tap Out</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading || fetchingAttendance ? (
                  [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
                ) : pagedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-10 h-10 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm text-gray-400">
                          {!hasDateFilter
                            ? "Pilih tanggal atau rentang tanggal untuk menampilkan data kehadiran."
                            : searchTerm || selectedJurusan || selectedKelas || selectedTahun
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
                        {row.tanggal ? new Date(row.tanggal).toLocaleDateString("id-ID") : "-"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {row.tap_in ? (
                          <span className="font-medium">{row.tap_in}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {row.tap_out ? (
                          <span className="font-medium">{row.tap_out}</span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
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
