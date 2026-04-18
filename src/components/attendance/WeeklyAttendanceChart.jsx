import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa, kelas, siswa } from "../../lib/backendApi";
import { AlignJustify } from "lucide-react";

/**
 * WeeklyAttendanceChart
 *
 * For each class, fetches the daily laporan for the last 7 days,
 * totals the present students, then computes a % vs total siswa in that class.
 *
 * Falls back gracefully if rekapKelas is unavailable.
 */
export default function WeeklyAttendanceChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [kelasLabels, setKelasLabels] = useState([]);
  const [attendancePct, setAttendancePct] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch class list
        const kelasRes = await kelas.list();
        const kelasList =
          kelasRes?.success && Array.isArray(kelasRes.data) && kelasRes.data.length > 0
            ? kelasRes.data.slice(0, 7)
            : [];

        if (kelasList.length === 0) {
          setKelasLabels([]);
          setAttendancePct([]);
          return;
        }

        // 2. Total siswa per kelas
        const siswaRes = await siswa.list();
        const allSiswa = siswaRes?.success && Array.isArray(siswaRes.data) ? siswaRes.data : [];

        // 3. Fetch last 7 days of daily attendance for each class
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().split("T")[0];
        });

        // Fetch all 7 days at once
        const dailyResults = await Promise.all(
          last7.map((d) =>
            absensiSiswa
              .laporanHarian(`tanggal=${d}`)
              .then((r) => (r?.success && Array.isArray(r.data) ? r.data : []))
              .catch(() => [])
          )
        );

        // Flatten all records for the week
        const weekRecords = dailyResults.flat();

        // 4. For each kelas, compute attendance % over the week
        const labels = [];
        const pcts = [];

        for (const k of kelasList) {
          const kelasId = k.id;
          const kelasName = k.kelas || k.nama || `Kelas ${kelasId}`;

          // Students belonging to this class
          const totalInClass = allSiswa.filter((s) => s.kelas_id === kelasId || s.kelas?.id === kelasId).length;

          // Records in this class for the week
          const presentInClass = weekRecords.filter(
            (r) => r.siswa?.kelas_id === kelasId || r.kelas_id === kelasId || r.siswa?.kelas?.id === kelasId
          ).length;

          // Expected = totalInClass * 7 days (rough denominator)
          const denominator = totalInClass * 7 || 1;
          const pct = Math.min(100, Math.round((presentInClass / denominator) * 100));

          labels.push(kelasName);
          pcts.push(pct);
        }

        setKelasLabels(labels);
        setAttendancePct(pcts);
      } catch (err) {
        console.error("WeeklyAttendanceChart:", err);
        setKelasLabels([]);
        setAttendancePct([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isLoading || !chartRef.current || kelasLabels.length === 0) return;

    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) chartInstance.current.destroy();

    const maxPct = Math.max(...attendancePct);
    const bgColors = attendancePct.map((v) =>
      v === maxPct ? "#6366f1" : "#e0e7ff"
    );

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: kelasLabels,
        datasets: [
          {
            data: attendancePct,
            backgroundColor: bgColors,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => ` ${c.parsed.y}%` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#9ca3af", font: { size: 10 } },
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 20,
              color: "#9ca3af",
              font: { size: 10 },
              callback: (v) => `${v}%`,
            },
            grid: { color: "#f3f4f6" },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [kelasLabels, attendancePct, isLoading]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Weekly Attendance</h3>
        <AlignJustify className="w-4 h-4 text-gray-400" />
      </div>

      <div className="relative h-52">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
          </div>
        ) : kelasLabels.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            Tidak ada data kelas
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}
