import { useState, useEffect } from "react";
import { auth } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";
import {
  User,
  Mail,
  Shield,
  ShieldCheck,
  KeyRound,
  IdCard,
  LogOut,
  Copy,
  Check,
  Calendar,
  GraduationCap,
  BookOpen,
  Phone,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const resolveRoles = (userData) => {
    const fromRoles = Array.isArray(userData?.roles)
      ? userData.roles.map((r) => r?.name || r).filter(Boolean)
      : [];
    const fromRoleNames = Array.isArray(userData?.role_names) ? userData.role_names : [];
    const fromRoleObj = userData?.role?.name ? [userData.role.name] : [];
    const fromRoleStr = typeof userData?.role === "string" ? [userData.role] : [];
    const fromUserRole = Array.isArray(userData?.userRole)
      ? userData.userRole.map((ur) => ur?.role?.name || ur?.role).filter(Boolean)
      : [];

    const merged = [...fromRoles, ...fromRoleNames, ...fromRoleObj, ...fromRoleStr, ...fromUserRole]
      .filter(Boolean)
      .map((r) => String(r).toUpperCase());

    const normalized = merged.map((r) => (r === "WALI KELAS" ? "WALAS" : r));
    return Array.from(new Set(normalized));
  };

  const getDisplayName = (userData) => {
    return (
      userData?.guru?.nama ||
      userData?.nama ||
      userData?.username ||
      userData?.email ||
      "Pengguna"
    );
  };

  useEffect(() => {
    async function fetchProfileData() {
      try {
        const token = localStorage.getItem("accessToken");

        if (!token) {
          window.location.href = "/login";
          return;
        }

        const res = await auth.me();

        if (res?.success && (res?.data?.user || res?.data)) {
          const freshUser = res.data.user || res.data;
          setUser(freshUser);
          try {
            localStorage.setItem("user", JSON.stringify(freshUser));
          } catch (_) {}
        } else {
          // Fallback to cached user if available
          const cached = localStorage.getItem("user");
          if (cached) {
            setUser(JSON.parse(cached));
          } else {
            setError("Gagal memuat data profil");
          }
        }
      } catch (err) {
        console.error("Fetch Profile error:", err);
        const cached = localStorage.getItem("user");
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (_) {
            setError("Terjadi kesalahan saat mengambil data profil");
          }
        } else {
          setError("Terjadi kesalahan saat mengambil data profil");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProfileData();
  }, []);

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await auth.logout();
    } catch (_) {}

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("ysboToken");
    window.location.href = "/login";
  }

  const displayName = getDisplayName(user);
  const roleLabels = resolveRoles(user);
  const primaryRole = roleLabels?.[0] || "PENGGUNA";
  const initials = (displayName || "U").trim().charAt(0).toUpperCase();

  const getRoleBadgeStyle = (role) => {
    const upper = String(role).toUpperCase();
    if (upper.includes("SUPERADMIN") || upper.includes("SUPER_ADMIN")) {
      return "bg-gradient-to-r from-purple-500/10 to-indigo-500/10 text-purple-700 border-purple-200/80";
    }
    if (upper.includes("ADMIN")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    if (upper.includes("WALAS")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (upper.includes("GURU")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (upper.includes("KESISWAAN")) {
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const isGuruOrWalas = roleLabels.some((r) =>
    ["GURU", "WALAS", "WALI KELAS"].includes(r)
  ) || !!user?.guru;

  const nip = user?.guru?.NIP || user?.guru?.nip;
  const noHp = user?.guru?.no_hp || user?.guru?.telepon || user?.telepon;
  const kodeGuru = user?.guru?.kode_guru || user?.guru?.kode;
  const walasKelas = user?.guru?.walas?.kelas?.kelas || user?.guru?.kelas?.kelas || (roleLabels.includes("WALAS") ? "Wali Kelas Aktif" : null);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-hidden">
        <PageHeader title="Profil Pengguna" subtitle="Memuat informasi akun Anda..." />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="flex flex-col items-center gap-4 bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
              <Sparkles className="w-4 h-4 text-blue-600 absolute inset-0 m-auto animate-pulse" />
            </div>
            <p className="text-gray-600 text-sm font-medium">Memuat profil pengguna...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50/70 overflow-hidden">
        <PageHeader title="Profil Pengguna" subtitle="Informasi akun pengguna" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md mx-auto bg-white p-8 rounded-2xl border border-red-100 shadow-sm">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Gagal Memuat Profil</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-sm transition-all"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/60">
      {/* Universal Page Header */}
      <PageHeader
        title="Profil Pengguna"
        subtitle="Kelola informasi akun, kredensial, dan preferensi identitas Anda"
      />

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">

          {/* ─── Hero Profile Card ────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
            {/* Gradient Banner Backdrop */}
            <div className="h-32 sm:h-44 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 relative overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-sky-400/20 rounded-full blur-xl"></div>
            </div>

            {/* Profile Info Row */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-0 relative">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-16 sm:-mt-20">
                
                {/* Avatar & Title */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
                  <div className="relative group">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700 text-white font-bold text-3xl sm:text-4xl flex items-center justify-center ring-4 ring-white shadow-xl shadow-indigo-100">
                      {initials}
                    </div>
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full ring-2 ring-white"
                      title="Akun Terhubung & Aktif"
                    ></div>
                  </div>

                  <div className="space-y-2 pb-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                        {displayName}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                        <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {roleLabels.map((r, idx) => (
                        <span
                          key={idx}
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getRoleBadgeStyle(
                            r
                          )}`}
                        >
                          <Shield className="w-3 h-3 mr-1 opacity-70" />
                          {r}
                        </span>
                      ))}

                      {user?.email && (
                        <span className="inline-flex items-center text-xs text-gray-500 gap-1 ml-1">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {user.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center sm:justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => setShowLogoutModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 transition-all duration-200 shadow-sm group"
                  >
                    <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    <span>Keluar Akun</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Grid Content: Main Details & Sidebar ──────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            
            {/* Left Column (2 Cols): Credentials & Academic Profile */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              
              {/* Card 1: Informasi Akun & Kredensial */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
                <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Informasi Kredensial</h3>
                      <p className="text-xs text-gray-500">Rincian identitas akun sistem Anda</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
                  {/* Nama Lengkap */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      Nama Lengkap
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {displayName}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Nama tampilan pengguna</div>
                  </div>

                  {/* Email */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      Alamat Email
                    </div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {user?.email || "-"}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Email login utama</div>
                  </div>

                  {/* User ID */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <IdCard className="w-3.5 h-3.5 text-blue-600" />
                        User ID
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(user?.id, "id")}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors"
                        title="Salin ID"
                      >
                        {copiedField === "id" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[11px] text-emerald-600 font-bold">Disalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Salin</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-sm font-mono font-bold text-gray-800">
                      {user?.id ? `#${user.id}` : "-"}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">ID unik di database</div>
                  </div>

                  {/* Peran Sistem */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Hak Akses / Peran
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {roleLabels.map((r, i) => (
                        <span
                          key={i}
                          className={`text-xs font-bold px-2 py-0.5 rounded border ${getRoleBadgeStyle(
                            r
                          )}`}
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Otoritas menu sistem</div>
                  </div>
                </div>
              </div>

              {/* Card 2: Informasi Guru / Tenaga Pendidik (Jika ada) */}
              {isGuruOrWalas && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
                  <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">
                          Data Tenaga Pendidik
                        </h3>
                        <p className="text-xs text-gray-500">
                          Informasi penugasan dan identitas guru
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                      Guru Terdaftar
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6">
                    {/* NIP */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <IdCard className="w-3.5 h-3.5 text-indigo-600" />
                          NIP / Nomor Induk
                        </div>
                        {nip && (
                          <button
                            type="button"
                            onClick={() => handleCopy(nip, "nip")}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 transition-colors"
                            title="Salin NIP"
                          >
                            {copiedField === "nip" ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[11px] text-emerald-600 font-bold">Disalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Salin</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-sm font-mono font-bold text-gray-800">
                        {nip || "-"}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Nomor Induk Pegawai</div>
                    </div>

                    {/* Status Wali Kelas */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                        Status Wali Kelas
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {walasKelas ? (
                          <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            {walasKelas}
                          </span>
                        ) : (
                          <span className="text-gray-500 font-normal">Bukan Wali Kelas</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Penugasan kelas asuhan</div>
                    </div>

                    {/* Kontak Telepon */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        <Phone className="w-3.5 h-3.5 text-indigo-600" />
                        No. Telepon / WA
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {noHp || "-"}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Nomor kontak resmi</div>
                    </div>

                    {/* Kode Guru */}
                    <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Kode Pengajar
                      </div>
                      <div className="text-sm font-mono font-bold text-gray-800">
                        {kodeGuru || "-"}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Inisial / singkatan guru</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Pintasan Cepat (Quick Shortcuts) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-7">
                <h3 className="text-base font-bold text-gray-900 mb-1">Pintasan Cepat</h3>
                <p className="text-xs text-gray-500 mb-4">Akses modul utama sesuai wewenang akun Anda</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleLabels.includes("WALAS") && (
                    <a
                      href="/attendance/walas"
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-amber-800 transition-colors">
                            Rekap Kelas Wali
                          </div>
                          <div className="text-[11px] text-gray-500">Lihat kehadiran harian kelas</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  )}

                  {roleLabels.includes("GURU") && (
                    <a
                      href="/dashboard/guru"
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 group-hover:text-emerald-800 transition-colors">
                            Jadwal Mengajar
                          </div>
                          <div className="text-[11px] text-gray-500">Agenda pembelajaran hari ini</div>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  )}

                  {(roleLabels.includes("ADMIN") || roleLabels.includes("SUPERADMIN") || roleLabels.includes("SUPER_ADMIN")) && (
                    <>
                      <a
                        href="/dashboard/users"
                        className="group flex items-center justify-between p-3.5 rounded-xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50 hover:border-blue-200 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 group-hover:text-blue-800 transition-colors">
                              Manajemen Pengguna
                            </div>
                            <div className="text-[11px] text-gray-500">Kelola akun & hak akses</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                      </a>

                      <a
                        href="/dashboard/jadwal"
                        className="group flex items-center justify-between p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 group-hover:text-indigo-800 transition-colors">
                              Kelola Jadwal
                            </div>
                            <div className="text-[11px] text-gray-500">Atur jadwal pelajaran sekolah</div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    </>
                  )}

                  <a
                    href="/dashboard"
                    className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 transition-colors">
                          Dashboard Utama
                        </div>
                        <div className="text-[11px] text-gray-500">Kembali ke beranda aplikasi</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column (1 Col): Security & Session Overview */}
            <div className="space-y-6 sm:space-y-8">
              
              {/* Card 4: Status Sesi Akun */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Status Sesi</h4>
                    <p className="text-[11px] text-gray-500">Keamanan login saat ini</p>
                  </div>
                </div>

                <div className="space-y-3.5 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Status Autentikasi</span>
                    <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Aktif
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Tipe Token</span>
                    <span className="font-mono text-gray-800 font-semibold bg-gray-100 px-2 py-0.5 rounded">
                      Bearer JWT
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Peran Utama</span>
                    <span className="font-bold text-blue-700">
                      {primaryRole}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Penyimpanan Sesi</span>
                    <span className="text-gray-600 font-medium">Lokal Browser</span>
                  </div>
                </div>
              </div>

              {/* Card 5: Tips Keamanan Modern */}
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-sky-50/50 to-indigo-50/40 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-400/10 rounded-full blur-xl pointer-events-none"></div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-blue-950">Tips Keamanan Akun</h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Lindungi akun Anda dengan menerapkan langkah pencegahan berikut:
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2.5 text-xs text-blue-900/80">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Jangan pernah membagikan kata sandi kepada siapapun.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Gunakan kata sandi unik yang sulit ditebak pihak lain.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>Selalu klik tombol keluar saat selesai di komputer umum/sekolah.</span>
                  </li>
                </ul>
              </div>

              {/* Card 6: Pusat Bantuan */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">Perlu Perubahan Data?</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Jika terdapat ketidaksesuaian data guru, NIP, atau mata pelajaran yang diampu, hubungi Administrator Sistem atau Bagian Kurikulum sekolah.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* ─── Logout Confirmation Modal ─────────────────────────────────── */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Konfirmasi Keluar</h3>
                <p className="text-xs text-gray-500 mt-0.5">Sesi Anda pada perangkat ini akan diakhiri</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              Apakah Anda yakin ingin keluar dari akun <span className="font-semibold text-gray-900">{displayName}</span>? Anda perlu memasukkan kredensial lagi untuk masuk kembali.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 shadow-sm shadow-red-200 transition-all cursor-pointer"
              >
                {isLoggingOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Mengeluarkan...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Ya, Keluar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}