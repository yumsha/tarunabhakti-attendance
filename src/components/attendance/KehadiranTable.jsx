import { useState, useEffect } from "react";
import { kelas, absensiSiswa, detailAbsensi } from "../../lib/backendApi";

export default function KehadiranTable() {
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(null);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);

  // Helper to format class name
  const formatClassName = (cls) => {
    if (!cls) return "";
    return `${cls.kelas} ${cls.jurusan?.nama_jurusan || ''}`;
  }

  // Handle URL Params and Fetch Class Details
  useEffect(() => {
    // Load user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }

    const handleUrlParams = async () => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const kelasId = params.get("kelasId");

        if (kelasId && kelasId !== selectedClassId) {
            setSelectedClassId(kelasId);
            // Fetch class details
            try {
                const res = await kelas.get(kelasId);
                if (res.success) {
                    setSelectedClassData(res.data);
                }
            } catch (e) {
                console.error("Failed to fetch class details", e);
            }
        }
    };

    handleUrlParams();
    
    // Listen for navigation events
    window.addEventListener('popstate', handleUrlParams);
    document.addEventListener("astro:after-swap", handleUrlParams); // Handle Astro view transitions if any
    
    // Also a polling mechanism or interval isn't ideal, but Astro's view transitions
    // might re-run scripts.
    // Ideally, the Sidebar should trigger a navigation that re-renders this component
    // or we listen to URL changes.
    // Since we are inside a React component, we might not inherently react to URL changes
    // unless the parent unmounts/remounts or we listen to history.
    
    // A simple hack: check URL every 500ms if not using a router
    const interval = setInterval(handleUrlParams, 500);

    return () => {
        window.removeEventListener('popstate', handleUrlParams);
        document.removeEventListener("astro:after-swap", handleUrlParams);
        clearInterval(interval);
    }
  }, [selectedClassId]);

  // Fetch attendance when class or date changes
  useEffect(() => {
    const fetchAttendance = async () => {
        if (!selectedClassId) {
            setAttendanceData([]);
            return;
        }
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

  const handleKonfirmasi = async (item) => {
    setSubmitting(item.id);
    try {
      const guruId = user?.guru?.id;
      if (!guruId) {
        setSubmitMessage({ 
          type: 'error', 
          text: 'User guru_id tidak ditemukan. Silakan login kembali.' 
        });
        setSubmitting(null);
        return;
      }

      // Get jadwal for this class and day
      const today = new Date()
        .toLocaleDateString("id-ID", { weekday: "long" })
        .toUpperCase();

      const jadwalRes = await fetch(
        `http://localhost:3000/api/v1/jadwal?kelas_id=${selectedClassId}&hari=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
      const jadwalData = await jadwalRes.json();

      if (!jadwalData.success || !jadwalData.data || jadwalData.data.length === 0) {
        setSubmitMessage({ 
          type: 'error', 
          text: 'Jadwal tidak ditemukan untuk hari ini.' 
        });
        setSubmitting(null);
        return;
      }

      const jadwal = jadwalData.data[0];
      console.debug('Using jadwal ID:', jadwal.id, 'for absensi ID:', item.id);

      // Create detail absensi record directly via new endpoint
      const payload = {
        absensi_id: item.id,
        jadwal_id: jadwal.id,
        guru_id: guruId,
        keterangan: "HADIR"
      };
      
      console.debug('Sending payload:', payload);
      
      // Use new create endpoint (doesn't require active jadwal)
      const res = await fetch('http://localhost:3000/api/v1/detail-absensi/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json();
      console.debug('Response:', responseData, 'Status:', res.status);

      if (res.ok && responseData.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: `${item.siswa?.nama} berhasil dikonfirmasi sebagai HADIR` 
        });
        
        setTimeout(() => {
          const fetchAttendance = async () => {
            try {
              const params = new URLSearchParams({
                kelas_id: selectedClassId,
                tanggal: filterDate
              });
              const freshRes = await absensiSiswa.list(params.toString());
              if (freshRes.success) {
                setAttendanceData(freshRes.data);
              }
            } catch (e) {
              console.error("Failed to refresh attendance", e);
            }
          };
          fetchAttendance();
        }, 500);
      } else {
        setSubmitMessage({ 
          type: 'error', 
          text: `Gagal mengkonfirmasi: ${responseData.message || 'Unknown error'}` 
        });
      }
    } catch (error) {
      console.error("Error confirming attendance:", error);
      setSubmitMessage({ 
        type: 'error', 
        text: `Terjadi kesalahan: ${error.message}` 
      });
    } finally {
      setSubmitting(null);
      setTimeout(() => setSubmitMessage({ type: '', text: '' }), 3000);
    }
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
                {selectedClassData ? `Kehadiran ${formatClassName(selectedClassData)}` : "Pilih Kelas dari Sidebar"}
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

            {/* Submission Message */}
            {submitMessage.text && (
              <div className={`mb-4 p-4 rounded-lg text-sm font-medium ${
                submitMessage.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {submitMessage.text}
              </div>
            )}

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
                        {!selectedClassId ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    Silakan pilih kelas dari menu sidebar untuk melihat data kehadiran.
                                </td>
                            </tr>
                        ) : loading ? (
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
                                        <button 
                                          onClick={() => handleKonfirmasi(item)}
                                          disabled={submitting === item.id}
                                          className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium border border-blue-300 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed">
                                            {submitting === item.id ? 'Mengirim...' : 'Konfirmasi'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                    Belum ada data kehadiran untuk kelas ini hari ini.
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
