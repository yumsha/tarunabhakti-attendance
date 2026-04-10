import { useState, useEffect } from "react";
import { kelas, absensiSiswa, detailAbsensi } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";

const formatClassName = (cls) => {
  if (!cls) return "";
  return `${cls.kelas} ${cls.jurusan?.nama_jurusan || ""}`;
};

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>;
  const map = {
    TEPAT_WAKTU: { label: "Tepat Waktu", cls: "bg-green-100 text-green-700" },
    TELAMBAT:    { label: "Terlambat",   cls: "bg-red-100 text-red-700" },
    HADIR:       { label: "Hadir",       cls: "bg-green-100 text-green-700" },
    IZIN:        { label: "Izin",        cls: "bg-yellow-100 text-yellow-700" },
    SAKIT:       { label: "Sakit",       cls: "bg-blue-100 text-blue-700" },
    ALPHA:       { label: "Alpha",       cls: "bg-gray-100 text-gray-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function KehadiranTable() {
  const [classList, setClassList]             = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [attendanceData, setAttendanceData]   = useState([]);
  const [loading, setLoading]                 = useState(false);
  const [filterDate, setFilterDate]           = useState(
    new Date().toISOString().split("T")[0]
  );
  // per-row konfirmasi state: { [absensiId]: "idle"|"loading"|"done"|"error" }
  const [konfirmasiState, setKonfirmasiState] = useState({});

  // ── sync URL ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const syncWithUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("kelasId");
      if (id) setSelectedClassId(id);
    };
    syncWithUrl();
    window.addEventListener("popstate", syncWithUrl);
    document.addEventListener("astro:page-load", syncWithUrl);
    return () => {
      window.removeEventListener("popstate", syncWithUrl);
      document.removeEventListener("astro:page-load", syncWithUrl);
    };
  }, []);

  // ── fetch kelas ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await kelas.list();
        if (res.success && res.data) {
          setClassList(res.data);
          const params = new URLSearchParams(window.location.search);
          if (!params.get("kelasId") && res.data.length > 0) {
            setSelectedClassId(res.data[0].id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch classes", e);
      }
    };
    fetchClasses();
  }, []);

  // ── fetch absensi ───────────────────────────────────────────────────────────
  // Data dari DB sudah include status konfirmasi (setelah backend patch)
  // Setiap ganti filter, data fresh dari DB → konfirmasi persist otomatis
  const fetchAttendance = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        kelas_id: selectedClassId,
        tanggal:  filterDate,
      });
      const res = await absensiSiswa.list(params.toString());
      if (res.success) {
        setAttendanceData(res.data);
        setKonfirmasiState({});
      } else {
        setAttendanceData([]);
      }
    } catch (e) {
      console.error("Failed to fetch attendance", e);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAttendance(); }, [selectedClassId, filterDate]);

  // ── konfirmasi single row ───────────────────────────────────────────────────
  // Flow:
  // 1. Ambil guru_id dari localStorage
  // 2. Call detailAbsensi.absensiGuru({ guru_id })
  //    → backend cek jadwal aktif guru, lalu create detailAbsensiSiswa HADIR di DB
  // 3. Refetch data agar status dari DB masuk (persist after refresh)
  const handleKonfirmasi = async (item) => {
    const absensiId = item.id;
    setKonfirmasiState((prev) => ({ ...prev, [absensiId]: "loading" }));

    try {
      const userStr = localStorage.getItem("user");
      const user    = userStr ? JSON.parse(userStr) : null;
      const guru_id = user?.guru?.id;

      if (!guru_id) throw new Error("Guru ID tidak ditemukan di session");

      const res = await detailAbsensi.absensiGuru({ guru_id });

      if (!res?.success) throw new Error(res?.message || "Gagal konfirmasi");

      setKonfirmasiState((prev) => ({ ...prev, [absensiId]: "done" }));

      // Optimistic update lokal + refetch untuk sync dengan DB
      setAttendanceData((prev) =>
        prev.map((d) => d.id === absensiId ? { ...d, _confirmed: true } : d)
      );

      // Refetch setelah sedikit delay biar DB sempat commit
      setTimeout(() => fetchAttendance(), 800);

    } catch (err) {
      console.error("Konfirmasi error:", err);
      setKonfirmasiState((prev) => ({ ...prev, [absensiId]: "error" }));
    }
  };

  // ── konfirmasi semua ─────────────────────────────────────────────────────────
  const handleKonfirmasiSemua = async () => {
    const userStr = localStorage.getItem("user");
    const user    = userStr ? JSON.parse(userStr) : null;
    const guru_id = user?.guru?.id;
    if (!guru_id) return;

    // Mark semua loading
    const ids = attendanceData
      .filter((d) => d.tap_in && !d._confirmed && konfirmasiState[d.id] !== "done")
      .map((d) => d.id);

    const loadingMap = Object.fromEntries(ids.map((id) => [id, "loading"]));
    setKonfirmasiState((prev) => ({ ...prev, ...loadingMap }));

    try {
      const res = await detailAbsensi.absensiGuru({ guru_id });
      if (!res?.success) throw new Error(res?.message);

      const doneMap = Object.fromEntries(ids.map((id) => [id, "done"]));
      setKonfirmasiState((prev) => ({ ...prev, ...doneMap }));

      setAttendanceData((prev) =>
        prev.map((d) => ids.includes(d.id) ? { ...d, _confirmed: true } : d)
      );

      setTimeout(() => fetchAttendance(), 800);
    } catch (err) {
      console.error("Konfirmasi semua error:", err);
      const errMap = Object.fromEntries(ids.map((id) => [id, "error"]));
      setKonfirmasiState((prev) => ({ ...prev, ...errMap }));
    }
  };

  const selectedClass = classList.find((c) => c.id == selectedClassId);

  const totalDone = attendanceData.filter(
    (d) => d._confirmed || konfirmasiState[d.id] === "done"
  ).length;

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <PageHeader
        title={selectedClass ? `Kehadiran ${formatClassName(selectedClass)}` : "Kehadiran Siswa"}
        right={
          attendanceData.length > 0 ? (
            <button
              onClick={handleKonfirmasiSemua}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              Konfirmasi Semua
            </button>
          ) : null
        }
      />

      <div className="flex-1 overflow-auto p-8">
        {/* Filter + progress */}
        <div className="flex items-center flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
            <span className="text-gray-500 text-sm">Tanggal:</span>
            <input
              type="date"
              className="outline-none text-sm text-gray-700 bg-transparent"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {attendanceData.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(totalDone / attendanceData.length) * 100}%` }}
                />
              </div>
              <span className="text-xs">{totalDone}/{attendanceData.length} dikonfirmasi</span>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm text-gray-500">
              {loading ? "Memuat…" : (
                <><span className="font-semibold text-gray-700">{attendanceData.length}</span> data ditemukan</>
              )}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80">
                <tr>
                  {["Nama", "NISN", "No Telp", "Waktu Tap In", "Status Tap In", "Status Absensi", "Aksi"].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : attendanceData.length > 0 ? (
                  attendanceData.map((item) => {
                    const kState = konfirmasiState[item.id] ?? "idle";
                    const isDone = kState === "done" || item._confirmed;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors duration-150 ${isDone ? "bg-green-50/40" : "hover:bg-blue-50/30"}`}
                      >
                        {/* Nama */}
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.siswa?.nama ?? "-"}
                        </td>

                        {/* NISN — perlu patch getAllAbsensi di backend */}
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                          {item.siswa?.NISN ?? "-"}
                        </td>

                        {/* No Telp — perlu patch getAllAbsensi di backend */}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.siswa?.nomor_telepon ?? "-"}
                        </td>

                        {/* Waktu Tap In */}
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.tap_in ?? "-"}
                        </td>

                        {/* Status Tap In */}
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status_tapin} />
                        </td>

                        {/* Status Absensi */}
                        <td className="px-6 py-4">
                          {isDone
                            ? <StatusBadge status="HADIR" />
                            : <span className="text-xs text-gray-400">Belum dikonfirmasi</span>
                          }
                        </td>

                        {/* Aksi */}
                        <td className="px-6 py-4">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Hadir
                            </span>
                          ) : kState === "error" ? (
                            <button
                              onClick={() => handleKonfirmasi(item)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-200 hover:bg-red-100 transition"
                            >
                              Coba Lagi
                            </button>
                          ) : (
                            <button
                              onClick={() => handleKonfirmasi(item)}
                              disabled={kState === "loading" || !item.tap_in}
                              title={!item.tap_in ? "Siswa belum tap in" : "Konfirmasi sebagai HADIR"}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium border border-blue-200 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                              {kState === "loading" ? (
                                <>
                                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                  </svg>
                                  Memproses…
                                </>
                              ) : "Konfirmasi"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <p className="text-sm text-gray-400">Tidak ada data absensi untuk filter ini.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 text-center">
            Menampilkan {attendanceData.length} data
          </div>
        </div>
      </div>
    </main>
  );
}