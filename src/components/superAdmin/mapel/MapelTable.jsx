import React, { useState } from "react";
import { Search, Plus, Pencil, Trash2, X, AlertTriangle, BookX } from "lucide-react";
import Pagination from "../../layout/Pagination";

// Tooltip helper
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="hidden sm:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap px-2.5 py-1 text-xs rounded-lg bg-gray-900 text-white shadow-lg pointer-events-none leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

// Skeleton Row
function SkeletonRow({ delay = 0 }) {
  return (
    <tr className="border-b border-gray-50">
      {[32, 200, 160, 120].map((w, i) => (
        <td key={i} className="px-4 sm:px-6 py-4">
          <div
            className="h-3.5 rounded-lg bg-gray-100 animate-pulse"
            style={{ width: w, animationDelay: `${delay}ms` }}
          />
        </td>
      ))}
    </tr>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MapelTable({
  mapels,
  filteredMapels,
  pagedMapels,
  page,
  pageSize,
  totalPages,
  onPageChange,
  search,
  onSearchChange,
  searchRef,
  fetchLoading,
  fetchError,
  onRetry,
  onAddMapel,
  onEditMapel,
  onDeleteMapel,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm sm:text-base">Daftar Mata Pelajaran</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {fetchLoading ? "Memuat data…" : `${mapels.length} mata pelajaran terdaftar`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
          {/* Search Bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              id="search-mapel"
              ref={searchRef}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari mata pelajaran…"
              className="w-full sm:w-56 pl-8 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  searchRef?.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Add Button */}
          <button
            id="add-mapel-btn"
            type="button"
            onClick={onAddMapel}
            className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition shadow-sm font-medium cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mapel</span>
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100">
              <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12 sm:w-16">
                No
              </th>
              <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nama Mata Pelajaran
              </th>
              <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Tanggal Ditambahkan
              </th>
              <th className="px-4 sm:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right sm:text-left">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {fetchLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} delay={i * 60} />
              ))
            ) : fetchError ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 sm:py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-red-500">
                    <div className="p-3 bg-red-50 rounded-full">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium">{fetchError}</p>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium cursor-pointer"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredMapels.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 sm:py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="p-3.5 sm:p-4 bg-gray-50 rounded-full">
                      {search ? (
                        <Search className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <BookX className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500">
                      {search
                        ? `Tidak ada mapel yang cocok dengan "${search}"`
                        : "Belum ada mata pelajaran. Tambahkan sekarang."}
                    </p>
                    {search && (
                      <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        className="text-xs text-indigo-600 hover:underline font-medium cursor-pointer"
                      >
                        Hapus pencarian
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagedMapels.map((mapel, idx) => (
                <tr
                  key={mapel.id}
                  className="transition-colors duration-100 hover:bg-indigo-50/20"
                >
                  {/* No */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm text-gray-400 font-mono">
                    {(page - 1) * pageSize + idx + 1}
                  </td>

                  {/* Nama Mapel */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">
                      {mapel.nama_mapel}
                    </p>
                    {/* Mobile-only date below name */}
                    <p className="text-[11px] text-gray-400 mt-0.5 md:hidden">
                      {formatDate(mapel.created_at)}
                    </p>
                  </td>

                  {/* Tanggal Dibuat (Desktop/Tablet) */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                    {formatDate(mapel.created_at)}
                  </td>

                  {/* Aksi */}
                  <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-right sm:text-left">
                    <div className="flex items-center justify-end sm:justify-start gap-1.5 sm:gap-2">
                      <Tooltip text="Edit mata pelajaran">
                        <button
                          id={`edit-mapel-${mapel.id}`}
                          type="button"
                          onClick={() => onEditMapel(mapel)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition font-medium cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                      </Tooltip>

                      <Tooltip text="Hapus mata pelajaran">
                        <button
                          id={`delete-mapel-${mapel.id}`}
                          type="button"
                          onClick={() => onDeleteMapel(mapel)}
                          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs border border-red-200 rounded-lg text-red-600 hover:bg-red-50 hover:border-red-300 transition font-medium cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Footer info & Pagination */}
        {!fetchLoading && !fetchError && filteredMapels.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            summary={
              search
                ? `Menampilkan ${pagedMapels.length} hasil dari ${filteredMapels.length} data`
                : `Menampilkan ${pagedMapels.length} data dari total ${mapels.length} mapel`
            }
            className="border-gray-100 bg-gray-50/50"
          />
        )}
      </div>
    </div>
  );
}
