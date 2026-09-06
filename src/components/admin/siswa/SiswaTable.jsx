import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Upload,
  Download,
  Search,
  X,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import Pagination from "../../layout/Pagination.jsx";
import {
  downloadExcelTemplate,
  downloadPdfTemplate,
  downloadUpdateExcelTemplate,
  downloadUpdatePdfTemplate,
  exportTableExcel,
  exportTablePdf,
} from "./siswaUtils.js";

function SearchableFilterKelas({ value, onChange, kelasList = [], disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kelasList;
    return kelasList.filter((k) => {
      const label = `${k.kelas ?? ""} ${k.jurusan ?? ""} ${k.tahun?.tahun_ajaran ?? ""}`.toLowerCase();
      return label.includes(q);
    });
  }, [kelasList, query]);

  const selected = kelasList.find((k) => String(k.id) === String(value));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          "flex items-center justify-between gap-2 rounded-xl border bg-gray-50 px-3.5 py-2 text-xs sm:text-sm transition min-w-44 " +
          (open
            ? "border-transparent ring-2 ring-blue-500 bg-white"
            : "border-gray-200 hover:border-gray-300") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        <span className={selected ? "text-gray-800 font-medium" : "text-gray-500"}>
          {selected ? (
            <>
              <span className="font-medium">{selected.kelas} {selected.jurusan ?? ""}</span>
              {selected.tahun?.tahun_ajaran ? (
                <span className="ml-1 text-xs text-gray-400">({selected.tahun.tahun_ajaran})</span>
              ) : null}
            </>
          ) : (
            "Semua Kelas"
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          ) : null}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-dropdown">
          <div className="border-b border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
              <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kelas, jurusan, tahun ajaran..."
                className="w-full bg-transparent text-xs sm:text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <ul className="max-h-60 overflow-y-auto py-1">
            <li
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
              className={
                "flex cursor-pointer items-center justify-between px-3.5 py-2 text-xs sm:text-sm transition " +
                (!value ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-600 hover:bg-gray-50")
              }
            >
              <span>Semua Kelas</span>
              {!value ? <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" /> : null}
            </li>

            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs text-gray-400">Kelas tidak ditemukan</li>
            ) : (
              filtered.map((kls) => {
                const isSelected = String(kls.id) === String(value);
                return (
                  <li
                    key={kls.id}
                    onClick={() => {
                      onChange(String(kls.id));
                      setOpen(false);
                      setQuery("");
                    }}
                    className={
                      "flex cursor-pointer items-center justify-between px-3.5 py-2 text-xs sm:text-sm transition " +
                      (isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50")
                    }
                  >
                    <span>
                      <span className="font-medium">{kls.kelas} {kls.jurusan ?? ""}</span>
                      {kls.tahun?.tahun_ajaran ? (
                        <span className="ml-1.5 text-xs text-gray-400">({kls.tahun.tahun_ajaran})</span>
                      ) : null}
                    </span>
                    {isSelected ? <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" /> : null}
                  </li>
                );
              })
            )}
          </ul>

          <div className="border-t border-gray-100 px-3 py-1.5 text-[10px] text-gray-400">
            {filtered.length} kelas ditampilkan · ketik untuk memfilter
          </div>
        </div>
      )}
    </div>
  );
}

function PageSizeSelect({ value, onChange }) {
  const options = [20, 30, 50];
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt} per hal.
        </option>
      ))}
    </select>
  );
}

