import React, { useState, useEffect } from "react";
import { BookOpen, X, Loader2, AlertTriangle } from "lucide-react";

const inputClass =
  "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm " +
  "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition";

export default function MapelFormModal({ isOpen, onClose, onSubmit, editMapel, loading }) {
  const [namaMapel, setNamaMapel] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setNamaMapel(editMapel?.nama_mapel ?? "");
    setError("");
  }, [editMapel, isOpen]);

  const handleClose = () => {
    if (loading) return;
    setNamaMapel("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmed = namaMapel.trim();
    if (!trimmed) {
      setError("Nama mata pelajaran wajib diisi");
      return;
    }
    try {
      await onSubmit(trimmed);
      handleClose();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <BookOpen className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-gray-800">
              {editMapel ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran Baru"}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
              Nama Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <input
              id="nama-mapel-input"
              value={namaMapel}
              onChange={(e) => setNamaMapel(e.target.value)}
              placeholder="Contoh: Matematika, Bahasa Indonesia, IPA..."
              className={inputClass}
              disabled={loading}
              autoFocus
              maxLength={100}
            />
            <p className="text-[11px] sm:text-xs text-gray-400 mt-1.5">
              Maksimal 100 karakter.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition font-medium"
            >
              Batal
            </button>
            <button
              id="submit-mapel-btn"
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition font-medium shadow-sm cursor-pointer"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editMapel ? "Simpan Perubahan" : "Tambah Mapel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
