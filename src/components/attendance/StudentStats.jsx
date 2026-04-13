import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

export default function StudentStats() {
    const [stats, setStats] = useState({
        tepat_waktu: 0,
        terlambat: 0,
        belum_tap_in: 0,
        belum_tap_out: 0,
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
                const res = await absensiSiswa.laporanHarian(`tanggal=${today}`);

                if (res.success && res.summary) {
                    const s = res.summary;
                    setStats({
                        tepat_waktu:   s.tepat_waktu   ?? 0,
                        terlambat:     s.terlambat     ?? 0,
                        belum_tap_in:  s.belum_tap_in  ?? 0,
                        belum_tap_out: s.belum_tap_out ?? 0,
                        total:         s.total         ?? 0,
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
            label: "Tepat Waktu",
            value: stats.tepat_waktu,
            bg: "bg-green-50",
            text: "text-green-700",
        },
        {
            label: "Terlambat",
            value: stats.terlambat,
            bg: "bg-yellow-50",
            text: "text-yellow-700",
        },
        {
            label: "Belum Tap In",
            value: stats.belum_tap_in,
            bg: "bg-red-50",
            text: "text-red-700",
        },
        {
            label: "Belum Tap Out",
            value: stats.belum_tap_out,
            bg: "bg-orange-50",
            text: "text-orange-700",
        },
        {
            label: "Total Tap In",
            value: stats.total,
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