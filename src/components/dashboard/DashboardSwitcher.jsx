import { useState, useEffect } from "react";
import AdminDashboard from "./AdminDashboard.jsx";
import SuperAdminDashboard from "./SuperAdminDashboard.jsx";
import GuruDashboard from "./GuruDashboard.jsx";
import WalasDashboard from "./WalasDashboard.jsx";
import KesiswaanDashboard from "./KesiswaanDashboard.jsx";  
import SiswaDashboard from "./SiswaDashboard.jsx";

function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("ysboToken");
}

export default function DashboardSwitcher() {
  const [roles, setRoles] = useState(null);

  const resolveRoles = (userData) => {
    const fromRoles = Array.isArray(userData?.roles)
      ? userData.roles
          .map((r) => {
            if (typeof r === 'string') return r;
            if (typeof r === 'object' && r !== null) return r?.name || r?.role;
            return null;
          })
          .filter(Boolean)
      : [];
    const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
    const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
    const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];

    const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
      .filter(Boolean)
      .map((r) => String(r).toUpperCase());

    const normalized = merged.map((r) => (r === "WALI KELAS" ? "WALAS" : r));
    if (userData?.siswa || userData?.nisn || userData?.nis || userData?.nipd) {
      normalized.push("SISWA");
    }
    return Array.from(new Set(normalized));
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      clearAuth();
      window.location.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);

      const resolved = resolveRoles(user);
      setRoles(resolved.length > 0 ? resolved : ["UNKNOWN"]);
    } catch {
      clearAuth();
      window.location.replace("/login");
    }
  }, []);

  if (!roles) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (roles.includes("SUPERADMIN") || roles.includes("SUPER ADMIN") || roles.includes("SUPER_ADMIN")) return <SuperAdminDashboard />;
  if (roles.includes("ADMIN")) return <AdminDashboard />;
  if (roles.includes("GURU")) return <GuruDashboard />;
  if (roles.includes("WALAS")) return <WalasDashboard />;
  if (roles.includes("KESISWAAN")) return <KesiswaanDashboard />;
  if (roles.includes("SISWA") || roles.includes("STUDENT")) return <SiswaDashboard />;

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Role Tidak Dikenali</h2>
        <p className="text-gray-600">Hubungi administrator untuk mendapatkan akses.</p>
      </div>
    </div>
  );
}
