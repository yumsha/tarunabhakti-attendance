import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { detailAbsensi } from "../../lib/backendApi";
import { buildWalasAttendanceSummary } from "../../lib/walasAttendanceSummary";

function getDateWIB(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function getDayOfWeekWIB(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay(); // 0 = Minggu
}

export default function WalasAttendanceChart({ kelasId, totalSiswa = 0 }) {
  const barRef = useRef(null);
  const barChart = useRef(null);

  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeekly = async () => {
      if (!kelasId) return;
      setLoading(true);
      try {
        const days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          days.push(getDateWIB(d));
        }

        const results = await Promise.all(
          days.map(async (date) => {
            const isSunday = getDayOfWeekWIB(date) === 0;

            // skip fetch hari Minggu
            if (isSunday) {
              return { date, isSunday: true };
            }

            try {
              const res = await detailAbsensi.pratinjauWalas(
                `tanggal=${date}&kelas_id=${kelasId}`
              );
              if (res?.success && res?.data) {
                const summary = buildWalasAttendanceSummary(res.data, totalSiswa);
                return {
                  date,
                  isSunday: false,
                  tepat_waktu: summary.tepat_waktu,
                  terlambat: summary.terlambat,
                  manual_hadir: summary.manual_hadir,
                  belum: summary.belum_hadir,
                };
              }
            } catch {
              // ignore individual day errors
            }
            return {
              date,
              isSunday: false,
              tepat_waktu: 0,
              terlambat: 0,
              manual_hadir: 0,
              belum: totalSiswa,
            };
          })
        );

        setWeeklyData(results);
      } catch (err) {
        console.error("Failed to fetch weekly attendance:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWeekly();
  }, [kelasId, totalSiswa]);

  useEffect(() => {
    if (!barRef.current || weeklyData.length === 0) return;
    const ctx = barRef.current.getContext("2d");

    if (barChart.current) barChart.current.destroy();

    const labels = weeklyData.map((d) => {
      const [y, m, day] = d.date.split("-").map(Number);
      const date = new Date(y, m - 1, day);
      return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
    });

    const gradientGreen = ctx.createLinearGradient(0, 0, 0, 300);
    gradientGreen.addColorStop(0, "rgba(16, 185, 129, 0.9)");
    gradientGreen.addColorStop(1, "rgba(16, 185, 129, 0.4)");

    const gradientRed = ctx.createLinearGradient(0, 0, 0, 300);
    gradientRed.addColorStop(0, "rgba(239, 68, 68, 0.9)");
    gradientRed.addColorStop(1, "rgba(239, 68, 68, 0.4)");

    const gradientViolet = ctx.createLinearGradient(0, 0, 0, 300);
    gradientViolet.addColorStop(0, "rgba(139, 92, 246, 0.9)");
    gradientViolet.addColorStop(1, "rgba(139, 92, 246, 0.4)");

    const gradientAmber = ctx.createLinearGradient(0, 0, 0, 300);
    gradientAmber.addColorStop(0, "rgba(245, 158, 11, 0.9)");
    gradientAmber.addColorStop(1, "rgba(245, 158, 11, 0.4)");

    barChart.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Tepat Waktu",
            // null/kolom kosong, Chart.js skip rendering bar-nya
            data: weeklyData.map((d) => (d.isSunday ? null : d.tepat_waktu)),
            backgroundColor: gradientGreen,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
          {
            label: "Terlambat",
            data: weeklyData.map((d) => (d.isSunday ? null : d.terlambat)),
            backgroundColor: gradientAmber,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
          {
            label: "Hadir Manual",
            data: weeklyData.map((d) => (d.isSunday ? null : d.manual_hadir)),
            backgroundColor: gradientViolet,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
          {
            label: "Belum Hadir",
            data: weeklyData.map((d) => (d.isSunday ? null : d.belum)),
            backgroundColor: gradientRed,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
              padding: 12,
              font: { size: 11 },
            },
          },
          tooltip: {
            filter: (item) => !weeklyData[item.dataIndex]?.isSunday,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            offset: true,
            ticks: {
              color: (ctx) =>
                weeklyData[ctx.index]?.isSunday ? "#d1d5db" : "#4b5563",
              font: (ctx) => ({
                size: 11,
                weight: weeklyData[ctx.index]?.isSunday ? "400" : "600",
              }),
              maxRotation: 0,
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              stepSize: 5,
              color: "#6b7280",
              font: { size: 11 },
            },
          },
        },
      },
    });

    return () => {
      if (barChart.current) barChart.current.destroy();
    };
  }, [weeklyData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 mb-6 w-full">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-72"></div>
      </div>
    );
  }

  return (
    <div className="w-full mb-6">
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Tren Kehadiran Mingguan
          </h3>
          <p className="text-sm text-gray-500">
            7 hari terakhir, termasuk hadir manual oleh walas
          </p>
        </div>
        <div className="px-4 pb-5 sm:px-6">
          <div className="relative h-[22rem] sm:h-[24rem] lg:h-[26rem]">
            <canvas ref={barRef} className="h-full w-full"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
}