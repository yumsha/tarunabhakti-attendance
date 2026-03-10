import { useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard.jsx";
import GuruDashboard from "./GuruDashboard.jsx";
import WalasDashboard from "./WalasDashboard.jsx";

export default function DashboardSwitcher() {
    const [role, setRole] = useState(null);

    useEffect(() => {
        const userStr = localStorage.getItem("user");

        if (!userStr) {
            setRole("unknown");
            return;
        }

        const user = JSON.parse(userStr);

        const roleMap = {
            1: "ADMIN",
            2: "GURU",
            3: "WALAS"
        };

        const role = roleMap[user?.role_id];


        setRole(role);
    }, []);

    if (!role) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (role === "ADMIN") {
        return <AdminDashboard />;
    }

    if (role === "GURU") {
        return <GuruDashboard />;
    }

    if (role === "WALAS") {
        return <WalasDashboard />;
    }

    return (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Role Undefined</h2>
                <p className="text-gray-600">Please contact administrator for access.</p>
            </div>
        </div>
    );
}