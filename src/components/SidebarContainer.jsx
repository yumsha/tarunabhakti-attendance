import { useState, useEffect } from "react";
import { kelas } from "../lib/backendApi";

export default function SidebarContainer() {
  const [classes, setClasses] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [currentClass, setCurrentClass] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;

        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);

        if (parsedUser.role === "ADMIN") {
          const res = await kelas.list();
          if (res.success && res.data) {
            setClasses(res.data);
          }
        }

        if (parsedUser.role === "GURU") {
          const token = localStorage.getItem("token");
          const guruId = parsedUser.guru?.id;

          const today = new Date()
            .toLocaleDateString("id-ID", { weekday: "long" })
            .toUpperCase();

          const res = await fetch(
            `http://localhost:3000/api/v1/jadwal?hari=${today}&guru_id=${guruId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const result = await res.json();
          if (result.data) {
            setClasses(result.data);
          }
        }
      } catch (e) {
        console.error("Failed to fetch classes for sidebar", e);
      }
    };

    fetchClasses();
    setLoading(false);

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

  const formatClassName = (cls) => {
    return cls.kelas;
  };

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
          <path d="M8 7h4v6H8V7z" fill="#fff" opacity="0.2" />
        </svg>
        Dashboard
      </a>

      {/* Siswa - Only for ADMIN */}
      {user?.role === 'ADMIN' && (
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

      {/* Kehadiran */}
      <div>
        <button
          onClick={toggleMenu}
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-3 scrollbar-hide">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 11h10M7 15h10M3 7h18M8 3v4M16 3v4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round" />
            </svg>
            <span>Kehadiran</span>
          </div>

          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isMenuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Submenu kelas */}
        <div className={`mt-2 ml-3 border-l border-gray-200 pl-3 space-y-1 ${isMenuOpen ? "block" : "hidden"} scrollbar-hide`}>
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
              className={`block px-3 py-2 rounded-md transition text-sm ${
                currentClass === String(c.id)
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              {formatClassName(c)}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
