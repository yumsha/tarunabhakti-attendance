import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

export default function StudentStats() {
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        izin: 0,
        sakit: 0,
        totalStudents: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);
                setError(null);

                const today = new Date().toISOString().split("T")[0];
                const res = await absensiSiswa.laporanHarian(`tanggal=${today}`);

                if (res.success && res.summary) {
                    const s = res.summary;
                    setStats({
                        // FIX: coba beberapa kemungkinan nama field dari API
                        present:        s.hadir          ?? s.total_hadir    ?? s.total_tap_in   ?? 0,
                        absent:         s.alpha          ?? s.total_alpha    ?? s.belum_tap_in   ?? 0,
                        izin:           s.izin           ?? s.total_izin     ?? 0,
                        sakit:          s.sakit          ?? s.total_sakit    ?? 0,
                        totalStudents:  s.total_siswa    ?? s.total          ?? 0,
                    });
                } else {
                    setError("Data tidak tersedia");
                }
            } catch (err) {
                console.error("Failed to fetch student stats:", err);
                setError("Gagal memuat data");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        {
            label: "Hadir",
            value: stats.present,
            bg: "bg-green-50",
            text: "text-green-700",
        },
        {
            label: "Absen (Tanpa Keterangan)",
            value: stats.absent,
            bg: "bg-red-50",
            text: "text-red-700",
        },
        {
            label: "Izin",
            value: stats.izin,
            bg: "bg-yellow-50",
            text: "text-yellow-700",
        },
        {
            label: "Sakit",
            value: stats.sakit,
            bg: "bg-orange-50",
            text: "text-orange-700",
        },
        {
            label: "Total Siswa",
            value: stats.totalStudents,
            bg: "bg-blue-50",
            text: "text-blue-700",
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Data Kehadiran Hari Ini</h3>

            {error ? (
                <div className="text-sm text-red-500 py-4 text-center">{error}</div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {cards.map(({ label, value, bg, text }) => (
                        <div key={label} className={`${bg} p-4 rounded`}>
                            <span className="text-sm text-gray-700">{label}</span>
                            {loading ? (
                                <div className="h-8 w-12 bg-gray-200 rounded animate-pulse mt-1" />
                            ) : (
                                <div className={`text-2xl font-bold ${text}`}>{value}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}