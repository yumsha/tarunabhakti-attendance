import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { detailAbsensi } from "../../lib/backendApi";
import { buildWalasAttendanceSummary } from "../../lib/walasAttendanceSummary";

function getDateWIB(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export default function WalasAttendanceChart({ kelasId, totalSiswa = 0 }) {
  const barRef = useRef(null);
  const barChart = useRef(null);

  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch last 7 days for bar chart
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
            try {
              const res = await detailAbsensi.pratinjauWalas(
                `tanggal=${date}&kelas_id=${kelasId}`
              );
              if (res?.success && res?.data) {
                const summary = buildWalasAttendanceSummary(res.data, totalSiswa);
                return {
                  date,
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

  // Render bar chart
  useEffect(() => {
    if (!barRef.current || weeklyData.length === 0) return;
    const ctx = barRef.current.getContext("2d");

    if (barChart.current) barChart.current.destroy();

    const labels = weeklyData.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
    });

    // Gradient for hadir bars
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
            data: weeklyData.map((d) => d.tepat_waktu),
            backgroundColor: gradientGreen,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
          {
            label: "Terlambat",
            data: weeklyData.map((d) => d.terlambat),
            backgroundColor: gradientAmber,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
          {
            label: "Hadir Manual",
            data: weeklyData.map((d) => d.manual_hadir),
            backgroundColor: gradientViolet,
            borderRadius: 6,
            borderSkipped: false,
            categoryPercentage: 0.72,
            barPercentage: 0.82,
            maxBarThickness: 20,
          },
          {
            label: "Belum Hadir",
            data: weeklyData.map((d) => d.belum),
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
        },
        scales: {
          x: {
            grid: { display: false },
            offset: true,
            ticks: {
              color: "#4b5563",
              font: { size: 11, weight: "600" },
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
        
        {/* Header */}
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