export default function SiswaTable({
  loading,
  backgroundLoading,
  pageStudents = [],
  allStudents = [],
  filteredStudents = [],
  currentPageData = [],
  totalRecords = 0,
  kelasList = [],
  selectedKelas,
  onKelasChange,
  searchQuery,
  onSearchChange,
  itemsPerPage,
  onItemsPerPageChange,
  page,
  setPage,
  totalPagesCount,
  onAddManual,
  onOpenImportModal,
  onOpenUpdateModal,
  onEditSiswa,
  onDeleteSiswa,
}) {
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);

  const templateRef = useRef(null);
  const exportRef = useRef(null);
  const importMenuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (templateRef.current && !templateRef.current.contains(e.target)) setShowTemplateMenu(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) setShowImportMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* Toolbar */}
      <div className="relative z-20 p-4 sm:p-5 border-b border-gray-100 flex flex-col gap-4">
        {/* Row 1: Counter Text */}
        <div>
          <p className="text-xs sm:text-sm text-gray-500">
            {loading && !searchQuery.trim() ? (
              <span>Memuat data siswa…</span>
            ) : searchQuery.trim() ? (
              backgroundLoading ? (
                <span>Memuat data pencarian…</span>
              ) : (
                <>
                  <span className="font-semibold text-gray-800">{filteredStudents.length}</span> dari{" "}
                  <span className="font-semibold text-gray-800">{allStudents.length}</span> Siswa ditemukan
                </>
              )
            ) : (
              <>
                <span className="font-semibold text-gray-800">{pageStudents.length}</span> dari{" "}
                <span className="font-semibold text-gray-800">{totalRecords}</span> Siswa terdaftar
              </>
            )}
          </p>
        </div>

        {/* Row 2: Search, Filter, Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          {/* Left: Search, Filter Kelas, Page Size */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 sm:flex-initial sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari nama, NISN, NIPD, atau orang tua..."
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <SearchableFilterKelas
              value={selectedKelas}
              onChange={onKelasChange}
              kelasList={kelasList}
            />

            <PageSizeSelect value={itemsPerPage} onChange={onItemsPerPageChange} />
          </div>

          {/* Right: Actions (Template, Export, Tambah Siswa) */}
          <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
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
                <Download className="w-3.5 h-3.5 text-gray-500" />
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
                    className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Template Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadPdfTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-red-50/80 hover:text-red-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Template PDF</span>
                  </button>
                  <div className="border-t border-gray-100 my-1 mx-1" />
                  <p className="px-3 pt-1 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Update Data
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      downloadUpdateExcelTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Template Update (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadUpdatePdfTemplate();
                      setShowTemplateMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 pb-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Template Update (PDF)</span>
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
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export Data</span>
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
                      exportTableExcel(filteredStudents);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-emerald-50/80 hover:text-emerald-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportTablePdf(filteredStudents);
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm text-gray-700 rounded-xl hover:bg-red-50/80 hover:text-red-700 transition cursor-pointer font-medium active:scale-[0.98] flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Export PDF</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tambah Siswa Dropdown */}
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
                <span>Tambah Siswa</span>
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
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto rounded-b-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/75 border-b border-gray-100">
              {["Nama", "Kelas", "NIPD", "NISN", "NIK", "Tempat Lahir", "Gender", "Agama", "Orang Tua", "Aksi"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 sm:px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={10} className="px-6 py-4">
                    <div className="h-4 bg-gray-100 rounded-lg" />
                  </td>
                </tr>
              ))
            ) : currentPageData.length > 0 ? (
              currentPageData.map((s) => (
                <tr key={s.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-semibold text-gray-800">
                    {s.nama}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                    {s.kelas ? `${s.kelas.kelas} ${s.kelas.jurusan ?? ""}`.trim() : "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600 font-mono">
                    {s.NIPD || s.nipd || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600 font-mono">
                    {s.NISN || s.nisn || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600 font-mono">
                    {s.NIK || s.nik || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600">
                    {s.tempat_lahir || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600">
                    {s.jenis_kelamin || s.gender || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600">
                    {s.agama || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-gray-600">
                    {s.orang_tua?.nama_orangtua || "—"}
                  </td>
                  <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditSiswa(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition shadow-2xs cursor-pointer"
                        title="Edit siswa"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-500" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteSiswa(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 active:scale-[0.98] transition shadow-2xs cursor-pointer"
                        title="Hapus siswa"
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
                <td colSpan={10} className="px-6 py-12 text-center text-xs sm:text-sm text-gray-400">
                  {searchQuery || selectedKelas
                    ? "Tidak ada data yang sesuai dengan filter."
                    : "Tidak ada data siswa."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPagesCount}
        onPageChange={setPage}
        summary={`Halaman ${page} dari ${totalPagesCount} (Menampilkan ${currentPageData.length} dari ${
          searchQuery.trim() ? filteredStudents.length : totalRecords
        } data)`}
      />
    </div>
  );
}
