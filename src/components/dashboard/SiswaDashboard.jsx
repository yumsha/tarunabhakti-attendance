import { useState, useEffect, useMemo } from "react";
import { auth, absensiSiswa, jadwal, kelas as kelasApi, moodle } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader.jsx";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BookOpen,
  User,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck,
  Award,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";

const HARI_MAP = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const DAYS_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];

function getTodayWIB() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const parts = String(timeStr).split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export default function SiswaDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [scheduleList, setScheduleList] = useState([]);
  const [statsFromRekap, setStatsFromRekap] = useState(null);
  const [selectedDay, setSelectedDay] = useState(() => {
    const dayIndex = new Date().getDay();
    return (dayIndex >= 1 && dayIndex <= 5) ? DAYS_LIST[dayIndex - 1] : "Senin";
  });
  const [currentTime, setCurrentTime] = useState("");
  const [lmsUrl, setLmsUrl] = useState(null);
  const [lmsUrlLoading, setLmsUrlLoading] = useState(false);

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const raw = localStorage.getItem("user");
        if (raw) setUser(JSON.parse(raw));

        const token = localStorage.getItem("accessToken");
        if (!token) return;

         const res = await auth.me();
        if (res?.success && (res?.data?.user || res?.data)) {
          const freshUser = res.data.user || res.data;
          setUser(freshUser);
          try {
            localStorage.setItem("user", JSON.stringify(freshUser));
          } catch (_) { }
        }

        // Fetch LMS auto-login URL (only if this is a student account)
        if (res?.success && (freshUser?.siswa || res.data?.siswa)) {
          try {
            setLmsUrlLoading(true);
            const lmsRes = await moodle.getLmsUrl();
            if (lmsRes?.success && lmsRes?.data?.url) {
              setLmsUrl(lmsRes.data.url);
            }
          } catch (e) {
            console.debug("LMS URL fetch error:", e);
          } finally {
            setLmsUrlLoading(false);
          }
        }
      } catch (err) {
        console.error("Error loading student profile:", err);
      }
    };
    loadUser();
  }, []);

  // Extract student details
  const studentInfo = useMemo(() => {
    const s = user?.siswa;
    const kelasObj = s?.kelas;
    const rfidActive = Array.isArray(s?.rfid) ? s.rfid[0] : s?.rfid;
    return {
      id: s?.id || user?.id || "-",
      nama: s?.nama || user?.username || "Siswa",
      nisn: s?.nisn || "-",
      nipd: s?.nipd || "-",
      kelas: kelasObj?.kelas || "Kelas",
      jurusan: kelasObj?.jurusan || "",
      kelasId: kelasObj?.id || s?.kelas_id || "",
      walasNama: kelasObj?.walas?.nama || "-",
      rfidUid: rfidActive?.uid_rfid || rfidActive?.uid || "-",
    };
  }, [user]);

  // Format tap_in/tap_out hanya HH:MM saja
  const formatTimeShort = (val) => {
    if (!val) return "-";
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      });
    }
    if (typeof val === "string" && val.length <= 8) return val.slice(0, 5);
    return "-";
  };

  // Fetch data (today attendance, history, & schedule)
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const todayDate = getTodayWIB();
      const studentId = studentInfo.id;
      const kelasId = studentInfo.kelasId;

      if (!studentId || !kelasId) return;

      // 1. Fetch Today's Attendance (dengan siswa_id agar hanya data siswa yang bersangkutan)
      try {
        const harianRes = await absensiSiswa.laporanHarian(`tanggal=${todayDate}&siswa_id=${studentId}`);
        if (harianRes?.success && Array.isArray(harianRes.data)) {
          const found = harianRes.data.find((item) => item.siswa_id === studentId);
          setTodayAttendance(found || null);
        } else {
          setTodayAttendance(null);
        }
      } catch (e) {
        console.debug("Laporan harian error:", e);
        setTodayAttendance(null);
      }

      // 2. Fetch Attendance History via rekap pribadi (dari FinalAbsensi)
      try {
        const rekapRes = await absensiSiswa.rekapSaya("limit=30");
        if (rekapRes?.success && rekapRes.data?.riwayat) {
          setAttendanceHistory(rekapRes.data.riwayat);
          if (rekapRes.data?.statistik) {
            setStatsFromRekap(rekapRes.data.statistik);
          }
        } else {
          setAttendanceHistory([]);
          setStatsFromRekap(null);
        }
      } catch (e) {
        console.debug("Rekap siswa error:", e);
        setAttendanceHistory([]);
        setStatsFromRekap(null);
      }

      // 3. Fetch Jadwal Pelajaran
      try {
        const jadwalParams = kelasId ? `kelas_id=${kelasId}` : "";
        const jadRes = await jadwal.list(jadwalParams);
        if (jadRes?.success && Array.isArray(jadRes.data)) {
          setScheduleList(jadRes.data);
        }
      } catch (e) {
        console.debug("Jadwal list error:", e);
      }
    } catch (err) {
      console.error("Failed to load student dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentInfo.id, studentInfo.kelasId]);

  // Filter schedule for selected tab day
  const filteredSchedule = useMemo(() => {
    return scheduleList
      .filter((item) => {
        const h = String(item.hari || "").toUpperCase();
        return h === selectedDay.toUpperCase();
      })
      .sort((a, b) => {
        const aMin = parseTimeToMinutes(a.jam_mulai) ?? 0;
        const bMin = parseTimeToMinutes(b.jam_mulai) ?? 0;
        return aMin - bMin;
      });
  }, [scheduleList, selectedDay]);

  // Calculate current schedule status
  const nowMin = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, [currentTime]);

  const todayDayName = useMemo(() => {
    const d = new Date().getDay();
    return HARI_MAP[d];
  }, []);

  const getScheduleStatus = (item) => {
    if (String(item.hari || "").toUpperCase() !== todayDayName) {
      return "scheduled";
    }
    const mulai = parseTimeToMinutes(item.jam_mulai);
    const selesai = parseTimeToMinutes(item.jam_selesai);
    if (mulai === null || selesai === null) return "scheduled";
    if (nowMin >= mulai && nowMin < selesai) return "ongoing";
    if (nowMin >= selesai) return "finished";
    return "upcoming";
  };

  // Compute attendance stats — prefer FinalAbsensi data (rekap pribadi),
  // fall back to raw AbsensiSiswa history if rekap is unavailable.
  const stats = useMemo(() => {
    if (statsFromRekap) {
      const Hadir = statsFromRekap.Hadir || statsFromRekap.hadir || 0;
      const Izin = statsFromRekap.Izin || statsFromRekap.izin || 0;
      const Sakit = statsFromRekap.Sakit || statsFromRekap.sakit || 0;
      const Alpha = statsFromRekap.Alpha || statsFromRekap.alpha || 0;
      const totalHari = Hadir + Izin + Sakit + Alpha;
      const persentase = totalHari > 0 ? Math.round((Hadir / totalHari) * 100) : 100;
      return { tepatWaktu: Hadir, terlambat: 0, izin: Izin, sakit: Sakit, alpha: Alpha, totalHari, persentase };
    }

    let tepatWaktu = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpha = 0;

    attendanceHistory.forEach((item) => {
      const st = String(item.status_tapin || item.status || "").toUpperCase();
      if (st === "TEPAT_WAKTU" || st === "HADIR") tepatWaktu++;
      else if (st === "TERLAMBAT") terlambat++;
      else if (st === "IZIN") izin++;
      else if (st === "SAKIT") sakit++;
      else if (st === "ALPHA") alpha++;
    });

    const totalHari = tepatWaktu + terlambat + izin + sakit + alpha;
    const persentase = totalHari > 0 ? Math.round(((tepatWaktu + terlambat) / totalHari) * 100) : 100;

    return { tepatWaktu, terlambat, izin, sakit, alpha, totalHari, persentase };
  }, [attendanceHistory, statsFromRekap]);

  const todayStatusInfo = useMemo(() => {
    if (!todayAttendance) {
      return {
        label: "Belum Tap-In",
        color: "bg-amber-50 text-amber-700 border-amber-200",
        badge: "bg-amber-500",
        message: "Silakan lakukan tapping kartu RFID pada alat scanner sekolah.",
      };
    }

    const st = String(todayAttendance.status_tapin || todayAttendance.status || "").toUpperCase();
    if (st === "TEPAT_WAKTU" || st === "HADIR") {
      return {
        label: "Hadir Tepat Waktu",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200",
        badge: "bg-emerald-500",
        message: "Kehadiran Anda telah tercatat dengan baik hari ini.",
      };
    }
    if (st === "TERLAMBAT") {
      return {
        label: "Terlambat",
        color: "bg-rose-50 text-rose-700 border-rose-200",
        badge: "bg-rose-500",
        message: "Tercatat hadir setelah jam toleransi masuk (06:45 WIB).",
      };
    }
    if (st === "IZIN" || st === "SAKIT") {
      return {
        label: st === "IZIN" ? "Izin" : "Sakit",
        color: "bg-blue-50 text-blue-700 border-blue-200",
        badge: "bg-blue-500",
        message: "Keterangan telah diverifikasi oleh wali kelas.",
      };
    }
    return {
      label: "Hadir",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badge: "bg-emerald-500",
      message: "Kehadiran tercatat.",
    };
  }, [todayAttendance]);

  const todayFormatted = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70 font-[Poppins]">
      {/* Top Page Header */}
      <PageHeader
        title="Dashboard Siswa"
        subtitle="Portal informasi kehadiran dan jadwal pelajaran siswa"
        right={
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200/90 rounded-xl text-xs font-semibold text-gray-700 shadow-xs transition cursor-pointer disabled:opacity-60"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-600" : "text-gray-500"}`} />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ─── Hero Welcome Card ────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 p-6 sm:p-8 text-white shadow-lg shadow-indigo-900/10">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute right-32 -top-12 w-48 h-48 bg-sky-400/20 rounded-full blur-xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  Siswa Aktif
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/40 text-blue-100 border border-blue-400/30">
                  {studentInfo.kelas} {studentInfo.jurusan ? `• ${studentInfo.jurusan}` : ""}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Halo, {studentInfo.nama}!
              </h2>
              <p className="text-white/85 text-xs sm:text-sm max-w-xl leading-relaxed">
                Pantau riwayat presensi harian, ketepatan waktu, dan jadwal mata pelajaran Anda secara real-time.
              </p>
            </div>

            {/* Time Widget Card */}
            <div className="flex items-center gap-4 bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0 self-start md:self-auto">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="text-xs text-white/80 font-medium">{todayFormatted}</div>
                <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-white">
                  {currentTime || "--:--:--"} <span className="text-xs font-normal">WIB</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Grid 1: Status Presensi Hari Ini & Stat Cards ─────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card Status Hari Ini */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Status Presensi Hari Ini</h3>
                    <p className="text-[11px] text-gray-400">Pembaruan otomatis sistem RFID</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${todayStatusInfo.color}`}>
                  <span className={`w-2 h-2 rounded-full ${todayStatusInfo.badge}`}></span>
                  {todayStatusInfo.label}
                </span>
              </div>

              {/* Attendance Details Grid */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Jam Tap-In
                  </div>
                  <div className="text-lg font-bold font-mono text-gray-900 mt-1">
                    {formatTimeShort(todayAttendance?.tap_in)}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Batas masuk: 06:45 WIB</div>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                  <div className="text-[11px] font-medium text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Jam Tap-Out
                  </div>
                  <div className="text-lg font-bold font-mono text-gray-900 mt-1">
                    {formatTimeShort(todayAttendance?.tap_out)}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Jam pulang sekolah</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>{todayStatusInfo.message}</span>
            </div>
          </div>

          {/* Cards Metric Statistik Kehadiran */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Persentase Kehadiran */}
            <div className="col-span-2 sm:col-span-2 bg-white rounded-2xl p-5 border border-gray-200/70 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tingkat Kehadiran
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Award className="w-4 h-4" />
                </span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 font-mono">
                    {stats.persentase}%
                  </span>
                  <span className="text-xs font-medium text-emerald-600">
                    {stats.persentase >= 90 ? "Sangat Baik" : stats.persentase >= 75 ? "Cukup" : "Perlu Ditingkatkan"}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, stats.persentase))}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-[11px] text-gray-400">
                Dari total {stats.totalHari} rekaman kehadiran
              </div>
            </div>

            {/* Tepat Waktu */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-semibold text-gray-500">Tepat Waktu</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 my-1">
                {stats.tepatWaktu}
              </div>
              <div className="text-[11px] text-gray-400">Hari hadir tepat</div>
            </div>

            {/* Terlambat */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-semibold text-gray-500">Terlambat</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-rose-500 my-1">
                {stats.terlambat}
              </div>
              <div className="text-[11px] text-gray-400">Perlu perhatian</div>
            </div>

            {/* Izin & Sakit */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-semibold text-gray-500">Izin / Sakit</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-blue-600 my-1">
                {stats.izin + stats.sakit}
              </div>
              <div className="text-[11px] text-gray-400">{stats.izin} izin, {stats.sakit} sakit</div>
            </div>

            {/* Alpha */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200/70 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-semibold text-gray-500">Tanpa Keterangan</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-gray-700 my-1">
                {stats.alpha}
              </div>
              <div className="text-[11px] text-gray-400">Alpha tercatat</div>
            </div>
          </div>
        </div>

        {/* ─── Grid 2: Jadwal Pelajaran (Schedule) & Student Details Card ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jadwal Pelajaran (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200/70 shadow-xs p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-900">Jadwal Pelajaran Kelas</h3>
                  <p className="text-xs text-gray-400">Kelas {studentInfo.kelas} {studentInfo.jurusan}</p>
                </div>
              </div>

              {/* Day Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                {DAYS_LIST.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${selectedDay === day
                        ? "bg-white text-indigo-600 font-bold shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* List Jadwal */}
            <div className="pt-4 space-y-3">
              {filteredSchedule.length > 0 ? (
                filteredSchedule.map((item, idx) => {
                  const status = getScheduleStatus(item);
                  const isOngoing = status === "ongoing";

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isOngoing
                          ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-400"
                          : "bg-slate-50/70 hover:bg-slate-50 border-gray-100"
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isOngoing
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-white text-gray-700 border border-gray-200"
                            }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-gray-900">
                              {item.mataPelajaran?.nama_pelajaran || item.mapel?.nama_pelajaran || item.mapel || "Mata Pelajaran"}
                            </h4>
                            {isOngoing && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-600 text-white animate-pulse">
                                Sedang Berlangsung
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              {item.guru?.nama || "Guru Pengampu"}
                            </span>
                            {item.ruangan && (
                              <span>• Ruang {item.ruangan}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:text-right shrink-0">
                        <span className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-xs font-mono font-semibold text-gray-700">
                          {item.jam_mulai || "--:--"} - {item.jam_selesai || "--:--"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
                  <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700">Tidak ada jadwal pada hari {selectedDay}</p>
                  <p className="text-xs text-gray-400 mt-1">Silakan pilih hari lain untuk melihat jadwal mata pelajaran.</p>
                </div>
              )}
            </div>
          </div>

          {/* Student Quick Identity & Walas Card (1 Col) */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200/70 shadow-xs p-5 sm:p-6">
              <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Identitas Siswa</h3>
                  <p className="text-xs text-gray-400">Data registrasi sekolah</p>
                </div>
              </div>

              <div className="pt-4 space-y-3.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-500">Nama Siswa</span>
                  <span className="font-semibold text-gray-900 text-right truncate max-w-[180px]">{studentInfo.nama}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-500">NISN</span>
                  <span className="font-mono font-bold text-gray-800">{studentInfo.nisn}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-500">NIPD / NIS</span>
                  <span className="font-mono font-medium text-gray-800">{studentInfo.nipd}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="text-gray-500">Kelas</span>
                  <span className="font-semibold text-blue-600">{studentInfo.kelas} {studentInfo.jurusan}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-500">Wali Kelas</span>
                  <span className="font-medium text-gray-800">{studentInfo.walasNama}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-gray-100">
                <a
                  href="/dashboard/profile"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-50 hover:bg-blue-50 text-gray-700 hover:text-blue-600 border border-gray-200 rounded-xl text-xs font-semibold transition"
                >
                  <span>Lihat Profil Lengkap</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

               <div className="mt-3">
                {lmsUrl ? (
                  <a
                    href={lmsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border border-indigo-300 rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.5M12 14V4m0 10l-6.16 3.5M15.5 12c0 1.66-.67 3.26-1.76 4.34l-.24.26a6.96 6.96 0 01-1.5 1.12 6.96 6.96 0 01-2.5 0 6.96 6.96 0 01-1.5-1.12l-.24-.26A6.47 6.47 0 018.5 12c0-1.66.67-3.26 1.76-4.34l.24-.26a6.96 6.96 0 011.5-1.12 6.96 6.96 0 012.5 0 6.96 6.96 0 011.5 1.12l.24.26A6.47 6.47 0 0115.5 12z" /></svg>
                    <span>Buka LMS SMK Taruna Bhakti</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    disabled={lmsUrlLoading || loading}
                    onClick={async () => {
                      try {
                        setLmsUrlLoading(true);
                        const res = await moodle.getLmsUrl();
                        if (res?.success && res?.data?.url) {
                          setLmsUrl(res.data.url);
                        }
                      } catch (e) {
                        console.error("LMS URL fetch error:", e);
                      } finally {
                        setLmsUrlLoading(false);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white border border-indigo-300 rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
                  >
                    {lmsUrlLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Loading LMS...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /></svg>
                        <span>Buka LMS SMK Taruna Bhakti</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Info / Tata Tertib Card */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/80 rounded-2xl p-5 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Tata Tertib Presensi
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-800/90 leading-relaxed text-[11px]">
                <li>Tap-In RFID wajib dilakukan sebelum pukul <strong>06:45 WIB</strong>.</li>
                <li>Tap-Out dilakukan saat jam kepulangan sekolah selesai.</li>
                <li>Apabila berhalangan hadir (Sakit/Izin), orang tua wajib mengonfirmasi wali kelas.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ─── Grid 3: Riwayat Log Presensi Siswa ─────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200/70 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Riwayat Kehadiran Terbaru</h3>
                <p className="text-xs text-gray-400">Catatan riwayat presensi RFID kartu Anda</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto pt-4">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Tap In</th>
                  <th className="py-3 px-3">Tap Out</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendanceHistory.length > 0 ? (
                  attendanceHistory.slice(0, 10).map((row, i) => {
                    const statusFinal = String(row.status_final || "").toUpperCase();
                    const statusTapin = String(row.status_tapin || row.status || "").toUpperCase();
                    const displayStatus = statusFinal || statusTapin;
                    let badgeColor = "bg-gray-100 text-gray-700";
                    let label = "Hadir";

                    if (displayStatus === "TEPAT_WAKTU" || displayStatus === "HADIR") {
                      badgeColor = "bg-emerald-50 text-emerald-700 border border-emerald-200";
                      label = "Hadir";
                    } else if (displayStatus === "TERLAMBAT") {
                      badgeColor = "bg-rose-50 text-rose-700 border border-rose-200";
                      label = "Terlambat";
                    } else if (displayStatus === "IZIN") {
                      badgeColor = "bg-blue-50 text-blue-700 border border-blue-200";
                      label = "Izin";
                    } else if (displayStatus === "SAKIT") {
                      badgeColor = "bg-purple-50 text-purple-700 border border-purple-200";
                      label = "Sakit";
                    } else if (displayStatus === "ALPHA") {
                      badgeColor = "bg-red-50 text-red-700 border border-red-200";
                      label = "Alpha";
                    }

                    const dateStr = row.tanggal
                      ? new Date(row.tanggal).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                      : "-";

                    return (
                      <tr key={row.id || i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-medium text-gray-900">{dateStr}</td>
                        <td className="py-3 px-3 font-mono text-gray-700">{formatTimeShort(row.tap_in)}</td>
                        <td className="py-3 px-3 font-mono text-gray-700">{formatTimeShort(row.tap_out)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${badgeColor}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500">{row.keterangan || row.status_final || "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                      Belum ada riwayat kehadiran yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
