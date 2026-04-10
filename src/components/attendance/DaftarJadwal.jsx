import { useState, useEffect } from "react";
import { jadwal, guru, kelas, mapel } from "../../lib/backendApi"; // Mengasumsikan endpoint API sudah diubah ke jadwal

export default function DaftarJadwal() {
  const [jadwalList, setJadwalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const [guruList, setGuruList] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [mapelList, setMapelList] = useState([]);

  const [selectedJadwal, setSelectedJadwal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Jadwal state
  const [newJadwal, setNewJadwal] = useState({
    hari: "SENIN",
    kelas_id: "",
    mapel_id: "",
    guru_id: "",
    jam_mulai: "07:00",
    jam_selesai: "08:00"
  });

  const [importFile, setImportFile] = useState(null);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const fetchJadwal = async () => {
      try {
        // Mengambil data jadwal, sesuaikan limit jika perlu
        const res = await jadwal.list("limit=100");
        if (res.success && res.data) {
          setJadwalList(res.data);
        }
      } catch (e) {
        console.error("Failed to fetch schedules", e);
      } finally {
        setLoading(false);
      }
    };
    fetchJadwal();
  }, []);

  // Filter pencarian berdasarkan Hari, Mata Pelajaran, atau Nama Kelas
  const filteredJadwal = jadwalList.filter(item => 
    item.hari?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.mata_pelajaran?.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kelas?.kelas?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id?.toString().includes(searchTerm)
  );

  const handleDeleteJadwal = (item) => {
    setSelectedJadwal(item);
    setShowDeleteModal(true);
  };

  const confirmDeleteJadwal = async () => {
    if (!selectedJadwal) return;
    
    setIsSubmitting(true);
    try {
      const res = await jadwal.delete(selectedJadwal.id);
      if (res.success) {
        // Update local state by removing deleted item
        setJadwalList(prev => prev.filter(item => item.id !== selectedJadwal.id));
        setShowDeleteModal(false);
        setSelectedJadwal(null);
        showNotification("Jadwal berhasil dihapus");
      } else {
        alert(res.message || "Gagal menghapus jadwal");
      }
    } catch (e) {
      console.error("Error deleting jadwal", e);
      alert("Terjadi kesalahan saat menghapus jadwal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchDataForCreate = async () => {
    try {
      const [resGuru, resKelas, resMapel] = await Promise.all([
        guru.list(),
        kelas.list("limit=100"),
        mapel.list()
      ]);

      if (resGuru.success) setGuruList(resGuru.data);
      if (resKelas.success) setKelasList(resKelas.data);
      if (resMapel.success) setMapelList(resMapel.data);
    } catch (e) {
      console.error("Failed to fetch data for create", e);
    }
  };

  const handleCreateManual = () => {
    setShowCreateMenu(false);
    fetchDataForCreate();
    setShowCreateModal(true);
  };

  const handleSaveNewJadwal = async () => {
    if (!newJadwal.kelas_id || !newJadwal.mapel_id || !newJadwal.guru_id) {
      alert("Harap isi semua field yang wajib");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await jadwal.create({
        ...newJadwal,
        kelas_id: parseInt(newJadwal.kelas_id),
        mapel_id: parseInt(newJadwal.mapel_id),
        guru_id: parseInt(newJadwal.guru_id)
      });

      if (res.success) {
        setJadwalList(prev => [res.data, ...prev]);
        setShowCreateModal(false);
        setNewJadwal({
          hari: "SENIN",
          kelas_id: "",
          mapel_id: "",
          guru_id: "",
          jam_mulai: "07:00",
          jam_selesai: "08:00"
        });
        showNotification("Jadwal baru berhasil dibuat");
      } else {
        alert(res.message || "Gagal membuat jadwal baru");
      }
    } catch (e) {
      console.error("Error creating jadwal", e);
      alert("Terjadi kesalahan saat membuat jadwal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setIsSubmitting(true);
    // TODO: Implement actual import logic (requires backend supporting file upload)
    setTimeout(() => {
      showNotification("Protokol Import XLSX/PDF sedang dalam pengembangan", "info");
      setIsSubmitting(false);
      setShowImportModal(false);
      setImportFile(null);
    }, 1500);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Jadwal Pelajaran</h1>
          <p className="text-sm text-gray-500 mt-1">Atur waktu, mata pelajaran, dan penugasan kelas</p>
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
              placeholder="Cari hari, mapel, atau kelas..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition-all text-sm w-80"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowCreateMenu(!showCreateMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 font-bold text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Jadwal
            </button>

            {showCreateMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={handleCreateManual}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3 border-b border-gray-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Tambah Manual
                </button>
                <button 
                  onClick={() => { setShowCreateMenu(false); setShowImportModal(true); }}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Import XLSX/PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mata Pelajaran</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelas</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Guru</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
                  </tr>
                ))
              ) : filteredJadwal.length > 0 ? (
                filteredJadwal.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{item.hari}</span>
                        <span className="text-xs text-gray-500 font-mono">{item.jam_mulai} - {item.jam_selesai}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-blue-600">
                        {item.mata_pelajaran.nama_mapel || "Tidak Ada Mapel"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {item.kelas?.kelas || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold mr-2">
                          {item.guru?.nama?.substring(0, 2).toUpperCase() || "?"}
                        </div>
                        <span className="text-sm text-gray-600">
                          {item.guru?.nama || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors flex items-center gap-1" onClick={() => handleDeleteJadwal(item)}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                    Jadwal tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
          <p>Menampilkan {filteredJadwal.length} sesi jadwal.</p>
          <div className="flex gap-2 text-[10px] uppercase font-bold tracking-widest text-gray-400">
            <span>Status: Aktif</span>
            <span>•</span>
            <span>Tahun Ajaran 2024/2025</span>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Hapus */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Hapus Jadwal?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin menghapus jadwal <strong>{selectedJadwal?.mata_pelajaran?.nama_mapel}</strong> untuk kelas <strong>{selectedJadwal?.kelas?.kelas}</strong> pada hari <strong>{selectedJadwal?.hari}</strong>? Tindakan ini tidak dapat dibatalkan.
              </p>
              
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                  onClick={() => { setShowDeleteModal(false); setSelectedJadwal(null); }}
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="px-8 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 active:bg-red-800 transition-all shadow-md shadow-red-200 disabled:opacity-50 flex items-center gap-2"
                  onClick={confirmDeleteJadwal}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menghapus...
                    </>
                  ) : (
                    "Ya, Hapus Jadwal"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Jadwal Manual */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Tambah Jadwal Pelajaran</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">Hari</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                    value={newJadwal.hari}
                    onChange={(e) => setNewJadwal({ ...newJadwal, hari: e.target.value })}
                  >
                    <option value="SENIN">SENIN</option>
                    <option value="SELASA">SELASA</option>
                    <option value="RABU">RABU</option>
                    <option value="KAMIS">KAMIS</option>
                    <option value="JUMAT">JUMAT</option>
                    <option value="SABTU">SABTU</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">Kelas</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                    value={newJadwal.kelas_id}
                    onChange={(e) => setNewJadwal({ ...newJadwal, kelas_id: e.target.value })}
                  >
                    <option value="">Pilih Kelas...</option>
                    {kelasList.map(k => (
                      <option key={k.id} value={k.id}>{k.kelas}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">Mata Pelajaran</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                    value={newJadwal.mapel_id}
                    onChange={(e) => setNewJadwal({ ...newJadwal, mapel_id: e.target.value })}
                  >
                    <option value="">Pilih Mapel...</option>
                    {mapelList.map(m => (
                      <option key={m.id} value={m.id}>{m.nama_mapel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">Guru Pengampu</label>
                  <select
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                    value={newJadwal.guru_id}
                    onChange={(e) => setNewJadwal({ ...newJadwal, guru_id: e.target.value })}
                  >
                    <option value="">Pilih Guru...</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.id}>{g.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">Jam Mulai</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                    value={newJadwal.jam_mulai}
                    onChange={(e) => setNewJadwal({ ...newJadwal, jam_mulai: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 pl-1">Jam Selesai</label>
                  <input
                    type="time"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                    value={newJadwal.jam_selesai}
                    onChange={(e) => setNewJadwal({ ...newJadwal, jam_selesai: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                onClick={() => setShowCreateModal(false)}
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                onClick={handleSaveNewJadwal}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Menyimpan..." : "Buat Jadwal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Jadwal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Import Jadwal</h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 text-center">
              <div className="mb-6 w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-2">Upload File Jadwal</h4>
              <p className="text-sm text-gray-500 mb-6">Pilih file .xlsx atau .pdf yang sesuai dengan format template jadwal sekolah.</p>
              
              <label 
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${importFile ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-400 bg-gray-50'}`}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-sm font-medium text-gray-600">
                    {importFile ? importFile.name : "Klik untuk pilih file"}
                  </span>
                  {!importFile && <span className="text-xs text-gray-400 mt-1">XLSX, PDF (Maks. 5MB)</span>}
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.pdf"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </label>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
              >
                Batal
              </button>
              <button
                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50"
                onClick={handleImportSubmit}
                disabled={!importFile || isSubmitting}
              >
                {isSubmitting ? "Memproses..." : "Mulai Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
            {notification.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="font-bold text-sm">{notification.message}</span>
          </div>
        </div>
      )}
    </main>
  );
}