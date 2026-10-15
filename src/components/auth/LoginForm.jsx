import { useState } from "react";
import { auth } from "../../lib/backendApi";
import { Eye, EyeOff } from "lucide-react";

export default function LoginForm() {
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
            const res = await auth.login({ username, password });

            if (res.success && res.data?.accessToken) {
                localStorage.setItem("accessToken", res.data.accessToken);

                if (res.data.refreshToken) {
                    localStorage.setItem("refreshToken", res.data.refreshToken);
                }

                if (res.data.ysboToken) {
                    localStorage.setItem("ysboToken", res.data.ysboToken);
                }

                if (res.data.user) {
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                }

                window.location.href = "/dashboard";
            } else {
                setError(res.message || "Login gagal, periksa username dan password");
            }
        } catch (err) {
            console.error("Login error:", err);
            setError("Terjadi kesalahan saat login");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}
            <div>
                <input
                    type="text"
                    placeholder="Username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-white border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-sm"
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
                    className="w-full pl-5 pr-12 py-3.5 bg-white border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-sm"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
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
                className={`w-full py-3.5 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl text-base mt-16 bg-gradient-to-r from-[#2D5F7F] to-[#1F4A61] text-white hover:from-[#234A5E] hover:to-[#183A4A] ${
                    loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
                {loading ? "Logging in..." : "Login"}
            </button>
        </form>
    );
}