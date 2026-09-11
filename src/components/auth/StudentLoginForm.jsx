import { useState } from "react";
import { auth } from "../../lib/backendApi";
import { Eye, EyeOff } from "lucide-react";

export default function StudentLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Endpoint login siswa: /api/v1/auth/moodle-login
      let res = await auth.moodleLogin({ username, password });

      // Fallback ke auth.login jika moodle-login tidak merespons token
      if (!res?.success && (res?.status === 404 || res?.statusCode === 404 || !res?.data?.accessToken)) {
        const fallbackRes = await auth.login({ username, password });
        if (fallbackRes?.success && fallbackRes?.data?.accessToken) {
          res = fallbackRes;
        }
      }

      if (res?.success && res.data?.accessToken) {
        localStorage.setItem("accessToken", res.data.accessToken);

        if (res.data.refreshToken) {
          localStorage.setItem("refreshToken", res.data.refreshToken);
        }

        if (res.data.ysboToken) {
          localStorage.setItem("ysboToken", res.data.ysboToken);
        }

        const userData = res.data.user || res.data;
        if (userData) {
          // Pastikan role siswa tersetting
          if (!userData.roles && !userData.role && !userData.role_names) {
            userData.role = "SISWA";
            userData.roles = [{ name: "SISWA" }];
          }
          localStorage.setItem("user", JSON.stringify(userData));
        }

        window.location.href = "/dashboard";
      } else {
        setError(res?.message || "Login gagal, silakan periksa NISN / Username dan password Anda.");
      }
    } catch (err) {
      console.error("Login siswa error:", err);
      setError("Terjadi kesalahan saat login siswa.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-xl text-sm"
          role="alert"
        >
          <span className="block">{error}</span>
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="NISN / Username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-xs text-sm transition-all"
        />
      </div>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full pl-5 pr-12 py-3.5 bg-gray-50 border border-gray-200/80 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-xs text-sm transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors cursor-pointer"
          aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
        >
          {showPassword ? (
            <EyeOff className="w-5 h-5" />
          ) : (
            <Eye className="w-5 h-5" />
          )}
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`w-full py-3.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl text-base mt-10 bg-gradient-to-r from-[#2D5F7F] to-[#1F4A61] text-white hover:from-[#234A5E] hover:to-[#183A4A] cursor-pointer ${loading ? "opacity-70 cursor-not-allowed" : ""
          }`}
      >
        {loading ? "Memverifikasi..." : "Login Siswa"}
      </button>
    </form>
  );
}
