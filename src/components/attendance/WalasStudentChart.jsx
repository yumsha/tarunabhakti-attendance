import { useState, useEffect } from "react";
import { CheckCircle, Clock, XCircle, Users } from "lucide-react";
import { absensiSiswa } from "../../lib/backendApi";

function getTodayWIB() {
  // YYYY-MM-DD in Asia/Jakarta timezone
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export default function WalasStudentStats({ kelasId, totalSiswa = 0 }) {
  const [stats, setStats] = useState({
    tepat_waktu: 0,
    terlambat: 0,
    belum_hadir: 0,
    totalStudents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!kelasId) return;
      setLoading(true);
      try {
        const today = getTodayWIB();
        const res = await absensiSiswa.laporanHarian(
          `tanggal=${today}&kelas_id=${kelasId}`
        );

        if (res.success && res.summary) {
          const tepatWaktu = res.summary.tepat_waktu || 0;
          const terlambat = res.summary.telambat || 0;
          const hadirTotal = tepatWaktu + terlambat;
          const total = totalSiswa > 0 ? totalSiswa : res.summary.total || 0;
          const belumHadir = Math.max(0, total - hadirTotal);

          setStats({
            tepat_waktu: tepatWaktu,
            terlambat: terlambat,
            belum_hadir: belumHadir,
            totalStudents: total,
          });
        } else {
          setStats({
            tepat_waktu: 0,
            terlambat: 0,
            belum_hadir: totalSiswa,
            totalStudents: totalSiswa,
          });
        }
      } catch (error) {
        console.error("Failed to fetch walas student stats:", error);
        setStats({
          tepat_waktu: 0,
          terlambat: 0,
          belum_hadir: totalSiswa,
          totalStudents: totalSiswa,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [kelasId, totalSiswa]);

  const cards = [
    {
      label: "Hadir Tepat Waktu",
      value: stats.tepat_waktu,
      color: "from-emerald-500 to-emerald-600",
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-700",
      icon: <CheckCircle className="w-6 h-6" />,
    },
    {
      label: "Terlambat",
      value: stats.terlambat,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
      icon: <Clock className="w-6 h-6" />,
    },
    {
      label: "Belum Hadir",
      value: stats.belum_hadir,
      color: "from-red-500 to-rose-500",
      bgLight: "bg-red-50",
      textColor: "text-red-700",
      icon: <XCircle className="w-6 h-6" />,
    },
    {
      label: "Total Siswa",
      value: stats.totalStudents,
      color: "from-blue-500 to-indigo-500",
      bgLight: "bg-blue-50",
      textColor: "text-blue-700",
      icon: <Users className="w-6 h-6" />,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">{card.label}</span>
            <div className={`${card.bgLight} ${card.textColor} p-2 rounded-xl`}>
              {card.icon}
            </div>
          </div>
          <div className={`text-3xl font-bold ${card.textColor}`}>{card.value}</div>
          <div className="mt-1 text-xs text-gray-400">Hari ini</div>
        </div>
      ))}
    </div>
  );
}
