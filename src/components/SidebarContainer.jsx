import { useState, useEffect, useMemo } from "react";
import { auth, jadwal } from "../lib/backendApi";

import { UserStarIcon, UserCog, ClipboardList, School, Upload, ShieldCheck, BookOpen, GraduationCap, ScanLine, CalendarCheck } from "lucide-react";

// mampping hari 
const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

const getTodayHari = () => HARI_MAP[new Date().getDay()];

// helper untuk resolve roles dari berbagai kemungkinan struktur data user
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

  // Normalisasi alias
  const normalized = merged.map((r) => (r === "WALI KELAS" ? "WALAS" : r));

  return Array.from(new Set(normalized));
};

// helper untuk normalisasi data kelas dari berbagai bentuk response API
const normalizeKelas = (data) =>
  data
    .map((item) => {
      // Response dari jadwal.list() — item.kelas adalah object
      if (item.kelas && typeof item.kelas === "object") {
        return {
          id: item.kelas.id,
          kelas: item.kelas.kelas,
          jurusan: item.kelas.jurusan || item.jurusan || "",
        };
      }

      // Response dari kelas.list() — item langsung berisi data kelas
      return {
        id: item.id,
        kelas: item.kelas || item.nama_kelas || "",
        jurusan: item.jurusan || "",
      };
    })
    .filter((item) => item.id != null)
    // Dedup berdasarkan id
    .filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));



