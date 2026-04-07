import { useState, useEffect } from "react";
import { kelas } from "../../lib/backendApi";

export default function DaftarKehadiranKelas() {
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const parsedUser = userStr ? JSON.parse(userStr) : null;
        const role = parsedUser?.role?.name || parsedUser?.role;
        const guruId = parsedUser?.guru?.id;

        const res = await kelas.list("limit=100");
        if (res.success && res.data) {
          let data = res.data;
          
          if (role === "WALAS") {
            data = data.filter(c => c.walas_id === guruId);
          } else if (role === "GURU") {
          }
          
          setClassList(data);
        }
      } catch (e) {
        console.error("Failed to fetch classes", e);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const filteredClasses = classList.filter(cls => 
    cls.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.jurusan?.nama_jurusan?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Kehadiran Siswa</h1>
          <p className="text-sm text-gray-500 mt-1">Pilih kelas untuk melihat rekap kehadiran</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Cari kelas..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Kelas</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jurusan</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4 text-right"><div className="h-4 bg-gray-200 rounded w-20 ml-auto"></div></td>
                  </tr>
                ))
              ) : filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {cls.kelas}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {cls.jurusan?.nama_jurusan || "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a 
                        href={`/dashboard/kehadiran?kelasId=${cls.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-blue-600 rounded-lg text-xs font-semibold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 shadow-sm"
                      >
                        Lihat Kehadiran
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-gray-500 italic">
                    Tidak ada kelas yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <p>Menampilkan {filteredClasses.length} dari {classList.length} kelas terdaftar.</p>
        </div>
      </div>
    </main>
  );
}
