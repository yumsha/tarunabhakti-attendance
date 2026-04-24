import { useState, useEffect } from "react";
import { CheckCircle, Clock, XCircle, Users } from "lucide-react";
import { absensiSiswa } from "../../lib/backendApi";
import InfoStatCard from "../layout/InfoStatCard";

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
          const terlambat = res.summary.TERLAMBAT || 0;
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
      helper: "Siswa hadir sesuai jadwal hari ini",
      tone: "emerald",
      icon: <CheckCircle className="w-6 h-6" />,
    },
    {
      label: "Terlambat",
      value: stats.terlambat,
      helper: "Perlu tindak lanjut dari walas",
      tone: "amber",
      icon: <Clock className="w-6 h-6" />,
    },
    {
      label: "Belum Hadir",
      value: stats.belum_hadir,
      helper: "Belum ada catatan kehadiran masuk",
      tone: "red",
      icon: <XCircle className="w-6 h-6" />,
    },
    {
      label: "Total Siswa",
      value: stats.totalStudents,
      helper: "Jumlah siswa yang dipantau di kelas ini",
      tone: "blue",
      icon: <Users className="w-6 h-6" />,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <InfoStatCard
            key={i}
            label="Memuat"
            value="0"
            helper="Menyiapkan ringkasan kelas"
            icon={<Users className="w-5 h-5" />}
            tone="slate"
            loading
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <InfoStatCard
          key={index}
          label={card.label}
          value={card.value}
          helper={card.helper}
          icon={card.icon}
          tone={card.tone}
          className="hover:shadow-md transition-shadow duration-200"
        />
      ))}
    </div>
  );
}