export default function SidebarContainer() {
  const [classes, setClasses] = useState([]);
  const [isAttendanceMenuOpen, setIsAttendanceMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [currentClassId, setCurrentClassId] = useState("");
  const [loading, setLoading] = useState(true);

  const [roles, setRoles] = useState(null);
  const [userData, setUserData] = useState(null);

  const { isAdmin, isSuperAdmin, isWalas, isGuru, isKesiswaan, canAccessAttendance, isKurikulum, canAccessPokja } = useMemo(() => {
    if (!roles) return { isAdmin: false, isSuperAdmin: false, isWalas: false, isGuru: false, isKesiswaan: false, canAccessAttendance: false, isKurikulum: false, canAccessPokja: false };
    const superAdminRoles = ["SUPERADMIN", "SUPER ADMIN", "SUPER_ADMIN"];
    const guru = roles.includes("GURU");
    const walas = roles.includes("WALAS");
    const kesiswaan = roles.includes("KESISWAAN");
    const isPokja = userData?.is_pokja === true;
    return {
      isAdmin: roles.includes("ADMIN"),
      isSuperAdmin: roles.some((r) => superAdminRoles.includes(r)),
      isWalas: walas,
      isGuru: guru,
      isKesiswaan: kesiswaan,
      isKurikulum: roles.includes("KURIKULUM"),
      canAccessPokja: kesiswaan && isPokja,
      // hanya role guru & walas yang bisa akses, tapi role GURU juga bisa akses walaupun gak ada role WALAS (untuk guru mapel yang bukan walas)
      canAccessAttendance: walas || guru,
    };
  }, [roles, userData]);


  const applyUserData = (user) => {
    setUserData(user);

    const resolved = resolveRoles(user);
    setRoles(resolved.length > 0 ? resolved : ["UNKNOWN"]);
  };

  // load user & roles dari localStorage saat mount, lalu refresh dari /auth/me

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(userStr);
      applyUserData(parsed);
    } catch (e) {
      console.error("Error parsing user dari localStorage:", e);
      setRoles([]);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    (async () => {
      try {
        const res = await auth.me();
        const freshUser = res?.data?.user || res?.data;

        if (res?.success && freshUser) {
          localStorage.setItem("user", JSON.stringify(freshUser));
          applyUserData(freshUser);
        }
      } catch (e) {
        console.error("Gagal refresh user untuk sidebar:", e);
      }
    })();
  }, []);


  // fetch kelas untuk dropdown kehadiran — hanya untuk walas & guru, berdasarkan role & userData
  useEffect(() => {
    if (!roles || !userData) return;

    const fetchClasses = async () => {
      setLoading(true);

      try {
        if (canAccessAttendance) {
          const guruId = userData.guru?.id;
          const today = getTodayHari();

          const res = await jadwal.list(`hari=${today}&guru_id=${guruId}`);
          if (res?.success && Array.isArray(res.data)) {
            setClasses(normalizeKelas(res.data));
          }
        } else {
          setClasses([]);
        }
      } catch (e) {
        console.error("Gagal fetch kelas untuk sidebar:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [roles, userData, canAccessAttendance]);

  useEffect(() => {
    const updateState = () => {
      if (typeof window === "undefined") return;

      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      setCurrentPath(path);

      const kelasId = params.get("kelasId");
      setCurrentClassId(kelasId || "");

      if (path.includes("/dashboard/kehadiran") || kelasId) {
        setIsAttendanceMenuOpen(true);
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

  // Helpers UI

  const toggleAttendanceMenu = (e) => {
    e?.preventDefault();
    setIsAttendanceMenuOpen((prev) => !prev);
  };

  const getLinkClass = (path, exact = true) => {
    const isActive = exact ? currentPath === path : currentPath.startsWith(path);
    return `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive
      ? "bg-blue-600 text-white font-medium shadow-sm"
      : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
      }`;
  };

  // Render: Loading awal (roles belum diload)

  if (roles === null) {
    return (
      <nav className="space-y-1 text-sm">
        <div className="px-4 py-3 text-gray-400 italic">Memuat...</div>
      </nav>
    );
  }

  // Render: Sidebar utama

  return (
    <nav className="space-y-1 text-sm">
    <div className="flex items-center gap-3 mb-10">
      <div className="w-12 h-12 flex items-center justify-center shadow-lg">
        <img src="/logotbvector-copy.png" alt=""/>
      </div>

      <div className="flex flex-col leading-tight">
        <span className="text-lg font-bold text-gray-800 tracking-tight">
          STARBHAK
        </span>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          Attendance Management
        </span>
      </div>
    </div>

      {/* Dashboard utama — semua role */}
      <a href="/dashboard" data-astro-prefetch className={getLinkClass("/dashboard")}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        Dashboard
      </a>
      
            {isSuperAdmin && (
        <a
          href="/dashboard/kelas"
          data-astro-prefetch
          className={getLinkClass("/dashboard/kelas")}
        >
          <School width={20} height={20} />
          Manajemen Kelas
        </a>
      )}

      {/* Manajemen Mapel | SUPERADMIN */}
      {isSuperAdmin && (
        <a  
        href="/dashboard/mapel"
        data-astro-prefetch
        className={getLinkClass("/dashboard/mapel")}
        >
          <BookOpen width={20} height={20} />
          Manajemen Mapel
        </a>
      )}

      {/* SUPERADMIN & KESISWAAN */}
      {(isSuperAdmin || isKesiswaan) && (
        <a
          href="/dashboard/tambahJadwal"
          data-astro-prefetch
          className={getLinkClass("/dashboard/tambahJadwal", false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Jadwal
        </a>
      )}


      {/* ---- WALAS ---- */}

      {isWalas && (
        <a href="/dashboard/walas" data-astro-prefetch className={getLinkClass("/dashboard/walas")}>
          <UserStarIcon width={20} height={20} />
          Dashboard Walas
        </a>
      )}

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

      {/* {isWalas && (
        <a
          href="/dashboard/walas-kelas"
          data-astro-prefetch
          className={getLinkClass("/dashboard/walas-kelas")}
        >
          <School width={20} height={20} />
          Informasi Kelas
        </a>
      )} */}


      {/* daftar siswa  */}
      {isKesiswaan || isWalas ? (
        <a href="/dashboard/siswa" data-astro-prefetch className={getLinkClass("/dashboard/siswa")}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          Daftar Siswa
        </a>
      ) : null}

      {canAccessPokja && (
        <a
          href="/dashboard/exportDataKehadiran"
          data-astro-prefetch
          className={getLinkClass("/dashboard/exportDataKehadiran", false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Export Data Kehadiran
        </a>
      )}

      {/* ADMIN & SUPERADMIN */}

      {(isAdmin || isSuperAdmin) && (
        <a
          href="/dashboard/importOrangTua"
          data-astro-prefetch
          className={getLinkClass("/dashboard/importOrangTua")}
        >
          <Upload width={20} height={20} />
          Tambah Orang Tua &amp; List Orang Tua
        </a>
      )}

      {(isAdmin || isSuperAdmin) && (
        <a
          href="/dashboard/importSiswa"
          data-astro-prefetch
          className={getLinkClass("/dashboard/importSiswa")}
        >
          <School width={20} height={20} />
          Tambah Siswa &amp; List Siswa
        </a>
      )}
      
      {(isAdmin || isSuperAdmin) && (
        <a
          href="/dashboard/rfid"
          data-astro-prefetch
          className={getLinkClass("/dashboard/rfid")}
        >
          <ScanLine width={20} height={20} />
          Manajemen RFID
        </a>
      )}

      {(isAdmin) && (
        <a
          href="/dashboard/finalAbsensi"
          data-astro-prefetch
          className={getLinkClass("/dashboard/finalAbsensi")}
        >
          <CalendarCheck width={20} height={20} />
          Finalisasi Absensi
        </a>
      )}

      {(isSuperAdmin) && (
        <a
          href="/dashboard/users"
          data-astro-prefetch
          className={getLinkClass("/dashboard/users")}
        >
          <UserCog width={20} height={20} />
          Kelola Users
        </a>
      )}
      
      {isSuperAdmin && (
        <a
          href="/dashboard/assignWalas"
          data-astro-prefetch
          className={getLinkClass("/dashboard/assignWalas")}
        >
          <GraduationCap width={20} height={20} />
          Assign Walas
        </a>
      )}

      
      {/* Kesiswaan Export*/}
      {(isKesiswaan) && (
        <a
          href="/dashboard/exportDataKehadiran"
          data-astro-prefetch
          className={getLinkClass("/dashboard/exportDataKehadiran", false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Export kehadiran
        </a>
      )}


      {/* {isSuperAdmin && (
        <a
          href="/dashboard/roles"
          data-astro-prefetch
          className={getLinkClass("/dashboard/roles")}
        >
          <ShieldCheck width={20} height={20} />
          Manajemen Role
        </a>
      )} */}

      {canAccessAttendance && 
        <div className="flex items-center my-4">
          <div className="grow border-t border-gray-500"></div>
          <p className="mx-2 text-sm text-gray-500 whitespace-nowrap">
            Manajemen Guru Mapel
          </p>
          <div className="grow border-t border-gray-500"></div>
        </div>
      }

      {/* ---- WALAS & GURU: Dropdown kehadiran per kelas ---- */}

      {canAccessAttendance && (
        <div className="space-y-1">
          <button
            onClick={toggleAttendanceMenu}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${currentPath.startsWith("/dashboard/kehadiran") && !currentClassId
              ? "bg-blue-50 text-blue-600 font-medium"
              : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              }`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span>Daftar Kehadiran</span>
            </div>

            {/* Chevron */}
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${isAttendanceMenuOpen ? "rotate-180" : ""
                }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
                    href={`/dashboard/kehadiranV2?kelasId=${cls.id}`}
                    data-astro-prefetch
                    className={`block px-4 py-2 rounded-lg text-xs transition-all duration-200 ${currentClassId === String(cls.id)
                      ? "bg-blue-100 text-blue-700 font-semibold"
                      : "text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                      }`}
                  >
                    {cls.kelas}
                    {cls.jurusan ? ` - ${cls.jurusan}` : ""}
                  </a>
                ))
              ) : (
                <div className="px-4 py-2 text-xs text-gray-400 italic">
                  Tidak ada kelas untuk hari ini.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
