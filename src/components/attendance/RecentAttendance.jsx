import { useState, useEffect } from "react";
import { absensiSiswa } from "../../lib/backendApi";

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export default function RecentAttendance() {
  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const today = getTodayWIB();
        const res = await absensiSiswa.laporanHarian(`tanggal=${today}`);
        if (res.success && Array.isArray(res.data)) {
          const sorted = [...res.data].sort((a, b) => {
            const timeA = a.tap_in ? a.tap_in : "00:00";
            const timeB = b.tap_in ? b.tap_in : "00:00";
            return timeB.localeCompare(timeA);
          });

          const recent = sorted.slice(0, 5).map(item => ({
            name: item.siswa.nama,
            time: item.tap_in || "-",
            status: item.status_tapin === "TEPAT_WAKTU" 
              ? "Tepat Waktu" 
              : item.status_tapin === "TERLAMBAT"  
              ? "Terlambat" 
              : "Absent"
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
            <li
              key={index}
              className="flex items-center justify-between py-2 border-b last:border-none"
            >
              <span className="font-medium">{item.name}</span>
              <span className="text-sm text-gray-500">{item.time}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  item.status === "Terlambat"
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