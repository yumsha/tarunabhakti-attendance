import { useState, useEffect } from "react";
import { kelas, absensiSiswa, detailAbsensi } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";

const formatClassName = (cls) => {
  if (!cls) return "";
  return `${cls.kelas} ${cls.jurusan?.nama_jurusan || ""}`;
};

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>;
  const map = {
    TEPAT_WAKTU: { label: "Tepat Waktu", cls: "bg-green-100 text-green-700" },
    TELAMBAT:    { label: "Terlambat",   cls: "bg-red-100 text-red-700" },
    HADIR:       { label: "Hadir",       cls: "bg-green-100 text-green-700" },
    IZIN:        { label: "Izin",        cls: "bg-yellow-100 text-yellow-700" },
    SAKIT:       { label: "Sakit",       cls: "bg-blue-100 text-blue-700" },
    ALPHA:       { label: "Alpha",       cls: "bg-gray-100 text-gray-600" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

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
        <PageHeader
          title={selectedClass ? `Kehadiran ${formatClassName(selectedClass)}` : "Kehadiran Siswa"}
        />

        {/* Content */}
        <div className="flex-1 overflow-auto p-8">
            {/* Filter */}
            <div className="flex items-center gap-4 mb-6">
                
                {/* Class Selector
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
                */}

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