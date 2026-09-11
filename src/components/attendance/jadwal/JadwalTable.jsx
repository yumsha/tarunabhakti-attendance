import React, { useRef, useEffect } from "react";
import { Download, Plus, ChevronDown, Pencil, Trash2 } from "lucide-react";
import Pagination from "../../layout/Pagination";
import SearchableSelect from "./SearchableSelect";
import { formatTime, HARI_COLOR } from "./jadwalUtils";

export default function JadwalTable({
  jadwalList,
  filteredJadwal,
  currentPageData,
  loading,
  searchTerm,
  setSearchTerm,
  selectedKelasFilter,
  setSelectedKelasFilter,
  kelasList = [],
  page,
  setPage,
  totalPagesCount,
  canManageJadwal,
  showCreateMenu,
  setShowCreateMenu,
  onExportData,
  onCreateManual,
  onOpenImportModal,
  onEditJadwal,
  onDeleteJadwal,
}) {
  const createMenuRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setShowCreateMenu]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Toolbar */}
      <div className="relative z-20 p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-1 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-60 md:w-64">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari hari, mapel, guru..."
              className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition text-xs sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Hapus pencarian"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter Kelas */}
          <div className="flex-1 sm:flex-initial sm:w-60 md:w-64">
            <SearchableSelect
              value={selectedKelasFilter}
              onChange={setSelectedKelasFilter}
              options={kelasList}
              placeholder="Semua Kelas"
              activeBlue={true}
              renderLabel={(item) => (
                <>
                  <span>{item.kelas} {item.jurusan}</span>
                  {(item.tahun?.tahun_ajaran || item.tahun_ajaran) && (
                    <span className="ml-1 text-[11px] text-gray-400 font-normal">
                      ({item.tahun?.tahun_ajaran || item.tahun_ajaran})
                    </span>
                  )}
                </>
              )}
              getSearchText={(item) =>
                `${item.kelas} ${item.jurusan} ${item.tahun?.tahun_ajaran || item.tahun_ajaran || ""}`
              }
            />
          </div>

          {/* Reset Filter */}
          {(searchTerm || selectedKelasFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedKelasFilter("");
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right: Export & Add Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-start">
          {/* Export Button */}
          <button
            type="button"
            onClick={onExportData}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 active:scale-[0.98] transition text-gray-700 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Data</span>
          </button>

          {/* Tambah Jadwal Menu */}
          {canManageJadwal && (
            <div className="relative flex-1 sm:flex-initial" ref={createMenuRef}>
              <button
                type="button"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition shadow-sm font-semibold text-xs sm:text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${showCreateMenu ? "rotate-180" : ""}`}
                />
              </button>

              {showCreateMenu && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-52 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-1.5 z-50 overflow-hidden animate-dropdown">
                  <button
                    type="button"
                    onClick={onCreateManual}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition flex items-center gap-2.5 cursor-pointer font-medium active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Tambah Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateMenu(false);
                      onOpenImportModal();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition flex items-center gap-2.5 cursor-pointer font-medium active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Import XLSX/PDF</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100">
              <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                Hari
              </th>
              <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Waktu
              </th>
              <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mata Pelajaran
              </th>
              <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Kelas
              </th>
              <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Guru
              </th>
              {canManageJadwal && (
                <th className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right sm:text-left">
                  Aksi
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array(5)
                .fill(0)
                .map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(canManageJadwal ? 6 : 5)
                      .fill(0)
                      .map((_, j) => (
                        <td key={j} className="px-4 sm:px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded w-20" />
                        </td>
                      ))}
                  </tr>
                ))
            ) : currentPageData.length > 0 ? (
              currentPageData.map((item) => (
                <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                  {/* Hari */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        HARI_COLOR[item.hari] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.hari}
                    </span>
                  </td>

                  {/* Waktu */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                    <span className="text-xs text-gray-600 font-mono font-medium whitespace-nowrap">
                      {formatTime(item.jam_mulai)} – {formatTime(item.jam_selesai)}
                    </span>
                  </td>

                  {/* Mapel */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                    <span className="text-xs sm:text-sm font-semibold text-blue-600">
                      {item.mata_pelajaran?.nama_mapel || "-"}
                    </span>
                  </td>

                  {/* Kelas */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                    <div className="flex flex-col">
                      <span className="text-xs sm:text-sm font-semibold text-gray-900">
                        {item.kelas?.kelas || "-"}
                      </span>
                      {item.kelas?.jurusan && (
                        <span className="text-[11px] text-gray-400">{item.kelas.jurusan}</span>
                      )}
                    </div>
                  </td>

                  {/* Guru */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-[10px] font-bold shrink-0">
                        {item.guru?.nama?.substring(0, 2).toUpperCase() || "?"}
                      </div>
                      <span className="text-xs sm:text-sm text-gray-700 font-medium truncate max-w-[140px] sm:max-w-none">
                        {item.guru?.nama || "-"}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  {canManageJadwal && (
                    <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-right sm:text-left">
                      <div className="flex items-center justify-end sm:justify-start gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() => onEditJadwal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition active:scale-[0.98] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-500" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteJadwal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition active:scale-[0.98] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={canManageJadwal ? 6 : 5}
                  className="px-6 py-12 sm:py-16 text-center text-xs sm:text-sm text-gray-500 italic"
                >
                  {searchTerm || selectedKelasFilter
                    ? "Tidak ada jadwal cocok dengan filter yang dipilih."
                    : "Jadwal tidak ditemukan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPagesCount || 1}
          onPageChange={setPage}
          summary={`Halaman ${page} dari ${totalPagesCount || 1} (Menampilkan ${currentPageData.length} dari ${filteredJadwal.length} sesi)`}
          className="border-t border-gray-100 bg-gray-50/50"
        />
      </div>
    </div>
  );
}
