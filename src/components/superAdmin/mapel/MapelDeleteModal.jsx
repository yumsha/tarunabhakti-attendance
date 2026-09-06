import React from "react";
import { Trash2, BookOpen, Loader2 } from "lucide-react";

export default function MapelDeleteModal({ isOpen, mapel, onConfirm, onCancel, loading }) {
  if (!isOpen || !mapel) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity"
        onClick={!loading ? onCancel : undefined}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 sm:p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-base">Hapus Mata Pelajaran</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Aksi ini tidak bisa dibatalkan.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-gray-800 truncate">{mapel.nama_mapel}</span>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 mb-6 leading-relaxed">
          Yakin ingin menghapus mata pelajaran ini? Mapel yang masih digunakan di jadwal tidak dapat dihapus.
        </p>

        <div className="flex items-center justify-end gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
