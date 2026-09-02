import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

  const [templateCoords, setTemplateCoords] = useState({ top: 0, left: 0 });
  const [exportCoords, setExportCoords] = useState({ top: 0, left: 0 });
  const [importCoords, setImportCoords] = useState({ top: 0, left: 0 });

  const updateMenuCoords = () => {
    if (showTemplateMenu && templateRef.current) {
      const rect = templateRef.current.getBoundingClientRect();
      setTemplateCoords({
        top: rect.bottom + 4,
        left: Math.max(10, rect.right - 208),
      });
    }
    if (showExportMenu && exportRef.current) {
      const rect = exportRef.current.getBoundingClientRect();
      setExportCoords({
        top: rect.bottom + 4,
        left: Math.max(10, rect.right - 192),
      });
    }
    if (showImportMenu && importMenuRef.current) {
      const rect = importMenuRef.current.getBoundingClientRect();
      setImportCoords({
        top: rect.bottom + 4,
        left: Math.max(10, rect.right - 192),
      });
    }
  };

  useEffect(() => {
    updateMenuCoords();
    const handleReposition = () => updateMenuCoords();
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [showTemplateMenu, showExportMenu, showImportMenu]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest(".dropdown-portal")) return;
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const TABLE_COLS = ["ID", "Nama Orang Tua", "NIK", "Nomor Telepon", "Pekerjaan", "Alamat", "Aksi"];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
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
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap justify-end">
          {/* Template Dropdown */}
          <div className="relative" ref={templateRef}>
            <button
              type="button"
              onClick={() => {
                setShowTemplateMenu(!showTemplateMenu);
                setShowExportMenu(false);
                setShowImportMenu(false);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-xs cursor-pointer"
            >
              <span>Template</span>
              <span className={`text-[10px] text-gray-400 transition-transform duration-150 ${showTemplateMenu ? "rotate-180" : ""}`}>▼</span>
            </button>

            {showTemplateMenu &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: templateCoords.top,
                    left: templateCoords.left,
                    width: "13rem",
                  }}
                  className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[9999] dropdown-portal animate-in fade-in zoom-in-95 duration-150"
                >
                  <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Import Baru
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      downloadExcelTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-medium"
                  >
                    Template Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadPdfTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-medium"
                  >
                    Template PDF
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <p className="px-4 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Update Data
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      downloadUpdateOrtuExcelTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer font-medium"
                  >
                    Template Update (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadUpdateOrtuPdfTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 pb-2.5 text-xs sm:text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer font-medium"
                  >
                    Template Update (PDF)
                  </button>
                </div>,
                document.body
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
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-xs cursor-pointer"
            >
              <span>Export</span>
              <span className={`text-[10px] text-gray-400 transition-transform duration-150 ${showExportMenu ? "rotate-180" : ""}`}>▼</span>
            </button>

            {showExportMenu &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: exportCoords.top,
                    left: exportCoords.left,
                    width: "12rem",
                  }}
                  className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[9999] dropdown-portal animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    onClick={() => {
                      exportTableExcel(filteredData);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-medium"
                  >
                    Export Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportTablePdf(filteredData);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-medium"
                  >
                    Export PDF
                  </button>
                </div>,
                document.body
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm cursor-pointer"
            >
              <span>Tambah Orang Tua</span>
              <span className={`text-[10px] text-blue-200 transition-transform duration-150 ${showImportMenu ? "rotate-180" : ""}`}>▼</span>
            </button>

            {showImportMenu &&
              typeof document !== "undefined" &&
              createPortal(
                <div
                  style={{
                    position: "fixed",
                    top: importCoords.top,
                    left: importCoords.left,
                    width: "12.5rem",
                  }}
                  className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[9999] dropdown-portal animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onAddManual();
                      setShowImportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-medium border-b border-gray-50"
                  >
                    Tambah Mandiri
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImportModal();
                      setShowImportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-medium border-b border-gray-50"
                  >
                    Import Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenUpdateModal();
                      setShowImportMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs sm:text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition cursor-pointer font-medium"
                  >
                    Update Excel
                  </button>
                </div>,
                document.body
              )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteOrtu(o)}
                        className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Hapus
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
