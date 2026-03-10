import RecentAttendance from "../attendance/RecentAttendance.jsx";
import StudentStats from "../attendance/StudentStats.jsx";
import YearlyAttendanceChart from "../attendance/YearlyAttendanceChart.jsx";
import LateStudents from "../attendance/LateStudents.jsx";
import { useState, useEffect } from "react";
import { jadwal } from "../../lib/backendApi.js";

export default function AdminDashboard() {
      const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  const [jadwalData, setJadwalData] = useState([]);

  useEffect(() => {
    const fetchJadwal = async () => {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const adminId = user?.admin?.id;

      const today = new Date()
        .toLocaleDateString("id-ID", { weekday: "long" })
        .toUpperCase();

      try {
        const res = await jadwal.list(`hari=${today}&guru_id=${adminId}`);
        console.debug('jadwal.list response', res);
        if (res && res.success && Array.isArray(res.data)) {
          setJadwalData(res.data);
        } else {
          setJadwalData([]);
        }
      } catch (err) {
        console.error('Error fetching jadwal:', err);
      }
    };

    fetchJadwal();
  }, []);

    
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
                <div className="flex items-center gap-4">

                    <a href="/dashboard/profile">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                            {user?.email[0] || 'G'}
                        </div>
                    </a>

                </div>
            </header>

            {/* Welcome Sign */}
            <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, Admin!</h2>
                <p className="text-gray-600">Ini adalah data absensi yang terjadi hari ini.</p>
            </div>

            {/* Stats Cards */}
            <div className="flex-1 overflow-auto p-8">
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-6 mb-3">
                        <StudentStats />
                        <LateStudents />
                    </div>
                    <div className="mb-6">
                        <YearlyAttendanceChart />
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <RecentAttendance />
                    </div>
                </div>
            </div>
        </div>
    );
}
