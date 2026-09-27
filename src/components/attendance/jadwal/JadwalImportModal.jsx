import React from "react";

export default function JadwalImportModal({
  isOpen,
  onClose,
  importFile,
  setImportFile,
  importResult,
  onDownloadTemplate,
  onDownloadUpdateTemplate,
  onImportSubmit,
  isSubmitting,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-base sm:text-lg font-bold text-gray-900">
            {importResult ? "Hasil Import" : "Import Jadwal"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Phase 1: Upload ── */}
        {!importResult && (
          <>
            <div className="p-5 sm:p-6 text-center">
              <div className="mb-4 sm:mb-5 w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-1 sm:mb-2">
                Upload File Jadwal
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 mb-4">
                Pilih file .xlsx sesuai format template yang tersedia.
              </p>

              {/* Download Template Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mb-4 sm:mb-5">
                <button
                  type="button"
                  onClick={onDownloadTemplate}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Template Import
                </button>
                <button
                  type="button"
                  onClick={onDownloadUpdateTemplate}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Template Update
                </button>
              </div>

              {/* Dropzone */}
              <label
                className={`flex flex-col items-center justify-center w-full h-28 sm:h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  importFile
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-gray-200 hover:border-blue-400 bg-gray-50"
                }`}
              >
                <svg className="w-6 h-6 mb-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-xs sm:text-sm font-medium text-gray-700 px-4 text-center truncate max-w-full">
                  {importFile ? importFile.name : "Klik untuk pilih file"}
                </span>
                {!importFile && (
                  <span className="text-[11px] text-gray-400 mt-0.5">XLSX (Maks. 5MB)</span>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </label>
            </div>

            <div className="px-5 sm:px-6 py-4 bg-gray-50 flex items-center justify-end gap-2.5 sm:gap-3 border-t border-gray-100">
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                onClick={onClose}
              >
                Batal
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                onClick={onImportSubmit}
                disabled={!importFile || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  "Mulai Import"
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Phase 2: Result ── */}
        {importResult && (
          <div className="p-5 sm:p-6">
            {/* Summary banner */}
            <div
              className={`rounded-xl p-3.5 sm:p-4 mb-4 sm:mb-5 flex items-start gap-3 ${
                importResult.skipped === 0
                  ? "bg-green-50 border border-green-200"
                  : importResult.created === 0
                  ? "bg-red-50 border border-red-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <div
                className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center ${
                  importResult.skipped === 0
                    ? "bg-green-100 text-green-600"
                    : importResult.created === 0
                    ? "bg-red-100 text-red-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {importResult.skipped === 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : importResult.created === 0 ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              <div>
                <p
                  className={`text-xs sm:text-sm font-bold ${
                    importResult.skipped === 0
                      ? "text-green-800"
                      : importResult.created === 0
                      ? "text-red-800"
                      : "text-yellow-800"
                  }`}
                >
                  {importResult.skipped === 0
                    ? "Semua jadwal berhasil diimport!"
                    : importResult.created === 0
                    ? "Tidak ada jadwal yang berhasil diimport"
                    : "Import selesai dengan beberapa masalah"}
                </p>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  {importResult.created} jadwal ditambahkan · {importResult.skipped} dilewati
                </p>
              </div>
            </div>

            {/* Counter chips */}
            <div className="flex gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-2.5 sm:p-3 text-center">
                <p className="text-xl sm:text-2xl font-black text-green-600">{importResult.created}</p>
                <p className="text-[11px] sm:text-xs text-green-700 font-medium mt-0.5">Berhasil</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-2.5 sm:p-3 text-center">
                <p className="text-xl sm:text-2xl font-black text-red-500">{importResult.skipped}</p>
                <p className="text-[11px] sm:text-xs text-red-600 font-medium mt-0.5">Dilewati</p>
              </div>
            </div>

            {/* Error list */}
            {importResult.errors?.length > 0 && (
              <div>
                <p className="text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Detail baris yang dilewati ({importResult.errors.length})
                </p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {importResult.errors.map((err, i) => (
                    <li key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                      <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-200 text-red-700 text-[10px] font-bold">
                        {err.row}
                      </span>
                      <span className="text-xs text-red-700 leading-snug">{err.pesan}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 sm:mt-6 flex justify-end">
              <button
                type="button"
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md cursor-pointer"
                onClick={onClose}
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
