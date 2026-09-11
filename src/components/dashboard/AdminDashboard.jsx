import { useState, useEffect, useCallback } from "react";
import {
    Users, Clock, CloudOff, AlertTriangle, Moon, CalendarCheck,
    Settings, ShieldCheck, RefreshCw
} from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import StatCard from "./StatCard.jsx";
import AttendanceComparisonChart from "../attendance/AttendanceComparisonChart.jsx";
import { absensiSiswa, siswa, kelas, detailAbsensi } from "../../lib/backendApi";

// Realtime Clock
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
    const dateStr = now.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="flex flex-row lg:flex-col items-center lg:items-start justify-between lg:justify-start w-full gap-2">
            <div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{timeStr}</div>
                <div className="text-xs text-gray-400 mt-0.5">Waktu Terkini</div>
            </div>
            <div className="text-right lg:text-left lg:mt-5 text-xs sm:text-sm font-semibold text-gray-700">
                <span>Hari ini:</span>
                <br />
                <span className="text-sm sm:text-base font-bold text-gray-900">{dateStr}</span>
            </div>
        </div>
    );
}

// Helpers

/**
 * Ambil SEMUA siswa tanpa batas pagination.
 */
async function fetchTotalSiswa() {
    try {
        const res = await siswa.list("limit=99999&page=1");
        if (res?.success) {
            if (res.pagination?.total !== undefined) return res.pagination.total;
            if (Array.isArray(res.data)) return res.data.length;
        }
        return 0;
    } catch (e) {
        console.error("fetchTotalSiswa error", e);
        return 0;
    }
}

/**
 * Ambil semua kelas aktif.
 */
async function fetchSemuaKelas() {
    try {
        const res = await kelas.list("limit=99999&page=1");
        if (res?.success && Array.isArray(res.data)) return res.data;
        return [];
    } catch (e) {
        console.error("fetchSemuaKelas error", e);
        return [];
    }
}

async function fetchStatsHarian(today) {
    // Fetch laporan harian (tap-in RFID & manual) 
    const laporanRes = await absensiSiswa.laporanHarian(`tanggal=${today}`);
    const list = (laporanRes?.success && Array.isArray(laporanRes.data))
        ? laporanRes.data
        : [];

    let hadir = 0, terlambat = 0, izin = 0, sakit = 0, alpha = 0;

    list.forEach((r) => {
        const sh = r.status_harian;
        const st = r.status_tapin; // "Terlambat" or "Tepat_Waktu"

        if (sh === "Izin") {
            izin++;
        } else if (sh === "Sakit") {
            sakit++;
        } else if (sh === "Alpha") {
            alpha++;
        } else if (sh === "Hadir") {
            if (st === "Terlambat") {
                terlambat++;
            } else {
                hadir++;
            }
        } else {
            // Fallback for unset status_harian
            if (st === "Terlambat") {
                terlambat++;
            } else if (st === "Tepat_Waktu") {
                hadir++;
            } else {
                alpha++;
            }
        }
    });

    const tercatat = list.length; // jumlah siswa yang tercatat tap-in atau override

    return { hadir, terlambat, izin, sakit, alpha, tercatat };
}

// Dashboard
export default function AdminDashboard() {
    const [stats, setStats] = useState({
        total:      0,
        hadir:      0,
        absen:      0,
        terlambat:  0,
        izin:       0,
        sakit:      0,
        alpha:      0,
    });
    const [loading, setLoading]         = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

            // Ambil total siswa
            const totalSiswa = await fetchTotalSiswa();

            // Hitung stats dari data harian
            const { hadir, terlambat, izin, sakit, alpha, tercatat } =
                await fetchStatsHarian(today);

            // Tidak hadir = siswa yang sama sekali tidak ada record tap-in/override
            const absen = Math.max(0, totalSiswa - tercatat);

            setStats({
                total:     totalSiswa,
                hadir,
                absen,
                terlambat,
                izin,
                sakit,
                alpha,
            });
            setLastUpdated(new Date());
        } catch (e) {
            console.error("Admin stats error", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const fmtTime = (d) => d ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : null;

    const cards = [
        {
            value: stats.total,
            label: "Total Siswa",
            icon: <Users className="w-5 h-5" />,
            trend: { direction: "neutral", label: "Data tersinkronisasi" },
        },
        {
            value: stats.hadir,
            label: "Hadir Tepat Waktu",
            icon: <Clock className="w-5 h-5" />,
            trend: { direction: "up", label: "Absensi hari ini" },
        },
        {
            value: stats.absen,
            label: "Tidak Hadir",
            icon: <CloudOff className="w-5 h-5" />,
            trend: { direction: "down", label: "Belum tercatat hari ini" },
        },
        {
            value: stats.terlambat,
            label: "Terlambat",
            icon: <AlertTriangle className="w-5 h-5" />,
            trend: { direction: "down", label: "Kedatangan terlambat" },
        },
        {
            value: stats.sakit,
            label: "Sakit",
            icon: <Moon className="w-5 h-5" />,
            trend: { direction: "neutral", label: "Sakit hari ini" },
        },
        {
            value: stats.izin,
            label: "Izin",
            icon: <CalendarCheck className="w-5 h-5" />,
            trend: { direction: "neutral", label: "Izin hari ini" },
        },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <PageHeader
                title="Admin Dashboard"
                subtitle={
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm">
                        <span>Lihat dan pantau Data Siswa saat ini</span>
                    </span>
                }
            />

            <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
                {/* ── Top: clock + stat cards ── */}
                <div className="flex flex-col lg:flex-row gap-3 sm:gap-5 mb-4 sm:mb-5">
                    {/* Clock panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col justify-between w-full lg:w-56 lg:min-w-[224px]">
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-gray-300 mb-2 sm:mb-3 hidden lg:block" />
                        <RealtimeClock />
                    </div>

                    {/* Stat grid */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                        {cards.map((c) => (
                            <StatCard key={c.label} {...c} loading={loading} />
                        ))}
                    </div>
                </div>

                {/* Bottom: chart */}
                <div className="grid grid-cols-1 gap-4 sm:gap-5">
                    <AttendanceComparisonChart />
                </div>
            </div>
        </div>
    );
}