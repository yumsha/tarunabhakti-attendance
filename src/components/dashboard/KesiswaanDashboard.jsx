import { useState, useEffect } from "react";
import { Users, Clock, CloudOff, AlertTriangle, Moon, CalendarCheck } from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import StatCard from "./StatCard.jsx";
import AttendanceComparisonChart from "../attendance/AttendanceComparisonChart.jsx";
import { absensiSiswa, siswa, detailAbsensi } from "../../lib/backendApi";

// WIB helper
function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Jakarta",
  });
}

function RealtimeClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateStr = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-start w-full gap-2">
      <div>
        <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{timeStr}</div>
        <div className="text-xs text-gray-400 mt-0.5">Waktu Terkini</div>
      </div>
      <div className="text-right lg:text-left lg:mt-5 text-xs sm:text-sm font-semibold text-gray-700">
        <span>Hari ini:</span>
        <br />
        <span className="text-sm sm:text-base font-bold text-gray-900">{dateStr}</span>
      </div>
    </div>
  );
}

export default function KesiswaanDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    hadir: 0,
    absen: 0,
    telat: 0,
    pulangAwal: 0,
    izin: 0,
    sakit: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {

      setLoading(true);
      try {
        const today = getTodayWIB();

        const [tapRes, walasRes, siswaRes] = await Promise.all([
          absensiSiswa.laporanHarian(`tanggal=${today}`),
          detailAbsensi.getRekapAbsensiSemuaKelas(
            `tanggal_mulai=${today}&tanggal_akhir=${today}`
          ),
          siswa.list("limit=1000"),
        ]);

        const tapList =
          tapRes?.success && Array.isArray(tapRes.data) ? tapRes.data : [];
        const walasData =
          walasRes?.success && walasRes.data ? walasRes.data : null;
        const totalSiswa =
          siswaRes?.pagination?.total ??
          (Array.isArray(siswaRes?.data) ? siswaRes.data.length : 0);

        let hadirCount = 0;
        let telatCount = 0;
        let pulangAwalCount = 0;

        tapList.forEach((r) => {
          if (r.status_tapin === "Tepat_Waktu") hadirCount++;
          if (r.status_tapin === "Terlambat") telatCount++;
          if (r.jam_pulang) pulangAwalCount++;
        });

        let izinCount = 0;
        let sakitCount = 0;

        if (walasData) {
          const list = walasData.data || walasData.rekap || [];
          if (Array.isArray(list)) {
            list.forEach((row) => {
              izinCount += Number(row.izin || row.total_izin || 0);
              sakitCount += Number(row.sakit || row.total_sakit || 0);
            });
          }
        }

        const tercatat = hadirCount + telatCount + izinCount + sakitCount;
        const absenCount = Math.max(0, totalSiswa - tercatat);

        setStats({
          total: totalSiswa,
          hadir: hadirCount,
          absen: absenCount,
          telat: telatCount,
          pulangAwal: pulangAwalCount,
          izin: izinCount,
          sakit: sakitCount,
        });
      } catch (e) {
        console.error("Kesiswaan stats error", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const cards = [
    {
      value: stats.total,
      label: "Total Siswa",
      icon: <Users className="w-5 h-5" />,
    },
    {
      value: stats.hadir,
      label: "Hadir Hari Ini",
      icon: <Clock className="w-5 h-5" />,
    },
    {
      value: stats.absen,
      label: "Tidak Hadir",
      icon: <CloudOff className="w-5 h-5" />,
    },
    {
      value: stats.telat,
      label: "Terlambat",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      value: stats.sakit,
      label: "Sakit",
      icon: <Moon className="w-5 h-5" />,
    },
    {
      value: stats.izin,
      label: "Izin",
      icon: <CalendarCheck className="w-5 h-5" />,
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      <PageHeader 
        title="Kesiswaan Dashboard"
        subtitle="Dashboard untuk Kesiswaan"
      />

      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-5 mb-4 sm:mb-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col justify-between w-full lg:w-56 lg:min-w-[224px]">
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300 mb-2 sm:mb-3 hidden lg:block" />
            <RealtimeClock />
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} loading={loading} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5">
          <AttendanceComparisonChart />
        </div>
      </div>
    </div>
  );
}