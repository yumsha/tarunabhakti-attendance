import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { absensiSiswa, siswa } from "../../lib/backendApi";
import { AlignJustify } from "lucide-react";

const PERIODS = ["Harian", "Mingguan", "Bulanan", "Tahunan"];

// ── Date helpers ──────────────────────────────────────────────────────────────
function lastNDates(n) {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (n - 1 - i));
        return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    });
}

function fmtShort(dateStr) {
    // "2026-06-09" → "09 Jun"
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

// ── Total siswa ──────────────────────────────────────────────────────────────
async function getTotalSiswa() {
    try {
        const res = await siswa.list("limit=99999&page=1");
        if (res?.success) {
            return res.pagination?.total ??
                (Array.isArray(res.data) ? res.data.length : 0);
        }
        return 0;
    } catch {
        return 0;
    }
}

// ── Fetch laporan range → { [YYYY-MM-DD]: tapInCount } ───────────────────────
async function fetchRange(tanggal_mulai, tanggal_akhir) {
    try {
        const res = await absensiSiswa.laporanRange(
            `tanggal_mulai=${tanggal_mulai}&tanggal_akhir=${tanggal_akhir}`
        );
        if (res?.success && res.data) {
            return res.data;
        }
        return {};
    } catch {
        return {};
    }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AttendanceComparisonChart() {
    const chartRef      = useRef(null);
    const chartInstance = useRef(null);

    const [period,    setPeriod]    = useState("Harian");
    const [labels,    setLabels]    = useState([]);
    const [hadirData, setHadirData] = useState([]);
    const [absenData, setAbsenData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const total = await getTotalSiswa();
                let newLabels = [], newHadir = [], newAbsen = [];

                // ── DAILY: 14 hari terakhir, 1 titik = 1 hari ─────────────────
                if (period === "Harian") {
                    const dates   = lastNDates(14);
                    const grouped = await fetchRange(dates[0], dates[dates.length - 1]);

                    dates.forEach((d) => {
                        const hadir = grouped[d] ?? 0;          // jumlah tap-in hari itu
                        const absen = Math.max(0, total - hadir);
                        newLabels.push(fmtShort(d));
                        newHadir.push(hadir);
                        newAbsen.push(absen);
                    });

                // ── WEEKLY: 6 minggu terakhir, 1 titik = total tap-in seminggu ─
                } else if (period === "Mingguan") {
                    const allDates = lastNDates(6 * 7);          // 42 hari
                    const grouped  = await fetchRange(
                        allDates[0],
                        allDates[allDates.length - 1]
                    );

                    for (let w = 0; w < 6; w++) {
                        const weekDates = allDates.slice(w * 7, w * 7 + 7);

                        // TOTAL tap-in selama seminggu (bukan rata-rata harian)
                        const tapTotal = weekDates.reduce(
                            (sum, d) => sum + (grouped[d] || 0), 0
                        );

                        // Jumlah siswa yang TIDAK hadir sama sekali dalam seminggu:
                        // gunakan hari paling aktif dalam minggu itu sebagai referensi
                        // agar konsisten dengan daily (perhari vs perminggu beda skala).
                        // Kita tampilkan total tap-in seminggu vs (total * hari_sekolah_seminggu).
                        // Hari sekolah dalam seminggu = 5 (Senin–Jumat)
                        const schoolDaysInWeek = 5;
                        const maxPossible = total * schoolDaysInWeek;
                        const absenTotal  = Math.max(0, maxPossible - tapTotal);

                        // Label: "07/06 – 13/06"
                        const labelStart = fmtShort(weekDates[0]);
                        const labelEnd   = fmtShort(weekDates[6]);
                        newLabels.push(`${labelStart}–${labelEnd}`);
                        newHadir.push(tapTotal);
                        newAbsen.push(absenTotal);
                    }

                // ── MONTHLY: 6 bulan terakhir, 1 titik = total tap-in sebulan ──
                } else if (period === "Bulanan") {
                    const today        = new Date();
                    const twelveMonthsAgo = new Date(
                        today.getFullYear(),
                        today.getMonth() - 11,
                        1
                    );
                    const startStr = twelveMonthsAgo.toISOString().split("T")[0];
                    const endStr   = today.toISOString().split("T")[0];
                    const grouped  = await fetchRange(startStr, endStr);

                    for (let m = 11; m >= 0; m--) {
                        const date  = new Date(
                            today.getFullYear(),
                            today.getMonth() - m,
                            1
                        );
                        const year  = date.getFullYear();
                        const month = date.getMonth() + 1;
                        const days  = new Date(year, month, 0).getDate();

                        // TOTAL tap-in selama sebulan (bukan rata-rata)
                        const tapTotal = Array.from({ length: days }, (_, i) => {
                            const day = String(i + 1).padStart(2, "0");
                            return `${year}-${String(month).padStart(2, "0")}-${day}`;
                        }).reduce((sum, d) => sum + (grouped[d] || 0), 0);

                        // Hari sekolah efektif dalam bulan ≈ 22 hari × total siswa
                        const schoolDaysInMonth = 22;
                        const maxPossible = total * schoolDaysInMonth;
                        const absenTotal  = Math.max(0, maxPossible - tapTotal);

                        newLabels.push(
                            date.toLocaleDateString("id-ID", {
                                month: "short",
                                year: "2-digit",
                            })
                        );
                        newHadir.push(tapTotal);
                        newAbsen.push(absenTotal);
                    }

                // ── YEARLY: 5 tahun terakhir, 1 titik = total tap-in setahun ──
                } else {
                    const today        = new Date();
                    const currentYear  = today.getFullYear();
                    const startYear    = currentYear - 4; // 5 tahun terakhir
                    const startStr     = `${startYear}-01-01`;
                    const endStr       = `${currentYear}-12-31`;
                    const grouped      = await fetchRange(startStr, endStr);

                    for (let y = startYear; y <= currentYear; y++) {
                        let tapTotal = 0;
                        Object.keys(grouped).forEach((dateStr) => {
                            if (dateStr.startsWith(`${y}-`)) {
                                tapTotal += grouped[dateStr] || 0;
                            }
                        });

                        // Hari sekolah efektif dalam setahun ≈ 220 hari × total siswa
                        const schoolDaysInYear = 220;
                        const maxPossible = total * schoolDaysInYear;
                        const absenTotal  = Math.max(0, maxPossible - tapTotal);

                        newLabels.push(`${y}`);
                        newHadir.push(tapTotal);
                        newAbsen.push(absenTotal);
                    }
                }

                setLabels(newLabels);
                setHadirData(newHadir);
                setAbsenData(newAbsen);
            } catch (err) {
                console.error("AttendanceComparisonChart:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [period]);

    // ── Render Chart.js ───────────────────────────────────────────────────────
    useEffect(() => {
        if (isLoading || !chartRef.current || hadirData.length === 0) return;

        const ctx = chartRef.current.getContext("2d");
        if (chartInstance.current) chartInstance.current.destroy();

        const gradHadir = ctx.createLinearGradient(0, 0, 0, 220);
        gradHadir.addColorStop(0, "rgba(99,102,241,0.18)");
        gradHadir.addColorStop(1, "rgba(99,102,241,0)");

        const maxVal  = Math.max(...hadirData);
        const peakIdx = hadirData.indexOf(maxVal);

        chartInstance.current = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Hadir",
                        data: hadirData,
                        borderColor: "#6366f1",
                        backgroundColor: gradHadir,
                        fill: true,
                        tension: 0.45,
                        pointBackgroundColor: hadirData.map((_, i) =>
                            i === peakIdx ? "#6366f1" : "#fff"
                        ),
                        pointBorderColor: "#6366f1",
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        borderWidth: 2,
                    },
                    {
                        label: "Tidak Hadir",
                        data: absenData,
                        borderColor: "#ef4444",
                        backgroundColor: "transparent",
                        fill: false,
                        tension: 0.45,
                        pointBackgroundColor: "#fff",
                        pointBorderColor: "#ef4444",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (c) => ` ${c.dataset.label}: ${c.parsed.y} siswa`,
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#9ca3af",
                            font: { size: 10 },
                            maxRotation: 45,
                            autoSkip: false,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: "#9ca3af",
                            font: { size: 11 },
                            precision: 0,
                        },
                        grid: { color: "#f3f4f6" },
                    },
                },
            },
        });

        return () => chartInstance.current?.destroy();
    }, [hadirData, absenData, labels, isLoading]);

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm sm:text-base font-bold text-gray-900">
                    Grafik Kehadiran
                </h3>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-500">
                        {PERIODS.map((p) => (
                            <label
                                key={p}
                                className="flex items-center gap-1.5 cursor-pointer select-none bg-gray-50 sm:bg-transparent px-2.5 py-1 sm:p-0 rounded-lg sm:rounded-none border sm:border-0 border-gray-100"
                            >
                                <input
                                    type="radio"
                                    name="acc-period"
                                    value={p}
                                    checked={period === p}
                                    onChange={() => setPeriod(p)}
                                    className="accent-indigo-500 w-3.5 h-3.5"
                                />
                                <span
                                    className={
                                        period === p
                                            ? "text-indigo-600 font-semibold"
                                            : ""
                                    }
                                >
                                    {p}
                                </span>
                            </label>
                        ))}
                    </div>
                    <AlignJustify className="w-4 h-4 text-gray-400 flex-shrink-0 hidden sm:block" />
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-5 mb-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="inline-block w-5 sm:w-6 h-0.5 bg-indigo-500 rounded" />
                    Hadir
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    {/* Dashed line legend */}
                    <svg width="24" height="8" viewBox="0 0 24 8" fill="none">
                        <line
                            x1="0" y1="4" x2="24" y2="4"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="5 4"
                        />
                    </svg>
                    Tidak Hadir
                </span>
            </div>

            {/* Chart */}
            <div className="relative h-56 sm:h-64 md:h-72 w-full">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
                    </div>
                ) : (
                    <canvas ref={chartRef} />
                )}
            </div>

            {/* Footnote konteks skala */}
            {!isLoading && (period === "Mingguan" || period === "Bulanan" || period === "Tahunan") && (
                <p className="mt-2 text-[10px] text-gray-400 text-left sm:text-right">
                    {period === "Mingguan"
                        ? "Total tap-in per minggu · estimasi tidak hadir = total siswa × 5 hari"
                        : period === "Bulanan"
                        ? "Total tap-in per bulan · estimasi tidak hadir = total siswa × 22 hari"
                        : "Total tap-in per tahun · estimasi tidak hadir = total siswa × 220 hari"}
                </p>
            )}
        </div>
    );
}