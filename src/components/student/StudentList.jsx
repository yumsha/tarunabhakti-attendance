import { useState, useEffect } from "react";
import { siswa, kelas } from "../../lib/backendApi";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState({ excel: false, pdf: false });
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

  // Reset page ke 1 setiap kali filter kelas berubah
  useEffect(() => {
    setPage(1);
  }, [selectedKelas]);

  // Fetch siswa
  useEffect(() => {
    const fetchStudents = async () => {
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

        const queryParams = { page: page.toString(), limit: "10" };
        if (role === "WALAS" && guruId) queryParams.walas_id = guruId.toString();
        if (selectedKelas) queryParams.kelas_id = selectedKelas;

        const queryString = new URLSearchParams(queryParams).toString();
        console.log("Fetching siswa with query:", queryString);

        const res = await siswa.list(queryString);
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
  }, [page, selectedKelas]);

  const handleKelasChange = (e) => {
    setSelectedKelas(e.target.value);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildExportParams = () => {
    const params = new URLSearchParams();
    if (selectedKelas) params.set("kelas_id", selectedKelas);
    return params.toString();
  };

  const handleExportExcel = async () => {
    setExporting(prev => ({ ...prev, excel: true }));
    try {
      const token = localStorage.getItem("accessToken");
      const query = buildExportParams();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/export/siswa/excel${query ? `?${query}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const suffix = selectedKelas
        ? `_${kelasList.find(k => k.id.toString() === selectedKelas)?.kelas ?? selectedKelas}`
        : "";
      downloadBlob(blob, `Data_Siswa${suffix}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Export Excel error:", err);
      setError("Gagal mengekspor Excel");
    } finally {
      setExporting(prev => ({ ...prev, excel: false }));
    }
  };

  const handleExportPdf = async () => {
    setExporting(prev => ({ ...prev, pdf: true }));
    try {
      const token = localStorage.getItem("accessToken");
      const query = buildExportParams();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/export/siswa/pdf${query ? `?${query}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const suffix = selectedKelas
        ? `_${kelasList.find(k => k.id.toString() === selectedKelas)?.kelas ?? selectedKelas}`
        : "";
      downloadBlob(blob, `Data_Siswa${suffix}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("Export PDF error:", err);
      setError("Gagal mengekspor PDF");
    } finally {
      setExporting(prev => ({ ...prev, pdf: false }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border-b border-red-200 text-sm">
          {error}
        </div>
      )}

      {/* Toolbar: Filter + Export */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
        {/* Filter Kelas */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Filter Kelas:</label>
          <select
            value={selectedKelas}
            onChange={handleKelasChange}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.id.toString()}>
                {k.kelas} {k.jurusan}
              </option>
            ))}
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPdf}
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
            onClick={handleExportExcel}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">No Telp</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">NIPD</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">NISN</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nama Orang Tua</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                  <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-28" /></td>
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
                  <td className="px-6 py-4 text-sm text-gray-900">{student.nomor_telepon}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.NIPD}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.NISN}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{student.orang_tua?.nama_orangtua || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  Tidak ada data siswa{selectedKelas ? " untuk kelas ini" : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            page === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className={`px-3 py-1 rounded-md text-sm font-medium ${
            page === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
}