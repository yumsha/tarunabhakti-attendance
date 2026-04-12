import RecentAttendance from "../attendance/RecentAttendance.jsx";
import StudentStats from "../attendance/StudentStats.jsx";
import YearlyAttendanceChart from "../attendance/YearlyAttendanceChart.jsx";
import LateStudents from "../attendance/LateStudents.jsx";
import PageHeader from "../layout/PageHeader.jsx";

export default function AdminDashboard() {
    const user = JSON.parse(localStorage.getItem("user")) ?? {};
    const displayName = user.guru?.nama ?? user.email ?? "Admin";

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Bar */}
            <PageHeader title="Admin Dashboard" />

            {/* Welcome Sign */}
            <div className="p-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}!</h2>
                <p className="text-gray-600">Ini adalah data absensi yang terjadi hari ini.</p>
            </div>

            {/* Stats Cards */}
            <div className="flex-1 overflow-auto p-8 z-10">
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-6 mb-3">
                        <StudentStats />
                        <RecentAttendance />
                    </div>
                    <div className="mb-6">
                        <YearlyAttendanceChart />
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                    </div>
                </div>
            </div>
        </div>
    );
}