import { useState, useEffect } from "react";
import { auth } from "../../lib/backendApi";
import {
    Mail,
    User,
    Shield,
    LogOut,
    Info,
    UserCog
} from "lucide-react";

export default function ProfilePage() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    useEffect(() => {
        async function fetchProfileData() {
            try {
                const res = await auth.me();
                
                if(res.success && res.data){
                    setUser(res.data);
                }
            } catch(err) {
                console.log("Fetch Profile error:", err);
                setError("Terjadi kesalahan saat ambil data profile")
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
        
        localStorage.removeItem("accesToken");
        localStorage.removeItem("user");
        window.location.href = "/login"
    }

    if(loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        )
    }

    if(error) {
        return (
            <div className="flex justify-center items-center h-screen text-red-500">
                {error}
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-6">

                <div className="mb-10">
                    <h1 className="text-3xl font-semibold text-gray-900">
                        My Profile
                    </h1>
                    <p className="text-sm text-gray-500 mt-2">
                        Bukankah ini my profile??
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8">

                            <div className="flex flex-col items-center text-center">

                                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-semibold text-3xl mb-3">
                                    {user?.nama
                                        ? user.nama.charAt(0).toUpperCase()
                                        : user?.email?.charAt(0).toUpperCase() || "U"}
                                </div>

                                <h2 className="mt-5 text-xl font-semibold text-gray-900">
                                    {user?.guru?.nama || "User"}
                                </h2>

                                <p className="text-sm text-gray-500">
                                    {user?.email}
                                </p>

                            </div>

                            <button
                                onClick={handleLogout}
                                className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8">

                            <h3 className="text-lg font-semibold text-gray-900 mb-8">
                                Informasi Detail
                            </h3>

                            <div className="grid md:grid-cols-2 gap-6">

                                {/* nama */}
                                <div className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-300 transition">
                                    <User className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">
                                            Nama Lengkap
                                        </p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                            {user?.guru?.nama || user?.role?.name || "-"}
                                        </p>
                                    </div>
                                </div>

                                {/* email */}
                                <div className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-300 transition">
                                    <Mail className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">
                                            Email
                                        </p>
                                        <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                                            {user?.email}
                                        </p>
                                    </div>
                                </div>

                                {/* user ID */}
                                <div className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-300 transition">
                                    <Shield className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">
                                            User ID
                                        </p>
                                        <p className="text-xs font-mono text-gray-900 mt-1">
                                            {user?.id || "-"}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* role */}
                                
                                <div className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-300 transition">
                                    <UserCog className="text-gray-400 mt-1" size={18} />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase tracking-wider">
                                            Role
                                        </p>
                                        <p className="text-sm font-medium text-gray-900 mt-1 break-all">
                                            {user?.role?.name || "Member"}
                                        </p>
                                    </div>
                                </div>

                            </div>

                            {/* info */}
                            <div className="mt-10 flex gap-3 bg-gray-50 border border-gray-200 rounded-xl p-5">
                                <Info size={16} className="text-gray-500 mt-1" />
                                <p className="text-sm text-gray-600">
                                    Pastikan informasi akun kamu selalu aman dan jangan
                                    membagikan data login kepada siapapun.
                                </p>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
