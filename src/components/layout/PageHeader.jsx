import React, { useEffect, useState } from "react";
import { auth } from "../../lib/backendApi";

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

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-4">
        {right ? right : null}

        <button className="hover:bg-blue-600 rounded-full p-0.5" title="Profile">
          <a href="/dashboard/profile">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              {initials}
            </div>
          </a>
        </button>
      </div>
    </header>
  );
}

