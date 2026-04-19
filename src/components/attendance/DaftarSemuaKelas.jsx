import { useState, useEffect } from "react";
import { kelas } from "../../lib/backendApi";
import PageHeader from "../layout/PageHeader";

export default function DaftarSemuaKelas() {
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await kelas.list("limit=100");
        if (res.success && res.data) {
          setClassList(res.data);
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
    // FIX: jurusan adalah String di model Kelas, bukan relasi objek
    cls.jurusan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.id?.toString().includes(searchTerm)
  );

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <PageHeader 
        title="Kelola Semua Daftar kelas"
        subtitle="Kelola Daftar kelas massal"
      />
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-700">Daftar Semua Kelas</h3>
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Cari ID, Kelas, atau Jurusan..."
                  className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 hover:bg-white transition-all text-sm w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID Kelas</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama Kelas</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jurusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                  </tr>
                ))
              ) : filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-gray-500">#{cls.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {cls.kelas}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {/* FIX: jurusan adalah string langsung, bukan cls.jurusan.nama_jurusan */}
                      {cls.jurusan || "-"}
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

        <div className="mt-6 text-xs text-gray-500">
          <p>Menampilkan {filteredClasses.length} dari {classList.length} kelas terdaftar.</p>
        </div>
      </div>
    </main>
  );
}