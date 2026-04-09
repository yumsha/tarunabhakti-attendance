import { useState, useEffect } from "react";
import { kelas, absensiSiswa } from "../../lib/backendApi";

export default function KehadiranTable() {
    const [classList, setClassList] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

    // Helper to format class name
    const formatClassName = (cls) => {
        if (!cls) return "";
        return `${cls.kelas} ${cls.jurusan?.nama_jurusan || ''}`;
    }

    // Handle URL changes
    useEffect(() => {
        const syncWithUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const id = params.get("kelasId");
            if (id) setSelectedClassId(id);
        };

        syncWithUrl();
        window.addEventListener("popstate", syncWithUrl);
        document.addEventListener("astro:page-load", syncWithUrl);
        return () => {
            window.removeEventListener("popstate", syncWithUrl);
            document.removeEventListener("astro:page-load", syncWithUrl);
        };
    }, []);

    // Fetch classes on mount
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await kelas.list();
                if (res.success && res.data) {
                    setClassList(res.data);

                    const params = new URLSearchParams(window.location.search);
                    const kelasIdFromUrl = params.get("kelasId");
                    if (!kelasIdFromUrl && res.data.length > 0) {
                        // Only default if no ID in URL (though AttendanceMain usually prevents this)
                        setSelectedClassId(res.data[0].id);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch classes", e);
            }
        };
        fetchClasses();
    }, []);

    // Fetch attendance when class or date changes
    useEffect(() => {
        const fetchAttendance = async () => {
            if (!selectedClassId) return;
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    kelas_id: selectedClassId,
                    tanggal: filterDate
                });
                const res = await absensiSiswa.list(params.toString());
                if (res.success) {
                    setAttendanceData(res.data);
                } else {
                    setAttendanceData([]);
                }
            } catch (e) {
                console.error("Failed to fetch attendance", e);
                setAttendanceData([]);
            } finally {
                setLoading(false);
            }
        }
        fetchAttendance();
    }, [selectedClassId, filterDate]);

    const selectedClass = classList.find(c => c.id == selectedClassId);

    return (
        <main className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {selectedClass ? `Kehadiran ${formatClassName(selectedClass)}` : "Kehadiran Siswa"}
                </h1>
                <div className="flex items-center gap-4">
                    <button className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 015.646 5.646 9.001 9.001 0 0020.354 15.354z"></path>
                        </svg>
                    </button>
                    <span className="text-sm text-gray-600">Admin</span>
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-auto p-8">
                {/* Filter */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        {/* Date Picker */}
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
                            <span className="text-gray-500 text-sm font-medium">Tanggal:</span>
                            <input
                                type="date"
                                className="outline-none text-sm text-gray-700 bg-transparent font-medium"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-600 hover:text-white transition-all duration-200 border border-red-100 shadow-sm"
                            onClick={() => alert(`Unduh PDF untuk ${formatClassName(selectedClass)} - ${filterDate} (Hardcoded)`)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Unduh PDF
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-semibold hover:bg-green-600 hover:text-white transition-all duration-200 border border-green-100 shadow-sm"
                            onClick={() => alert(`Unduh Excel untuk ${formatClassName(selectedClass)} - ${filterDate} (Hardcoded)`)}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Unduh Excel
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">NISN</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">No Telp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Waktu Tap In</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Konfirmasi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : attendanceData.length > 0 ? (
                                attendanceData.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.siswa?.nama}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.siswa?.NISN}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.siswa?.nomor_telepon || "-"}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                                            {item.tap_in || "-"}
                                            {item.status_tapin === "TELAMBAT" && (
                                                <div className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">Terlambat</div>
                                            )}
                                            {item.status_tapin === "TEPAT_WAKTU" && (
                                                <div className="px-2 py-1 bg-green-500 text-white rounded text-xs font-bold">Hadir</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{item.status_tapin}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium border border-blue-300 hover:bg-blue-100">
                                                Konfirmasi
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        Tidak ada data absensi untuk filter ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Simple Pagination Indication (if needed) */}
                <div className="mt-4 text-xs text-gray-500 text-center">
                    Menampilkan {attendanceData.length} data.
                </div>
            </div>
        </main>
    );
}
