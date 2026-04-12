import { useState, useEffect } from "react";
import { kelas, jadwal } from "../lib/backendApi";

import { UserStarIcon } from "lucide-react";
import { UserCog } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { School } from "lucide-react";
import { Upload } from "lucide-react";

export default function SidebarContainer() {
  const [classes, setClasses] = useState([]);
  const [isAttendanceMenuOpen, setIsAttendanceMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [currentClassId, setCurrentClassId] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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

    // normalize some known variants
    const normalized = merged.map((r) => (r === "WALI KELAS" ? "WALAS" : r));

    return Array.from(new Set(normalized));
  };

  // Ambil role dengan cara yang sama seperti DashboardSwitcher
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);

        const resolved = resolveRoles(userData);
        setRoles(resolved.length > 0 ? resolved : ["UNKNOWN"]);
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
  }, []);

  const isAdmin = roles?.includes("ADMIN");
  const isWalas = roles?.includes("WALAS");
  const isGuru = roles?.includes("GURU");
  const isKesiswaan = roles?.includes("KESISWAAN");

  const normalize = (data) =>
    data.map((item) => {
      if (item.kelas && typeof item.kelas === "object") {
        return {
          id: item.kelas.id,
          kelas: item.kelas.kelas,
          jurusan: item.kelas.jurusan?.nama_jurusan || ''
        };
      }

      return {
        id: item.id,
        kelas: item.kelas || item.nama_kelas,
        jurusan: item.jurusan?.nama_jurusan || ''
      };
    }).filter((item, index, self) =>
      index === self.findIndex((t) => t.id === item.id)
    );

  useEffect(() => {
    const fetchClasses = async () => {
      if (!roles) return;
      
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;

        const parsedUser = JSON.parse(userStr);

        if (isAdmin) {
          const res = await kelas.list("limit=100");
          if (res.success && res.data) {
            setClasses(normalize(res.data));
          }
        } else if (isWalas) {
          const res = await kelas.list("limit=100");
          if (res.success && res.data) {
            const guruId = parsedUser.guru?.id;
            // cari kelas dimana ni guru = WALAS
            const filtered = res.data.filter(c => 
              c.walas_id === guruId || 
              c.wali_kelas_id === guruId ||
              c.walas?.id === guruId
            );
            setClasses(normalize(filtered));
          }
        } else if (isGuru) {
          const guruId = parsedUser.guru?.id;
          const today = new Date()
            .toLocaleDateString("id-ID", { weekday: "long" })
            .toUpperCase();

          const res = await jadwal.list(`hari=${today}&guru_id=${guruId}`);

          if (res && res.success && Array.isArray(res.data)) {
            setClasses(normalize(res.data));
          }
        }
      } catch (e) {
        console.error("Failed to fetch classes for sidebar", e);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [roles, isAdmin, isWalas, isGuru]);

  useEffect(() => {
    const updateState = () => {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        setCurrentPath(path);
        const kelasId = params.get("kelasId");
        setCurrentClassId(kelasId || "");

        if (path.includes("/dashboard/kehadiran") || kelasId) {
          setIsAttendanceMenuOpen(true);
        }
      }
    };

    updateState();

    document.addEventListener("astro:page-load", updateState);
    document.addEventListener("astro:after-swap", updateState);
    window.addEventListener("popstate", updateState);

    return () => {
      document.removeEventListener("astro:page-load", updateState);
      document.removeEventListener("astro:after-swap", updateState);
      window.removeEventListener("popstate", updateState);
    };
  }, []);

  const toggleAttendanceMenu = (e) => {
    e?.preventDefault();
    setIsAttendanceMenuOpen(!isAttendanceMenuOpen);
  };

  const getLinkClass = (path, exact = true) => {
    const isActive = exact ? currentPath === path : currentPath.startsWith(path);
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
        ? "bg-blue-600 text-white font-medium shadow-sm"
        : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
      }`;
  };

  // Loading state
  if (!roles) {
    return (
      <nav className="space-y-1 text-sm">
        <div className="px-4 py-3 text-gray-400 italic">Loading...</div>
      </nav>
    );
  }

  return (
    <nav className="space-y-1 text-sm">
      {/* dashboard */}
      <a
        href="/dashboard"
        data-astro-prefetch
        className={getLinkClass("/dashboard")}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Dashboard
      </a>
      {/* walas Dashboard */}
      {isWalas && (
        <a
          href="/dashboard/walas"
          data-astro-prefetch
          className={getLinkClass("/dashboard/walas")}
        >
          <UserStarIcon width={20} height={20}/>
          Dashboard Walas
        </a>
      )}

      {/* walas detail absensi */}
      {isWalas && (
        <a
          href="/dashboard/detailAbsensi"
          data-astro-prefetch
          className={getLinkClass("/dashboard/detailAbsensi")}
        >
          <ClipboardList width={20} height={20} />
          Detail Absensi
        </a>
      )}

      {/* walas infor kelas */}
      {isWalas && (
        <a
          href="/dashboard/walas-kelas"
          data-astro-prefetch
          className={getLinkClass("/dashboard/walas-kelas")}
        >
          <School width={20} height={20} />
          Informasi Kelas
        </a>
      )}
      
      {/* admin menambahkan siswa dan list siswa */}
      {isAdmin && (
        <a
          href="/dashboard/importSiswa"
          data-astro-prefetch
          className={getLinkClass("/dashboard/importSiswa")}
        >
          <School width={20} height={20} />
          Tambah siswa & list siswa
        </a>
      )}
          
      {/* admin - import ortu */}
      {isAdmin && (
        <a
          href="/dashboard/importOrangTua"
          data-astro-prefetch
          className={getLinkClass("/dashboard/importOrangTua")}
        >
          <Upload width={20} height={20} />
          Import Orang Tua
        </a>
      )}

      {/* admin - untuk mengelola Users */}
      {isAdmin && (
        <a
          href="/dashboard/users"
          data-astro-prefetch
          className={getLinkClass("/dashboard/users")}
        >
          <UserCog width={20} height={20} />
          Kelola Users
        </a>
      )}

      {/* admin - daftar kelas */}
      {isAdmin && (
        <a
          href="/dashboard/kelas"
          data-astro-prefetch
          className={getLinkClass("/dashboard/kelas")}
        >
          <School width={20} height={20} />
          Daftar Kelas
        </a>
      )}

      {/* Siswa - only for walas */}
      {(isWalas) && (
        <a
          href="/dashboard/siswa"
          data-astro-prefetch
          className={getLinkClass("/dashboard/siswa")}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Daftar Siswa
        </a>
      )}

      {/* Kehadiran for ADMIN btn biasa */}
      {isAdmin && (
        <a
          href="/dashboard/kehadiran"
          data-astro-prefetch
          className={getLinkClass("/dashboard/kehadiran", false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Daftar Kehadiran
        </a>
      )}

      {/* tambah jadwal */}

      {(isAdmin || isKesiswaan) && (
        <a
          href="/dashboard/tambahJadwal"
          data-astro-prefetch
          className={getLinkClass("/dashboard/tambahJadwal", false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          Tambah Jadwal
        </a>
      )}
      {/* Kehadiran Dropdown for WALAS & GURU */}
      {(isWalas || isGuru) && (
        <div className="space-y-1">
          <button
            onClick={toggleAttendanceMenu}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
              currentPath.startsWith("/dashboard/kehadiran") && !currentClassId
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Daftar Kehadiran</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isAttendanceMenuOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isAttendanceMenuOpen && (
            <div className="pl-12 space-y-1 mt-1">
              {loading ? (
                <div className="px-4 py-2 text-xs text-gray-400 italic">Memuat kelas...</div>
              ) : classes.length > 0 ? (
                classes.map((cls) => (
                  <a
                    key={cls.id}
                    href={`/dashboard/kehadiran?kelasId=${cls.id}`}
                    data-astro-prefetch
                    className={`block px-4 py-2 rounded-lg text-xs transition-all duration-200 ${
                      currentClassId === String(cls.id)
                        ? "bg-blue-100 text-blue-700 font-semibold"
                        : "text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                    }`}
                  >
                    {cls.kelas} {cls.jurusan}
                  </a>
                ))
              ) : (
                <div className="px-4 py-2 text-xs text-gray-400 italic">
                  {isWalas ? "Anda belum ditugaskan sebagai wali kelas." : "Tidak ada kelas untuk hari ini."}
                </div>
              )}
            </div>
          )}
          
        </div>
      )}


    </nav>
  );
}