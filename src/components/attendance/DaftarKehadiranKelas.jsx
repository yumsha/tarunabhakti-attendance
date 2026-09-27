import { useState, useEffect } from "react";
import { jadwal } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";
import Pagination from "../layout/Pagination.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import XLSX from "xlsx-js-style";

const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

function getTodayHari() {
  return HARI_MAP[new Date().getDay()];
}

function resolveRoles(userData) {
  const fromRoles = Array.isArray(userData?.roles)
    ? userData.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
  const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
  const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];

  return Array.from(
    new Set(
      [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
        .filter(Boolean)
        .map((item) => String(item).toUpperCase())
        .map((item) => (item === "WALI KELAS" ? "WALAS" : item))
    )
  );
}

function normalizeKelas(items = []) {
  return items
    .map((item) => {
      if (item?.kelas && typeof item.kelas === "object") {
        return {
          id: item.kelas.id,
          kelas: item.kelas.kelas,
          jurusan: item.kelas.jurusan || "",
          walas: item.kelas.walas || null,
          tahun: item.kelas.tahun || null,
        };
      }

      return item;
    })
    .filter((item) => item?.id != null)
    .filter((item, index, self) => index === self.findIndex((cls) => cls.id === item.id));
}

export default function DaftarKehadiranKelas() {
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const parsedUser = userStr ? JSON.parse(userStr) : null;
        const roles = resolveRoles(parsedUser);
        const guruId = parsedUser?.guru?.id;

        if (!guruId || !roles.includes("GURU") || roles.includes("WALAS")) {
          setClassList([]);
          return;
        }

        const res = await jadwal.list(`hari=${getTodayHari()}&guru_id=${guruId}`);
        if (res?.success && res.data) {
          setClassList(normalizeKelas(res.data));
        }
      } catch (e) {
        console.error("Failed to fetch classes", e);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const filteredClasses = classList.filter(
    (cls) =>
      cls.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.jurusan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const pagedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleDownloadPdf = (cls) => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Rekap Kehadiran - ${cls.kelas} ${cls.jurusan}`, 14, 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Tahun Ajaran: ${cls.tahun?.tahun_ajaran ?? "-"}`, 14, 24);
    doc.text(`Wali Kelas: ${cls.walas?.nama ?? "-"}`, 14, 30);
    autoTable(doc, {
      startY: 38,
      head: [["No", "Nama Siswa", "Hadir", "Izin", "Sakit", "Alpha"]],
      body: [],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`Kehadiran_${cls.kelas}_${cls.jurusan}.pdf`);
  };

  const handleDownloadExcel = (cls) => {
    const wb = XLSX.utils.book_new();

    // ── Data ──────────────────────────────────────────────
    const aoa = [
      ["REKAP KEHADIRAN SISWA", "", "", "", "", ""],
      [`Kelas: ${cls.kelas} ${cls.jurusan}`, "", "", "", "", ""],
      [`Tahun Ajaran: ${cls.tahun?.tahun_ajaran ?? "-"}`, "", "", "", "", ""],
      [`Wali Kelas: ${cls.walas?.nama ?? "-"}`, "", "", "", "", ""],
      ["", "", "", "", "", ""],
      ["No", "Nama Siswa", "Hadir", "Izin", "Sakit", "Alpha"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // ── Merge cells untuk header ───────────────────────────
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // REKAP KEHADIRAN SISWA
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Kelas
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Tahun Ajaran
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } }, // Wali Kelas
    ];

    // ── Column widths ──────────────────────────────────────
    ws["!cols"] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];

    // ── Row heights ────────────────────────────────────────
    ws["!rows"] = [
      { hpt: 30 }, // row 1 - judul
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 18 },
      { hpt: 8 }, // spacer
      { hpt: 22 }, // header kolom
    ];

    // ── Helper style builder ───────────────────────────────
    const style = (overrides = {}) => ({ ...overrides });

    // ── Style: Judul utama ─────────────────────────────────
    const titleStyle = style({
      font: { bold: true, sz: 14, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center", vertical: "center" },
    });

    // ── Style: Info rows ───────────────────────────────────
    const infoStyle = style({
      font: { sz: 10, color: { rgb: "1E3A8A" } },
      fill: { fgColor: { rgb: "EFF6FF" } },
      alignment: { horizontal: "left", vertical: "center" },
    });

    // ── Style: Header kolom ────────────────────────────────
    const headerStyle = style({
      font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "2563EB" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "1D4ED8" } },
        bottom: { style: "thin", color: { rgb: "1D4ED8" } },
        left: { style: "thin", color: { rgb: "1D4ED8" } },
        right: { style: "thin", color: { rgb: "1D4ED8" } },
      },
    });

    // ── Apply styles ───────────────────────────────────────
    const cols = ["A", "B", "C", "D", "E", "F"];

    // Row 1 - judul
    cols.forEach(c => {
      if (!ws[`${c}1`]) ws[`${c}1`] = { t: "s", v: "" };
      ws[`${c}1`].s = titleStyle;
    });

    // Row 2-4 - info
    [2, 3, 4].forEach(r => {
      cols.forEach(c => {
        if (!ws[`${c}${r}`]) ws[`${c}${r}`] = { t: "s", v: "" };
        ws[`${c}${r}`].s = infoStyle;
      });
    });

    // Row 6 - header kolom
    cols.forEach(c => {
      if (!ws[`${c}6`]) ws[`${c}6`] = { t: "s", v: "" };
      ws[`${c}6`].s = headerStyle;
    });

    // ── Selesai ────────────────────────────────────────────
    XLSX.utils.book_append_sheet(wb, ws, "Kehadiran");
    XLSX.writeFile(wb, `Kehadiran_${cls.kelas}_${cls.jurusan}.xlsx`);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <PageHeader
        title="Daftar Kehadiran Siswa"
        subtitle="Pilih kelas yang Anda ajar untuk melihat kehadiran siswa"
      />

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Search Bar Section */}
          <div className="p-4 border-b border-gray-100 bg-linear-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">

                <h3 className="text-sm font-semibold text-gray-700">Data Kelas</h3>

              </div>
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari kelas atau jurusan..."
                  className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white hover:bg-gray-50 transition-all text-sm w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div> 
                 
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Kelas</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jurusan</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Wali Kelas</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tahun Ajaran</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-48 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredClasses.length > 0 ? (
                pagedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {cls.kelas}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cls.jurusan || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cls.walas?.nama || "-"}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{cls.tahun?.tahun_ajaran || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownloadPdf(cls)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all border border-red-100 font-medium text-[11px]"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          Unduh PDF
                        </button>
                        <button
                          onClick={() => handleDownloadExcel(cls)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all border border-green-100 font-medium text-[11px]"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Unduh Excel
                        </button>

                        <button
                          onClick={() => window.location.href = `/dashboard/kehadiran?kelasId=${cls.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                        >
                          Lihat Kehadiran
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                    {searchTerm
                      ? `Tidak ada kelas yang cocok dengan "${searchTerm}".`
                      : "Tidak ada kelas mengajar yang ditemukan untuk hari ini."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!loading && filteredClasses.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={
                searchTerm
                  ? `Menampilkan ${pagedClasses.length} hasil pencarian dari ${filteredClasses.length} data, total kelas ${classList.length}`
                  : `Menampilkan ${pagedClasses.length} data dari total ${classList.length} kelas`
              }
              className="border-gray-100 bg-gray-50/50"
            />
          )}
        </div>
      </div>
    </main>
  );
}
