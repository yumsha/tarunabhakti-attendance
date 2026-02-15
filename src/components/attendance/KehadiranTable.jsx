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

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
        try {
            const res = await kelas.list(); 
            if (res.success && res.data) {
                setClassList(res.data);
                if (res.data.length > 0) {
                    setSelectedClassId(res.data[0].id); // Default to first class
                }
            }
        } catch (e) {
            console.error("Failed to fetch classes", e);
        }
    }
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
            <div className="flex items-center gap-4 mb-6">
                
                {/* Class Selector */}
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
                    <span className="text-gray-500 text-sm">Kelas:</span>
                    <select 
                        className="outline-none text-sm text-gray-700 bg-transparent"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                    >
                        {classList.length === 0 && <option>Loading classes...</option>}
                        {classList.map(cls => (
                            <option key={cls.id} value={cls.id}>{formatClassName(cls)}</option>
                        ))}
                    </select>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-4 py-2">
                     <span className="text-gray-500 text-sm">Tanggal:</span>
                    <input 
                        type="date" 
                        className="outline-none text-sm text-gray-700 bg-transparent"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
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
