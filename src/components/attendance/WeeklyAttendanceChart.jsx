import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa } from "../../lib/backendApi"; // Pakai detailAbsensi sesuai controller baru
import { AlignJustify } from "lucide-react";

const cache = {
  data: {}, 
};

export default function WeeklyAttendanceChart({ siswaId = 1 }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [chartData, setChartData] = useState({ labels: [], values: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diff)).toISOString().split("T")[0];

        const cacheKey = `${siswaId}_${monday}`;

        let result;
        if (cache.data[cacheKey]) {
          result = cache.data[cacheKey];
        } else {
          const params = `siswa_id=${siswaId}&tanggal_mulai=${monday}`;
          const res = await absensiSiswa.rekapMingguan(params);
          
          if (res?.success) {
            result = res.data;
            cache.data[cacheKey] = result;
          }
        }

        if (result && result.statistik_per_hari) {
          const labels = result.statistik_per_hari.map(d => d.hari);
          const values = result.statistik_per_hari.map(d => {
             const total = d.total || 1;
             return Math.round((d.hadir / total) * 100);
          });

          setChartData({ labels, values });
        }
      } catch (err) {
        console.error("WeeklyAttendanceChart Error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [siswaId]);

  useEffect(() => {
    if (isLoading || !chartRef.current || chartData.labels.length === 0) return;

    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) chartInstance.current.destroy();

    const maxVal = Math.max(...chartData.values);
    const bgColors = chartData.values.map((v) => (v === maxVal ? "#6366f1" : "#e0e7ff"));

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: chartData.labels,
        datasets: [{
          data: chartData.values,
          backgroundColor: bgColors,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
          x: { grid: { display: false } }
        }
      },
    });

    return () => chartInstance.current?.destroy();
  }, [chartData, isLoading]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Kehadiran Mingguan (%)</h3>
        <AlignJustify className="w-4 h-4 text-gray-400" />
      </div>
      <div className="relative h-52">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" /></div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}