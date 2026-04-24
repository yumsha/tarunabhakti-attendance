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
    <div>
      <div className="text-3xl font-bold text-gray-900 tracking-tight">{timeStr}</div>
      <div className="text-xs text-gray-400 mt-0.5">Realtime Insight</div>
      <div className="mt-5 text-sm font-semibold text-gray-700">
        Today:
        <br />
        <span className="text-base font-bold text-gray-900">{dateStr}</span>
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
          siswa.list(),
        ]);
        let hadir = 0;
        let telat = 0;
        let pulangAwal = 0;

        if (tapRes?.success && Array.isArray(tapRes.data)) {
          tapRes.data.forEach((r, i) => {
            console.log("DATA TAP", i, {
              nama: r.siswa?.nama,
              status_tapin: r.status_tapin,
              status_tapout: r.status_tapout,
            });
          });
          
          hadir = tapRes.data.filter(
            (r) => r.status_tapin === "TEPAT_WAKTU"
          ).length;

          telat = tapRes.data.filter(
            (r) => r.status_tapin === "TERLAMBAT"
          ).length;

          pulangAwal = tapRes.data.filter(
            (r) => r.status_tapout === "PULANG_AWAL"
          ).length;
        }

        // ======================
        // WALAS FINAL
        // ======================
        let izin = 0;
        let sakit = 0;
        let alpha = 0;

        if (walasRes?.success) {
          const g = walasRes.data.statistik_global;

          izin = g.izin || 0;
          sakit = g.sakit || 0;
          alpha = g.alpha || 0;
        } else {
          console.log("WALAS ERROR OR EMPTY");
        }

        const total = siswaRes?.data?.length ?? 0;

        const totalRecorded = hadir + telat + izin + sakit + alpha;

        const finalStats = {
          total,
          hadir,
          telat,
          izin,
          sakit,
          pulangAwal,
          absen: Math.max(0, total - totalRecorded),
        };

        setStats(finalStats);
      } catch (e) {
        console.error("ERROR DASHBOARD:", e);
      } finally {
        setLoading(false);
      }
    };

    load();

    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
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

      <div className="flex-1 overflow-auto p-6">
        <div className="flex gap-5 mb-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between min-w-[200px] w-[200px]">
            <Clock className="w-10 h-10 text-gray-300 mb-3" />
            <RealtimeClock />
          </div>

          <div className="flex-1 grid grid-cols-3 gap-4">
            {cards.map((c) => (
              <StatCard key={c.label} {...c} loading={loading} />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10">
          <div className="col-span-2">
            <AttendanceComparisonChart />
          </div>
        </div>
      </div>
    </div>
  );
}