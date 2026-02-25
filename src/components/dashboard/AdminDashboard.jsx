import RecentAttendance from "../attendance/RecentAttendance.jsx";
import StudentStats from "../attendance/StudentStats.jsx";
import YearlyAttendanceChart from "../attendance/YearlyAttendanceChart.jsx";
import LateStudents from "../attendance/LateStudents.jsx";

export default function AdminDashboard() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
                <div className="flex items-center gap-4">
                    <button className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 015.646 5.646 9.001 9.001 0 0020.354 15.354z"></path>
                        </svg>
                    </button>
                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
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
