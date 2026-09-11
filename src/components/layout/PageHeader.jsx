import React, { useEffect, useState } from "react";
import { auth } from "../../lib/backendApi";
import { Menu } from "lucide-react";

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function resolveDisplayName(user) {
  return user?.guru?.nama || user?.nama || user?.email || "User";
}

export default function PageHeader({ title, subtitle, right }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const cached = safeJsonParse(localStorage.getItem("user") || "null");
    if (cached) setUser(cached);
    if (!token) return;

    (async () => {
      try {
        const res = await auth.me();
        if (res?.success && res?.data) {
          setUser(res.data);
          try {
            localStorage.setItem("user", JSON.stringify(res.data));
          } catch {

          }
        }
      } catch {
      }
    })();
  }, []);

  const displayName = resolveDisplayName(user);
  const initials = (displayName || "U").trim().charAt(0).toUpperCase();

  const handleToggleSidebar = (e) => {
    e?.stopPropagation();
    if (typeof window !== "undefined") {
      if (typeof window.toggleAppSidebar === "function") {
        window.toggleAppSidebar();
      } else {
        window.dispatchEvent(new CustomEvent("toggle-sidebar"));
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 md:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          data-sidebar-toggle="true"
          onClick={handleToggleSidebar}
          className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 rounded-xl transition-colors flex-shrink-0 cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle ? <div className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</div> : null}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {right ? right : null}

        <button className="hover:bg-blue-600 rounded-full p-0.5 transition-colors" title="Profile">
          <a href="/dashboard/profile">
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs sm:text-sm">
              {initials}
            </div>
          </a>
        </button>
      </div>
    </header>
  );
}

