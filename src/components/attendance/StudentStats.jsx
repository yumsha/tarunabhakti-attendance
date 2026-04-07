import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

export default function StudentStats() {
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    izin: 0,
    totalStudents: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await absensiSiswa.laporanHarian(`tanggal=${today}`);
        
        if (res.success && res.summary) {
            const presentCount = res.summary.tepat_waktu + res.summary.telambat;
            
            setStats({
                present: presentCount,
                absent: res.summary.belum_tap_in,
                izin: 0,
                totalStudents: res.summary.total
            });
        }
      } catch (error) {
        console.error("Failed to fetch student stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Data Kehadiran Hari Ini</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded">
          <span className="text-sm text-gray-700">Hadir</span>
          <div className="text-2xl font-bold text-green-700">{stats.present}</div>
        </div>
        <div className="bg-red-50 p-4 rounded">
          <span className="text-sm text-gray-700">Absen (Tanpa Keterangan)</span>
          <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded">
          <span className="text-sm text-gray-700">Izin</span>
          <div className="text-2xl font-bold text-yellow-700">{stats.izin}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded">
          <span className="text-sm text-gray-700">Total Siswa</span>
          <div className="text-2xl font-bold text-blue-700">{stats.totalStudents}</div>
        </div>
      </div>
    </div>
  );
}
