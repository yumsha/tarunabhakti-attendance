import { useState, useEffect } from "react";
import { auth } from "../../lib/backendApi";
import {
    Mail,
    User,
    LogOut,
    UserCog,
    IdCard,
    Shield,
    Calendar,
} from "lucide-react";

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    useEffect(() => {
        async function fetchProfileData() {
            try {
                const token = localStorage.getItem("accessToken");
                
                if (!token) {
                    window.location.href = "/login";
                    return;
                }

                const res = await auth.me();
                
                if(res.success && res.data){
                    setUser(res.data);
                } else {
                    setError("Gagal memuat data profile");
                }
            } catch(err) {
                console.log("Fetch Profile error:", err);
                setError("Terjadi kesalahan saat mengambil data profile")
            } finally {
                setLoading(false)
            }
        };
        
        fetchProfileData();
    }, [])
    
    async function handleLogout() {
        try {
            await auth.logout();
        } catch (_) {}
        
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login"
    }

    if(loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium">Memuat profile...</p>
                </div>
            </div>
        )
    }

    if(error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-6">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops! Terjadi Kesalahan</h2>
                    <p className="text-gray-500 mb-6">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                        Coba Lagi
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
                <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
                <div className="flex items-center gap-4">

                <button className=' hover:bg-blue-600 rounded-full p-0.5'>
                    <a href="/dashboard/profile">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                        {user?.nama
                            ? user.nama.charAt(0).toUpperCase()
                            : user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    </a>
                </button>
                </div>
            </header>

            {/* main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* profile Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                    <div className="p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                            <div className="flex items-center gap-5">
                                <div className="relative">
                                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-sm">
                                        {user?.nama
                                            ? user.nama.charAt(0).toUpperCase()
                                            : user?.email?.charAt(0).toUpperCase() || "U"}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {user?.guru?.nama || user?.nama || "User"}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <p className="text-gray-500">{user?.email}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button className="px-5 py-2.5 rounded-xl border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                                    <User size={18} />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2 shadow-sm shadow-red-200"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* grid conternt */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* main info */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Informasi Pribadi</h3>
                                <p className="text-sm text-gray-500 mt-1">Data diri dan informasi akun kamu</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <User size={18} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Nama Lengkap</p>
                                            <p className="font-medium text-gray-900 mt-1">
                                                {user?.guru?.nama || user?.nama || "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Mail size={18} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Email</p>
                                            <p className="font-medium text-gray-900 mt-1 break-all">
                                                {user?.email || "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <IdCard size={18} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">User ID</p>
                                            <p className="font-medium text-gray-900 mt-1 font-mono text-sm">
                                                {user?.id || "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <UserCog size={18} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Role</p>
                                            <div className="mt-1">
                                                <span className="inline-flex px-3 py-1 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                    {user?.role?.name || "User"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {user?.guru?.nip && (
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-purple-50 rounded-lg">
                                                <IdCard size={18} className="text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">NIP</p>
                                                <p className="font-medium text-gray-900 mt-1 font-mono">
                                                    {user.guru.nip}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">

                        {/* security info */}
                        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
                            <div className="flex gap-3">
                                <Shield size={20} className="text-blue-600 shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-1">Tips Keamanan</h4>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        Jaga kerahasiaan password dan jangan pernah membagikan kode verifikasi kepada siapapun, termasuk yang mengaku sebagai admin.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}