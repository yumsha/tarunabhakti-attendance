import { useState, useEffect } from "react";
import {
    Users, Clock, CloudOff, AlertTriangle, Moon, CalendarCheck, Settings, ShieldCheck
} from "lucide-react";
import PageHeader from "../layout/PageHeader.jsx";
import StatCard from "./StatCard.jsx";
import AttendanceComparisonChart from "../attendance/AttendanceComparisonChart.jsx";
import WeeklyAttendanceChart from "../attendance/WeeklyAttendanceChart.jsx";
import { absensiSiswa, siswa } from "../../lib/backendApi";

// ── Realtime Clock ────────────────────────────────────────────────────────────
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
    const dateStr = now.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">{timeStr}</div>
            <div className="text-xs text-gray-400 mt-0.5">Realtime Insight</div>
            <div className="mt-5 text-sm font-semibold text-gray-700">
                Today:
                <br />
                <span className="text-base font-bold text-gray-900">{dateStr}</span>
            </div>
        </div>
    );
}

export default function SuperAdminDashboard() {
    const [stats, setStats] = useState({
        total: 0,
        hadir: 0,
        absen: 0,
        telat: 0,
        pulangAwal: 0,
        izin: 0,
        sakit: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const today = new Date().toISOString().split("T")[0];
                const [absensiRes, siswaRes] = await Promise.all([
                    absensiSiswa.laporanHarian(`tanggal=${today}`),
                    siswa.list(),
                ]);

                let hadir = 0, telat = 0, izin = 0, sakit = 0, pulangAwal = 0;
                if (absensiRes?.success && Array.isArray(absensiRes.data)) {
                    telat = absensiRes.data.filter((r) => r.status_tapin === "TERLAMBAT").length;
                    izin = absensiRes.data.filter((r) => r.keterangan === "IZIN").length;
                    sakit = absensiRes.data.filter((r) => r.keterangan === "SAKIT").length;
                    pulangAwal = absensiRes.data.filter((r) => r.status_tapout === "PULANG_AWAL").length;
                    hadir = absensiRes.data.length - telat;
                }
                const total = siswaRes?.data?.length ?? 0;
                const absen = Math.max(0, total - (hadir + telat + izin + sakit));

                setStats({ total, hadir, absen, telat, pulangAwal, izin, sakit });
            } catch (e) {
                console.error("SuperAdminDashboard stats error", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const cards = [
        {
            value: stats.total,
            label: "Total Siswa",
            icon: <Users className="w-5 h-5" />,
            trend: { direction: "down", label: "Data tersinkronisasi" },
        },
        {
            value: stats.hadir,
            label: "Hadir Tepat Waktu",
            icon: <Clock className="w-5 h-5" />,
            trend: { direction: "down", label: "Absensi hari ini" },
        },
        {
            value: stats.absen,
            label: "Tidak Hadir",
            icon: <CloudOff className="w-5 h-5" />,
            trend: { direction: "up", label: "Absen hari ini" },
        },
        {
            value: stats.telat,
            label: "Terlambat",
            icon: <AlertTriangle className="w-5 h-5" />,
            trend: { direction: "up", label: "Kedatangan terlambat" },
        },
        {
            value: stats.sakit,
            label: "Sakit",
            icon: <Moon className="w-5 h-5" />,
            trend: { direction: "down", label: "Sakit hari ini" },
        },
        {
            value: stats.izin,
            label: "Izin",
            icon: <CalendarCheck className="w-5 h-5" />,
            trend: { direction: "up", label: "Izin hari ini" },
        },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
            <PageHeader
                title="Super Admin Dashboard"
                subtitle={
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2.5 py-0.5 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Super Administrator
                    </span>
                }
            />

            <div className="flex-1 overflow-auto p-6">
                {/* ── Top: clock + stat cards ── */}
                <div className="flex gap-5 mb-5">
                    {/* Clock panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between min-w-[200px] w-[200px]">
                        <Clock className="w-10 h-10 text-gray-300 mb-3" />
                        <RealtimeClock />
                        <button className="mt-6 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors w-full justify-center">
                            <Settings className="w-4 h-4" />
                            Advanced Configuration
                        </button>
                    </div>

                    {/* 2×3 stat grid */}
                    <div className="flex-1 grid grid-cols-3 gap-4">
                        {cards.map((c) => (
                            <StatCard key={c.label} {...c} loading={loading} />
                        ))}
                    </div>
                </div>

                {/* ── Bottom: charts ── */}
                <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-2">
                        <AttendanceComparisonChart />
                    </div>

                    {/* klep klep klep siklepp */}
                    {/* <div className="col-span-1">
                        <WeeklyAttendanceChart />
                    </div> */}
                </div>
            </div>
        </div>
    );
}