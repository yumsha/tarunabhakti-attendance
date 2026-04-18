import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa } from "../../lib/backendApi";


const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);


export default function DailyAttendanceChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [attendanceData, setAttendanceData] = useState(Array(24).fill(0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDailyData = async () => {
      setIsLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const res = await absensiSiswa.laporanHarian(`tanggal=${today}`);
        if (res.success && Array.isArray(res.data)) {
          // Count tap_in per hour
          const data = Array(24).fill(0);
          res.data.forEach(item => {
            if (item.tap_in) {
              const hour = parseInt(item.tap_in.split(":")[0], 10);
              if (!isNaN(hour) && hour >= 0 && hour < 24) {
                data[hour]++;
              }
            }
          });
          setAttendanceData(data);
        }
      } catch (error) {
        console.error("Failed to fetch daily attendance:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDailyData();
  }, []);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    const gradientBlue = ctx.createLinearGradient(0, 0, 0, 260);
    gradientBlue.addColorStop(0, "rgba(37,99,235,0.15)");
    gradientBlue.addColorStop(1, "rgba(37,99,235,0)");

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: hours,
        datasets: [
          {
            label: `Absensi per Jam (Hari Ini)`,
            data: attendanceData,
            borderColor: "#2563eb",
            backgroundColor: gradientBlue,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#2563eb",
            pointBorderColor: "#2563eb",
          }
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          title: {
            display: false
          },
        },
        interaction: {
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [attendanceData, isLoading]);

  return (
    <div className="bg-white rounded-lg shadow p-3 mb-4 relative max-w-[980px] mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Absensi Siswa Hari Ini</h3>
      </div>
      {isLoading ? (
        <div className="h-[210px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <canvas ref={chartRef} width={540} height={160}></canvas>
      )}
    </div>
  );
}