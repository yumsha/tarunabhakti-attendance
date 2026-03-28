import { useState, useEffect } from "react";
import { kelas, jadwal } from "../lib/backendApi";
import { UserCogIcon } from "lucide-react";

export default function SidebarContainer() {
  const [classes, setClasses] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [currentClass, setCurrentClass] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const roleMap = {
    1: "ADMIN",
    2: "GURU",
    3: "WALI KELAS",
  };

  const normalize = (data) =>
    data.map((item) => {
      if (item.kelas && typeof item.kelas === "object") {
        return {
          id: item.kelas.id,
          kelas: item.kelas.kelas,
        };
      }

      return {
        id: item.id,
        kelas: item.kelas || item.nama_kelas,
      };
    });

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;

        const parsedUser = JSON.parse(userStr);

        const roleName = roleMap[parsedUser.role_id];

        const userWithRole = {
          ...parsedUser,
          role: roleName,
        };

        setUser(userWithRole);

        // ADMIN → ambil semua kelas
        if (roleName === "ADMIN") {
          const res = await kelas.list();

          if (res.success && res.data) {
            setClasses(normalize(res.data));
          }
        }

        // GURU → ambil jadwal hari ini
        if (roleName === "GURU") {
          const guruId = parsedUser.guru?.id;

          const today = new Date()
            .toLocaleDateString("id-ID", { weekday: "long" })
            .toUpperCase();

          const res = await jadwal.list(`hari=${today}&guru_id=${guruId}`);

          if (res && res.success && Array.isArray(res.data)) {
            setClasses(normalize(res.data));
          }
        }

        // WALAS → ambil kelas yang di-wali-kelasi
        if (roleName === "WALI KELAS") {
          const guruId = parsedUser.guru?.id;

          // Try fetching all kelas and find the one assigned to this walas
          const res = await kelas.list();
          if (res.success && Array.isArray(res.data)) {
            const walasClasses = res.data.filter(
              (k) => k.wali_kelas_id === guruId || k.guru_id === guruId
            );
            if (walasClasses.length > 0) {
              setClasses(normalize(walasClasses));
            }
          }
        }
      } catch (e) {
        console.error("Failed to fetch classes for sidebar", e);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();

    const updateState = () => {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        setCurrentPath(path);
        setCurrentClass(params.get("kelasId") || "");

        if (path.includes("/dashboard/kehadiran") || params.get("kelasId")) {
          setIsMenuOpen(true);
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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const formatClassName = (cls) => cls.kelas;

  return (
    <nav className="space-y-2 text-sm scrollbar-hide">

      {/* Dashboard */}
      <a
        href="/dashboard"
        data-astro-prefetch
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentPath === "/dashboard"
            ? "bg-blue-50 text-blue-700 font-medium"
            : "text-gray-700 hover:bg-gray-100"
          }`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 3a1 1 0 000 2h1v9a2 2 0 002 2h6a2 2 0 002-2V5h1a1 1 0 100-2H3z" />
        </svg>
        Dashboard
      </a>

      {/* Siswa */}
      {(user?.role === "ADMIN" || user?.role === "WALI KELAS") && (
        <a
          href="/dashboard/siswa"
          data-astro-prefetch
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentPath === "/dashboard/siswa"
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-700 hover:bg-gray-100"
            }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17 20v-1a4 4 0 00-4-4H9a4 4 0 00-4 4v1" />
            <path d="M12 11a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
          Daftar Siswa
        </a>
      )}

      {/* kelola User */}
      {user?.role === "ADMIN" && (
        <a
          href="/dashboard/users"
          data-astro-prefetch
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${currentPath === "/dashboard/users"
              ? "bg-blue-50 text-blue-700 font-medium"
              : "text-gray-700 hover:bg-gray-100"
            }`}
        >
          <UserCogIcon width={20} height={20}/>
          Kelola User
        </a>
      )}

      {/* Kehadiran */}
      {(user?.role === "GURU" || user?.role === "WALI KELAS") && (
        <>
          <button
            onClick={toggleMenu}
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M7 11h10M7 15h10M3 7h18M8 3v4M16 3v4"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <span>Kehadiran</span>
            </div>

            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isMenuOpen ? "rotate-180" : ""
                }`}
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

          {/* Submenu kelas */}
          <div
            className={`mt-2 ml-3 border-l border-gray-200 pl-3 space-y-1 ${isMenuOpen ? "block" : "hidden"
              }`}
          >
            {loading && (
              <span className="text-xs text-gray-400 px-3 py-2 block">
                Loading classes...
              </span>
            )}

            {!loading && classes.length === 0 && (
              <span className="text-xs text-gray-400 px-3 py-2 block">
                Tidak ada kelas
              </span>
            )}

            {classes.map((c) => (
              <a
                key={c.id}
                href={`/dashboard/kehadiran?kelasId=${c.id}`}
                data-astro-prefetch
                className={`block px-3 py-2 rounded-md transition text-sm ${currentClass === String(c.id)
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
              >
                {formatClassName(c)}
              </a>
            ))}
          </div>
        </>
      )}
    </nav>
  );
}