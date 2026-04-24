import { useState, useEffect } from "react";
import { CheckCircle2, Clock3, ScanLine, LogOut } from "lucide-react";
import { absensiSiswa } from "../../lib/backendApi";
import InfoStatCard from "../layout/InfoStatCard";

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
            helper: "Siswa hadir sesuai jam masuk",
            tone: "emerald",
            icon: <CheckCircle2 className="h-5 w-5" />,
        },
        {
            label: "Terlambat",
            value: stats.terlambat,
            helper: "Perlu perhatian kedisiplinan",
            tone: "amber",
            icon: <Clock3 className="h-5 w-5" />,
        },
        {
            label: "Belum Tap In",
            value: stats.belum_tap_in,
            helper: "Belum tercatat masuk hari ini",
            tone: "red",
            icon: <ScanLine className="h-5 w-5" />,
        },
        {
            label: "Belum Tap Out",
            value: stats.belum_tap_out,
            helper: "Sudah masuk, belum tercatat pulang",
            tone: "orange",
            icon: <LogOut className="h-5 w-5" />,
        },
        {
            label: "Total Tap In",
            value: stats.total,
            helper: "Total siswa yang sudah tap masuk",
            tone: "blue",
            icon: <CheckCircle2 className="h-5 w-5" />,
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Data Kehadiran Hari Ini</h3>

            {error ? (
                <div className="text-sm text-red-500 py-4 text-center">{error}</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {cards.map(({ label, value, helper, tone, icon }) => (
                        <InfoStatCard
                            key={label}
                            label={label}
                            value={value}
                            helper={helper}
                            tone={tone}
                            icon={icon}
                            loading={loading}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
