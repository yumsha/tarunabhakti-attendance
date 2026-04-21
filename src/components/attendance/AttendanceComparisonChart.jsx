import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa } from "../../lib/backendApi";
import { AlignJustify } from "lucide-react";

const PERIODS = ["Daily", "Weekly", "Monthly"];

/** Returns last `n` date strings (YYYY-MM-DD), newest last */
function lastNDates(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

/**
 * Fetch semua absensi dalam satu range → 1 request saja.
 * Response: { success: true, data: { "2025-04-01": 23, "2025-04-02": 18, ... } }
 */
async function fetchRange(tanggal_mulai, tanggal_akhir) {
  try {
    const res = await absensiSiswa.laporanRange(
      `tanggal_mulai=${tanggal_mulai}&tanggal_akhir=${tanggal_akhir}`
    );
    if (res?.success && res.data) return res.data;
    return {};
  } catch {
    return {};
  }
}

export default function AttendanceComparisonChart() {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);
  const [period, setPeriod]     = useState("Daily");
  const [labels, setLabels]     = useState([]);
  const [counts, setCounts]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (period === "Daily") {
          // ✅ 1 request untuk 14 hari
          const dates = lastNDates(14);
          const grouped = await fetchRange(dates[0], dates[dates.length - 1]);
          setLabels(dates.map(fmtDate));
          setCounts(dates.map(d => grouped[d] || 0));

        } else if (period === "Weekly") {
          // ✅ 1 request untuk 6 minggu (42 hari)
          const totalDays  = 6 * 7;
          const allDates   = lastNDates(totalDays);
          const grouped    = await fetchRange(allDates[0], allDates[allDates.length - 1]);

          const weekLabels = [];
          const weekCounts = [];

          for (let w = 0; w < 6; w++) {
            const weekDates = allDates.slice(w * 7, w * 7 + 7);
            const total     = weekDates.reduce((sum, d) => sum + (grouped[d] || 0), 0);
            weekLabels.push(`Mgg ${w + 1}`);
            weekCounts.push(total);
          }

          setLabels(weekLabels);
          setCounts(weekCounts);

        } else {
          // ✅ 1 request untuk 6 bulan
          const today     = new Date();
          const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
          const startStr  = sixMonthsAgo.toISOString().split("T")[0];
          const endStr    = today.toISOString().split("T")[0];

          const grouped   = await fetchRange(startStr, endStr);

          const monthLabels = [];
          const monthCounts = [];

          for (let m = 5; m >= 0; m--) {
            const date  = new Date(today.getFullYear(), today.getMonth() - m, 1);
            const year  = date.getFullYear();
            const month = date.getMonth() + 1;
            const days  = new Date(year, month, 0).getDate();

            const total = Array.from({ length: days }, (_, i) => {
              const day = String(i + 1).padStart(2, "0");
              return `${year}-${String(month).padStart(2, "0")}-${day}`;
            }).reduce((sum, d) => sum + (grouped[d] || 0), 0);

            monthLabels.push(
              date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
            );
            monthCounts.push(total);
          }

          setLabels(monthLabels);
          setCounts(monthCounts);
        }
      } catch (err) {
        console.error("AttendanceComparisonChart:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  useEffect(() => {
    if (isLoading || !chartRef.current || counts.length === 0) return;

    const ctx = chartRef.current.getContext("2d");
    if (chartInstance.current) chartInstance.current.destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(99,102,241,0.18)");
    gradient.addColorStop(1, "rgba(99,102,241,0)");

    const maxVal = Math.max(...counts);
    const peakIdx = counts.indexOf(maxVal);

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Absensi",
            data: counts,
            borderColor: "#6366f1",
            backgroundColor: gradient,
            fill: true,
            tension: 0.45,
            pointBackgroundColor: counts.map((_, i) =>
              i === peakIdx ? "#6366f1" : "#fff"
            ),
            pointBorderColor: "#6366f1",
            pointBorderWidth: 2,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (c) => ` ${c.parsed.y} siswa` },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#9ca3af", font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#9ca3af", font: { size: 11 }, precision: 0 },
            grid: { color: "#f3f4f6" },
          },
        },
      },
    });

    return () => chartInstance.current?.destroy();
  }, [counts, labels, isLoading]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Attendance Comparison Chart</h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {PERIODS.map((p) => (
              <label key={p} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="radio"
                  name="acc-period"
                  value={p}
                  checked={period === p}
                  onChange={() => setPeriod(p)}
                  className="accent-indigo-500"
                />
                <span className={period === p ? "text-indigo-600 font-semibold" : ""}>{p}</span>
              </label>
            ))}
          </div>
          <AlignJustify className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="relative h-52">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
          </div>
        ) : (
          <canvas ref={chartRef} />
        )}
      </div>
    </div>
  );
}