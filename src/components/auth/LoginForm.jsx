import { useState } from "react";
import { auth } from "../../lib/backendApi";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await auth.login({ email, password });

            if (res.success && res.data?.accessToken) {
                // Simpan accessToken
                localStorage.setItem("accessToken", res.data.accessToken);

                // Simpan refreshToken kalau ada — dibutuhkan backendApi saat 401
                if (res.data.refreshToken) {
                    localStorage.setItem("refreshToken", res.data.refreshToken);
                }

                // Simpan data user
                if (res.data.user) {
                    localStorage.setItem("user", JSON.stringify(res.data.user));
                }

                window.location.href = "/dashboard";
            } else {
                setError(res.message || "Login gagal, periksa email dan password");
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
                    type="email"
                    placeholder="Email or Username"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-white border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-sm"
                />
            </div>

            <div>
                <input
                    type="password"
                    placeholder="Password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-5 py-3.5 bg-white border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm text-sm"
                />
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