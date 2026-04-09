import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa } from "../../lib/backendApi";

function getTodayWIB() {
  // YYYY-MM-DD in Asia/Jakarta timezone
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function getDateWIB(date) {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export default function WalasAttendanceChart({ kelasId, totalSiswa = 0 }) {
  const doughnutRef = useRef(null);
  const barRef = useRef(null);
  const doughnutChart = useRef(null);
  const barChart = useRef(null);

  const [todayData, setTodayData] = useState({ tepat_waktu: 0, terlambat: 0, belum: 0 });
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch today's data for doughnut
  useEffect(() => {
    const fetchToday = async () => {
      if (!kelasId) return;
      try {
        const today = getTodayWIB();
        const res = await absensiSiswa.laporanHarian(`tanggal=${today}&kelas_id=${kelasId}`);
        if (res.success && res.summary) {
          const tepatWaktu = res.summary.tepat_waktu || 0;
          const terlambat = res.summary.telambat || 0;
          const hadirTotal = tepatWaktu + terlambat;
          const total = totalSiswa > 0 ? totalSiswa : res.summary.total || 0;
          const belum = Math.max(0, total - hadirTotal);
          setTodayData({
            tepat_waktu: tepatWaktu,
            terlambat: terlambat,
            belum: belum,
          });
        } else {
          setTodayData({ tepat_waktu: 0, terlambat: 0, belum: totalSiswa });
        }
      } catch (err) {
        console.error("Failed to fetch today attendance for chart:", err);
      }
    };
    fetchToday();
  }, [kelasId, totalSiswa]);

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
              const res = await absensiSiswa.laporanHarian(`tanggal=${date}&kelas_id=${kelasId}`);
              if (res.success && res.summary) {
                return {
                  date,
                  hadir: (res.summary.tepat_waktu || 0) + (res.summary.telambat || 0),
                  belum: res.summary.belum_tap_in || 0,
                };
              }
            } catch {
              // ignore individual day errors
            }
            return { date, hadir: 0, belum: 0 };
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
  }, [kelasId]);

  // Render doughnut chart
  useEffect(() => {
    if (!doughnutRef.current) return;
    const ctx = doughnutRef.current.getContext("2d");

    if (doughnutChart.current) doughnutChart.current.destroy();

    const total = todayData.tepat_waktu + todayData.terlambat + todayData.belum;

    doughnutChart.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Tepat Waktu", "Terlambat", "Belum Hadir"],
        datasets: [
          {
            data: [todayData.tepat_waktu, todayData.terlambat, todayData.belum],
            backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
            borderColor: ["#ffffff", "#ffffff", "#ffffff"],
            borderWidth: 3,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        cutout: "65%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              padding: 16,
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const val = context.parsed;
                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                return ` ${context.label}: ${val} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (doughnutChart.current) doughnutChart.current.destroy();
    };
  }, [todayData]);

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

    barChart.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Hadir",
            data: weeklyData.map((d) => d.hadir),
            backgroundColor: gradientGreen,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Belum Hadir",
            data: weeklyData.map((d) => d.belum),
            backgroundColor: gradientRed,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              padding: 16,
              font: { size: 12 },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: {
              stepSize: 5,
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-72"></div>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-72"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Doughnut Chart - Today */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Kehadiran Hari Ini</h3>
        <p className="text-sm text-gray-500 mb-4">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <div className="flex items-center justify-center">
          <canvas ref={doughnutRef} width={280} height={280}></canvas>
        </div>
      </div>

      {/* Bar Chart - Weekly */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Tren Kehadiran Mingguan</h3>
        <p className="text-sm text-gray-500 mb-4">7 hari terakhir</p>
        <canvas ref={barRef} width={400} height={280}></canvas>
      </div>
    </div>
  );
}
