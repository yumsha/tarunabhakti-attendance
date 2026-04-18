
import RecentAttendance from "../attendance/RecentAttendance.jsx";
import StudentStats from "../attendance/StudentStats.jsx";
import YearlyAttendanceChart from "../attendance/YearlyAttendanceChart.jsx";
import LateStudents from "../attendance/LateStudents.jsx";
import StatCard from "./StatCard.jsx";
import { TrendingUp, Settings, Users, ShoppingCart, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { absensiSiswa, siswa } from "../../lib/backendApi";


export default function KesiswaanDashboard() {
    const user = JSON.parse(localStorage.getItem("user")) ?? {};
    const displayName = user.guru?.nama ?? user.email ?? "Admin";

    const [stats, setStats] = useState({
        aktif: 0,
        telat: 0,
        izin: 0,
        sakit: 0,
        total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);
                const today = new Date().toISOString().split("T")[0];
                const [absensiRes, siswaRes] = await Promise.all([
                    absensiSiswa.laporanHarian(`tanggal=${today}`),
                    siswa.list(),
                ]);
                let aktif = 0, telat = 0, izin = 0, sakit = 0;
                if (absensiRes.success && Array.isArray(absensiRes.data)) {
                    aktif = absensiRes.data.length;
                    telat = absensiRes.data.filter(item => item.status_tapin === "TERLAMBAT").length;
                    izin = absensiRes.data.filter(item => item.keterangan === "IZIN").length;
                    sakit = absensiRes.data.filter(item => item.keterangan === "SAKIT").length;
                }
                let total = 0;
                if (siswaRes && Array.isArray(siswaRes.data)) {
                    total = siswaRes.data.length;
                }
                setStats({ aktif, telat, izin, sakit, total });
            } catch (err) {
                setError("Gagal memuat data statistik");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">Kesiswaan Dashboard</h1>
            </header>

            {/* Welcome Sign */}
            <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}!</h2>
                <p className="text-gray-600">Ini adalah data absensi yang terjadi hari ini.</p>
            </div>

            {/* Stats 5 Cards */}
            <div className="flex gap-4 px-8 pb-4">
                <StatCard
                    icon={<TrendingUp className="text-white w-6 h-6" />}
                    title="Aktifitas Siswa"
                    subtitle="Siswa yang melakukan absensi hari ini "
                    value={loading ? "..." : stats.aktif}
                    color="bg-green-400"
                    valueColor="text-green-500"
                />
                <StatCard
                    icon={<Settings className="text-white w-6 h-6" />}
                    title="Siswa Telat"
                    subtitle="Siswa yang datang terlambat hari ini"
                    value={loading ? "..." : stats.telat}
                    color="bg-red-400"
                    valueColor="text-red-500"
                />
                <StatCard
                    icon={<Users className="text-white w-6 h-6" />}
                    title="Siswa Izin"
                    subtitle="Siswa Izin"
                    value={loading ? "..." : stats.izin}
                    color="bg-yellow-400"
                    valueColor="text-yellow-500"
                />
                <StatCard
                    icon={<ShoppingCart className="text-white w-6 h-6" />}
                    title="Siswa Sakit"
                    subtitle="Siswa Sakit"
                    value={loading ? "..." : stats.sakit}
                    color="bg-indigo-500"
                    valueColor="text-indigo-600"
                />
                <StatCard
                    icon={<MessageSquare className="text-white w-6 h-6" />}
                    title="Total Siswa"
                    subtitle="Total seluruh Siswa"
                    value={loading ? "..." : stats.total}
                    color="bg-yellow-400"
                    valueColor="text-yellow-500"
                />
            </div>
            {error && <div className="px-8 text-red-500 text-sm">{error}</div>}
        </div>
    );
}
