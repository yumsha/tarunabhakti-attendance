import { useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard.jsx";
import GuruDashboard from "./GuruDashboard.jsx";
import WalasDashboard from "./WalasDashboard.jsx";

export default function DashboardSwitcher() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(userStr);

      // Prioritaskan roles array (format baru dari BE), fallback ke role object/string
      const resolvedRole =
        user.roles?.[0]?.name?.toUpperCase()
        ?? user.role_names?.[0]
        ?? user.role?.name?.toUpperCase()
        ?? (typeof user.role === "string" ? user.role.toUpperCase() : null);

      setRole(resolvedRole ?? "UNKNOWN");
    } catch {
      window.location.href = "/login";
    }
  }, []);

  if (!role) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (role === "ADMIN") return <AdminDashboard />;
  if (role === "GURU") return <GuruDashboard />;
  if (role === "WALI KELAS") return <WalasDashboard />;

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Role Tidak Dikenali</h2>
        <p className="text-gray-600">Hubungi administrator untuk mendapatkan akses.</p>
      </div>
    </div>
  );
}