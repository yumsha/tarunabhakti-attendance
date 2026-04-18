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

/** Pretty-print a date string for x-axis labels */
function fmtDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function fmtWeek(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { weekday: "short" });
}

function fmtMonth(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", { month: "short" });
}

export default function AttendanceComparisonChart() {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [period, setPeriod] = useState("Daily");
  const [labels, setLabels] = useState([]);
  const [counts, setCounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        if (period === "Daily") {
          // Last 14 days – one request per day
          const dates = lastNDates(14);
          const results = await Promise.all(
            dates.map((d) =>
              absensiSiswa
                .laporanHarian(`tanggal=${d}`)
                .then((r) => (r?.success && Array.isArray(r.data) ? r.data.length : 0))
                .catch(() => 0)
            )
          );
          setLabels(dates.map(fmtDate));
          setCounts(results);
        } else if (period === "Weekly") {
          // Last 6 weeks – aggregate 7 days each
          const weeks = 6;
          const weekLabels = [];
          const weekCounts = [];
          for (let w = weeks - 1; w >= 0; w--) {
            const weekDates = Array.from({ length: 7 }, (_, di) => {
              const d = new Date();
              d.setDate(d.getDate() - w * 7 - (6 - di));
              return d.toISOString().split("T")[0];
            });
            const totals = await Promise.all(
              weekDates.map((d) =>
                absensiSiswa
                  .laporanHarian(`tanggal=${d}`)
                  .then((r) => (r?.success && Array.isArray(r.data) ? r.data.length : 0))
                  .catch(() => 0)
              )
            );
            weekLabels.push(`Mgg ${weeks - w}`);
            weekCounts.push(totals.reduce((a, b) => a + b, 0));
          }
          setLabels(weekLabels);
          setCounts(weekCounts);
        } else {
          // Monthly – last 6 months
          const months = 6;
          const monthLabels = [];
          const monthCounts = [];
          for (let m = months - 1; m >= 0; m--) {
            const date = new Date();
            date.setMonth(date.getMonth() - m);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const daysInMonth = new Date(year, month, 0).getDate();
            const dates = Array.from({ length: daysInMonth }, (_, i) => {
              const day = String(i + 1).padStart(2, "0");
              return `${year}-${String(month).padStart(2, "0")}-${day}`;
            });
            const totals = await Promise.all(
              dates.map((d) =>
                absensiSiswa
                  .laporanHarian(`tanggal=${d}`)
                  .then((r) => (r?.success && Array.isArray(r.data) ? r.data.length : 0))
                  .catch(() => 0)
              )
            );
            monthLabels.push(
              date.toLocaleDateString("id-ID", { month: "short", year: "2-digit" })
            );
            monthCounts.push(totals.reduce((a, b) => a + b, 0));
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
