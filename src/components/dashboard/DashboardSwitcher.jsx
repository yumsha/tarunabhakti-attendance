import { useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard.jsx";
import GuruDashboard from "./GuruDashboard.jsx";
import WalasDashboard from "./WalasDashboard.jsx";

export default function DashboardSwitcher() {
  const [roles, setRoles] = useState(null);

  const resolveRoles = (userData) => {
    const fromRoles = Array.isArray(userData?.roles)
      ? userData.roles.map((r) => r?.name).filter(Boolean)
      : [];
    const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
    const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
    const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];

    const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
      .filter(Boolean)
      .map((r) => String(r).toUpperCase());

    const normalized = merged.map((r) => (r === "WALI KELAS" ? "WALAS" : r));
    return Array.from(new Set(normalized));
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      window.location.href = "/login";
      return;
    }

    try {
      const user = JSON.parse(userStr);

      const resolved = resolveRoles(user);
      setRoles(resolved.length > 0 ? resolved : ["UNKNOWN"]);
    } catch {
      window.location.href = "/login";
    }
  }, []);

  if (!roles) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (roles.includes("ADMIN")) return <AdminDashboard />;
  if (roles.includes("GURU")) return <GuruDashboard />;
  if (roles.includes("WALAS")) return <WalasDashboard />;

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Role Tidak Dikenali</h2>
        <p className="text-gray-600">Hubungi administrator untuk mendapatkan akses.</p>
      </div>
    </div>
  );
}