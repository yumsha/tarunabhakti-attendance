import React, { useRef, useState, useEffect } from "react";
import { ChevronDown, Pencil, Trash2, Plus, Upload } from "lucide-react";
import Pagination from "../../layout/Pagination";
import {
  downloadExcelTemplate,
  downloadPdfTemplate,
  downloadUpdateOrtuExcelTemplate,
  downloadUpdateOrtuPdfTemplate,
  exportTableExcel,
  exportTablePdf,
} from "./ortuUtils";

export default function OrtuTable({
  pageData,
  allData,
  filteredData,
  currentPageData,
  loading,
  backgroundLoading,
  totalRecords,
  page,
  setPage,
  totalPagesCount,
  searchQuery,
  onSearchChange,
  onClearSearch,
  onAddManual,
  onOpenImportModal,
  onOpenUpdateModal,
  onEditOrtu,
  onDeleteOrtu,
}) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);

  const templateRef = useRef();
  const exportRef = useRef();
  const importMenuRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const TABLE_COLS = ["ID", "Nama Orang Tua", "NIK", "Nomor Telepon", "Pekerjaan", "Alamat", "Aksi"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Toolbar */}
      <div className="relative z-20 p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Count */}
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-gray-500">
            {loading && !searchQuery.trim() ? (
              <span>Memuat data…</span>
            ) : searchQuery.trim() ? (
              backgroundLoading ? (
                <span>Memuat data pencarian…</span>
              ) : (
                <>
                  <span className="font-semibold text-gray-700">{filteredData.length}</span> dari{" "}
                  <span className="font-semibold text-gray-700">{allData.length}</span> orang tua ditemukan
                </>
              )
            ) : (
              <>
                <span className="font-semibold text-gray-700">{pageData.length}</span> dari{" "}
                <span className="font-semibold text-gray-700">{totalRecords}</span> orang tua terdaftar
              </>
            )}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72 md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama, NIK, atau telepon..."
            className="w-full px-3.5 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 cursor-pointer font-semibold"
              aria-label="Hapus pencarian"
            >
              Reset
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-start">
          {/* Template Dropdown */}
          <div className="relative" ref={templateRef}>
            <button
              type="button"
              onClick={() => {
                setShowTemplateMenu(!showTemplateMenu);
                setShowExportMenu(false);
                setShowImportMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
            >
              <span>Template</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ease-out ${
                  showTemplateMenu ? "rotate-180 text-gray-600" : ""
                }`}
              />
            </button>

            {showTemplateMenu && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-1.5 z-50 animate-dropdown">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Import Baru
                </p>
                <button
                  type="button"
                  onClick={() => {
                    downloadExcelTemplate();
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition cursor-pointer font-medium active:scale-[0.98]"
                >
                  Template Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadPdfTemplate();
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition cursor-pointer font-medium active:scale-[0.98]"
                >
                  Template PDF
                </button>
                <div className="border-t border-gray-100 my-1 mx-1" />
                <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Update Data
                </p>
                <button
                  type="button"
                  onClick={() => {
                    downloadUpdateOrtuExcelTemplate();
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98]"
                >
                  Template Update (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadUpdateOrtuPdfTemplate();
                    setShowTemplateMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 pb-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98]"
                >
                  Template Update (PDF)
                </button>
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowTemplateMenu(false);
                setShowImportMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
            >
              <span>Export</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ease-out ${
                  showExportMenu ? "rotate-180 text-gray-600" : ""
                }`}
              />
            </button>

            {showExportMenu && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-52 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-1.5 z-50 animate-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    exportTableExcel(filteredData);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition cursor-pointer font-medium active:scale-[0.98]"
                >
                  Export Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportTablePdf(filteredData);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition cursor-pointer font-medium active:scale-[0.98]"
                >
                  Export PDF
                </button>
              </div>
            )}
          </div>

          {/* Tambah Orang Tua Dropdown */}
          <div className="relative" ref={importMenuRef}>
            <button
              type="button"
              onClick={() => {
                setShowImportMenu(!showImportMenu);
                setShowTemplateMenu(false);
                setShowExportMenu(false);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Orang Tua</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 ease-out ${
                  showImportMenu ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {showImportMenu && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-1.5 z-50 animate-dropdown">
                <button
                  type="button"
                  onClick={() => {
                    onAddManual();
                    setShowImportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2.5"
                >
                  <span className="text-blue-600">
                    <Plus className="w-4 h-4" />
                  </span>
                  <span>Tambah Mandiri</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenImportModal();
                    setShowImportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-blue-50/80 hover:text-blue-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2.5"
                >
                  <span className="text-blue-600">
                    <Upload className="w-4 h-4" />
                  </span>
                  <span>Import Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenUpdateModal();
                    setShowImportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2.5"
                >
                  <span className="text-emerald-600">
                    <Upload className="w-4 h-4" />
                  </span>
                  <span>Update Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {TABLE_COLS.map((h) => (
                <th
                  key={h}
                  className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {TABLE_COLS.map((_, j) => (
                    <td key={j} className="px-4 sm:px-6 py-4">
                      <div className="h-4 bg-gray-100 rounded w-20" />
                    </td>
                  ))}
                </tr>
              ))
            ) : currentPageData.length > 0 ? (
              currentPageData.map((o, i) => (
                <tr key={o.id ?? i} className="hover:bg-blue-50/30 transition-colors duration-150">
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-semibold text-gray-900">{o.id}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-semibold text-gray-900">{o.nama_orangtua}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600 font-mono">{o.NIK}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600">{o.nomor_telepon}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600">{o.pekerjaan}</td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600 max-w-xs truncate">{o.alamat}</td>
                  <td className="px-4 sm:px-6 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEditOrtu(o)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900 transition active:scale-[0.98] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteOrtu(o)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition active:scale-[0.98] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={TABLE_COLS.length} className="px-6 py-12 text-center text-xs sm:text-sm text-gray-500 italic">
                  {searchQuery ? "Tidak ada data yang sesuai dengan pencarian." : "Tidak ada data orang tua."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPagesCount}
        onPageChange={setPage}
        summary={`Halaman ${page} dari ${totalPagesCount} (Menampilkan ${currentPageData.length} dari ${
          searchQuery.trim() ? filteredData.length : totalRecords
        } data)`}
        className="border-t border-gray-100 bg-gray-50/50"
      />
    </div>
  );
}
