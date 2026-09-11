import { useState, useEffect } from 'react';
import { auth, jadwal } from '../../lib/backendApi';
import PageHeader from "../layout/PageHeader.jsx";

export default function GuruDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (_) {}

    const token = localStorage.getItem("accessToken");
    if (!token) return;

    (async () => {
      try {
        const res = await auth.me();
        if (res?.success && res?.data) {
          setUser(res.data);
          try {
            localStorage.setItem("user", JSON.stringify(res.data));
          } catch (_) {}
        }
      } catch (_) {}
    })();
  }, []);

  const [jadwalData, setJadwalData] = useState([]);

  useEffect(() => {
    const fetchJadwal = async () => {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      const guruId = user?.guru?.id;

      const today = new Date()
        .toLocaleDateString("id-ID", { weekday: "long" })
        .toUpperCase();

      try {
        const res = await jadwal.list(`hari=${today}&guru_id=${guruId}`);
        console.debug('jadwal.list response', res);
        if (res && res.success && Array.isArray(res.data)) {
          setJadwalData(res.data);
        } else {
          setJadwalData([]);
        }
      } catch (err) {
        console.error('Error fetching jadwal:', err);
      }
    };

    fetchJadwal();
  }, []);

  // ─── Helpers: tentukan status jadwal berdasarkan jam sekarang ───────────────
  const getNowMinutes = () => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = String(timeStr).split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1] ?? 0);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const getJadwalStatus = (item) => {
    const nowMin = getNowMinutes();
    const mulai = parseTimeToMinutes(item.jam_mulai);
    const selesai = parseTimeToMinutes(item.jam_selesai);
    if (mulai === null || selesai === null) return "unknown";
    if (nowMin < mulai) return "upcoming";
    if (nowMin >= mulai && nowMin < selesai) return "ongoing";
    return "selesai";
  };

  // Jadwal yang sudah selesai hari ini, terbaru di atas
  const jadwalSelesai = jadwalData
    .filter((item) => getJadwalStatus(item) === "selesai")
    .sort((a, b) => {
      const aMin = parseTimeToMinutes(a.jam_selesai) ?? 0;
      const bMin = parseTimeToMinutes(b.jam_selesai) ?? 0;
      return bMin - aMin;
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <PageHeader
        title="Guru Dashboard"
        subtitle="Dashboard Guru"
      />

      {/* Welcome Sign */}
      <div className="p-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg mb-8">
          <h2 className="text-3xl font-bold mb-2">Selamat Datang, {user?.guru?.nama || 'Guru'}!</h2>
          <p className="opacity-90">Pantau kehadiran siswa Anda hari ini.</p>
          <p className="opacity-90">Hari ini adalah hari {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Panel kiri — Jadwal Hari Ini */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Jadwal pada Hari {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
            </h3>
            <div>
              {jadwalData.length > 0 ? (
                <ul className="divide-y divide-gray-100 max-h-52 overflow-y-auto pr-1">
                  {jadwalData.map((item, index) => {
                    const status = getJadwalStatus(item);
                    const dotColor =
                      status === "ongoing"  ? "bg-green-500 animate-pulse" :
                      status === "selesai"  ? "bg-gray-300" :
                                             "bg-blue-400";
                    return (
                      <li key={item.id || index} className="py-2.5 flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.mata_pelajaran?.nama_mapel || '-'} — {item.kelas?.kelas || '-'}{item.kelas?.jurusan ? ` ${item.kelas.jurusan}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">{item.jam_mulai} – {item.jam_selesai}</p>
                        </div>
                        {status === "ongoing" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                            Berlangsung
                          </span>
                        )}
                        {status === "selesai" && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
                            Selesai
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8 italic">Tidak ada jadwal untuk hari ini.</p>
              )}
            </div>
          </div>

          {/* Panel kanan — Aktifitas Terkini (jadwal yang sudah selesai) */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Aktifitas Terkini
            </h3>
            {jadwalSelesai.length > 0 ? (
              <ul className="divide-y divide-gray-100 max-h-52 overflow-y-auto pr-1">
                {jadwalSelesai.map((item, index) => (
                  <li key={item.id || index} className="py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.mata_pelajaran?.nama_mapel || '-'} — {item.kelas?.kelas || '-'}{item.kelas?.jurusan ? ` ${item.kelas.jurusan}` : ''}
                      </p>
                      <p className="text-xs text-gray-400">Selesai pukul {item.jam_selesai}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0 whitespace-nowrap">
                      Selesai
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <svg className="w-10 h-10 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-400 text-sm italic">Belum ada jadwal yang selesai hari ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
