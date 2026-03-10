import { useState, useEffect } from 'react';
import { jadwal } from '../../lib/backendApi';

export default function WalasDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Guru Dashboard</h1>
        <div className="flex items-center gap-4">
          
          <a href="/dashboard/profile">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              {user?.email[0] || 'G'}
            </div>
          </a>
        </div>
      </header>

      {/* Welcome Sign */}
      <div className="p-8">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg mb-8">
          <h2 className="text-3xl font-bold mb-2">Selamat Datang, {user?.guru?.nama || 'Guru'}!</h2>
          <p className="opacity-90">Pantau kehadiran siswa Anda hari ini.</p>
          <p className="opacity-90">Hari ini adalah hari {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Quick Info Placeholder */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Jadwal pada Hari {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
            </h3>
            <div>
              {jadwalData.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {jadwalData.map((item, index) => (
                    <li key={item.id || index} className="py-2 flex items-center gap-4">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.mata_pelajaran.nama_mapel} - {item.kelas.kelas}</p>
                        <p className="text-xs text-gray-500">{item.jam_mulai} - {item.jam_selesai}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8 italic">Tidak ada jadwal untuk hari ini.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Aktifitas Terkini
            </h3>
            <p className="text-gray-500 text-center py-8 italic">Jadwal yang sudah sesai akan ditampilkan disini.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
