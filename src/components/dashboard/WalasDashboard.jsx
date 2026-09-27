import { useState, useEffect } from "react";
import { auth, kelas } from "../../lib/backendApi";
import WalasStudentStats from "../attendance/WalasStudentChart";
import WalasAttendanceChart from "../attendance/WalasAttendanceChart";
import WalasAttendanceTable from "../attendance/WalasAttendanceTable";
import PageHeader from "../layout/PageHeader.jsx";

export default function WalasDashboard() {
  const [user, setUser] = useState(null);
  const [walasKelas, setWalasKelas] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (_) {}

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    (async () => {
      try {
        const res = await auth.me();
        if (res?.success && res?.data) {
          setUser(res.data);
          try {
            localStorage.setItem("user", JSON.stringify(res.data));
          } catch (_) {}
        }
      } catch (_) {}
    })();
  }, []);

  // fetch walas' assigned kelas
  useEffect(() => {
    const fetchWalasKelas = async () => {
      if (!user) return;
      try {
        const guruId = user?.guru?.id;
        if (!guruId) return;

        // fetch semua kelas dan cari guru yg berstatus sbg walas
        const res = await kelas.list("limit=100");
        if (res.success && Array.isArray(res.data)) {
          const found = res.data.find(
            (k) =>
              k.walas?.id === guruId ||
              k.walas_id === guruId ||
              k.wali_kelas_id === guruId
          );
          if (found) {
            setWalasKelas(found);
          }
        }
      } catch (err) {
        console.error("Failed to fetch walas kelas:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWalasKelas();
  }, [user]);

  const kelasName = walasKelas
    ? `${walasKelas.kelas} ${walasKelas.jurusan || ""}`.trim()
    : "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <PageHeader 
        title="Wali Kelas Dashboard"
        subtitle="Dashboard Wali Kelas"  
      />

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-8">

        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="relative">
            <h2 className="text-3xl font-bold mb-2">
              Selamat Datang, {user?.guru?.nama || "Wali Kelas"}!
            </h2>
            <p className="opacity-90 text-lg">
              {kelasName
                ? `Wali Kelas ${kelasName}`
                : "Pantau kehadiran siswa kelas Anda."}
            </p>
            <p className="opacity-75 mt-1">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !walasKelas ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Kelas Belum Ditetapkan
            </h3>
            <p className="text-gray-500">
              Anda belum ditugaskan sebagai wali kelas. Hubungi administrator
              untuk konfigurasi.
            </p>
          </div>
        ) : (
          <>
            {/* stats */}
            <WalasStudentStats kelasId={walasKelas.id} totalSiswa={walasKelas._count?.siswa || 0} />
          
            {/* charts */}
            <WalasAttendanceChart kelasId={walasKelas.id} totalSiswa={walasKelas._count?.siswa || 0} />

            {/* attendance table */}
            <WalasAttendanceTable
              kelasId={walasKelas.id}
              kelasName={kelasName}
              walasId={user?.guru?.id}
            />
          </>
        )}
      </div>
    </div>
  );
}