import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

export default function RecentAttendance() {
  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await absensiSiswa.laporanHarian();
        if (res.success && Array.isArray(res.data)) {
            // Take the last 5 or 10 entries as "recent" based on tap_in time
            // The API returns data sorted by tap_in asc, so we might want to reverse it or take from end
            const sorted = [...res.data].sort((a, b) => {
                 // Sort by latest tap_in
                 const timeA = a.tap_in ? a.tap_in : "00:00";
                 const timeB = b.tap_in ? b.tap_in : "00:00";
                 return timeB.localeCompare(timeA);
            });
            
            const recent = sorted.slice(0, 5).map(item => ({
                name: item.siswa.nama,
                time: item.tap_in || "-",
                status: item.status_tapin === "TEPAT_WAKTU" ? "Present" : item.status_tapin === "TELAMBAT" ? "Late" : "Absent"
            }));
            
            setRecentAttendance(recent);
        }
      } catch (error) {
        console.error("Failed to fetch recent attendance:", error);
      }
    };

    fetchAttendance();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h3 className="text-lg font-semibold mb-4">Recent Attendance</h3>
      <ul>
        {recentAttendance.length > 0 ? (
          recentAttendance.map((item, index) => (
            <li key={index} className="flex items-center justify-between py-2 border-b last:border-none">
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-500">{item.time}</span>
              <span 
                className={`text-xs px-2 py-1 rounded-full ${
                  item.status === "Late" 
                    ? "bg-red-100 text-red-700" 
                    : item.status === "Absent" 
                    ? "bg-gray-100 text-gray-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {item.status}
              </span>
            </li>
          ))
        ) : (
          <li className="py-2 text-gray-500 text-sm">Belum ada absensi hari ini.</li>
        )}
      </ul>
    </div>
  );
}
