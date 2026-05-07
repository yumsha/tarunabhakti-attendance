import { useState, useEffect } from "react";
import DaftarKehadiranKelas from "./DaftarKehadiranKelas";
import KehadiranTable from "./KehadiranTable";

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

function resolveRoles(userData) {
  const fromRoles = Array.isArray(userData?.roles)
    ? userData.roles.map((r) => (typeof r === "string" ? r : r?.name)).filter(Boolean)
    : [];
  const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
  const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
  const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];

  return Array.from(
    new Set(
      [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr]
        .filter(Boolean)
        .map((item) => String(item).toUpperCase())
        .map((item) => (item === "WALI KELAS" ? "WALAS" : item))
    )
  );
}

export default function AttendanceMain() {
  const [kelasId, setKelasId] = useState(null);
  const [canViewAttendance, setCanViewAttendance] = useState(false);

  useEffect(() => {
    const updateState = () => {
      const params = new URLSearchParams(window.location.search);
      setKelasId(params.get("kelasId"));

      const user = getUserFromStorage();
      const roles = resolveRoles(user);
      setCanViewAttendance(roles.includes("GURU") || roles.includes("WALAS"));
    };

    updateState();

    // Astro transition support
    document.addEventListener("astro:page-load", updateState);
    document.addEventListener("astro:after-swap", updateState);
    window.addEventListener("popstate", updateState);

    return () => {
      document.removeEventListener("astro:page-load", updateState);
      document.removeEventListener("astro:after-swap", updateState);
      window.removeEventListener("popstate", updateState);
    };
  }, []);

  if (!canViewAttendance) {
    return <KehadiranTable />;
  }

  if (kelasId) {
    return <KehadiranTable />;
  }

  return <DaftarKehadiranKelas />;
}
