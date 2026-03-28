import { useState, useEffect } from "react";

export default function UserPageHeader() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const initials = user?.guru?.nama
    ? user.guru.nama.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
      {/* left */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kelola User</h1>
        </div>
      </div>

      {/* right/ava */}
      <div>
          <a href="/dashboard/profile">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold hover:ring-2 hover:ring-blue-300 transition">
              {user?.guru?.nama?.[0] || user?.email?.[0] || "W"}
            </div>
          </a>
      </div>
    </header>
  );
}
