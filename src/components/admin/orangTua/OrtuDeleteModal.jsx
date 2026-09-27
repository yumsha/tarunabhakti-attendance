import React, { useState } from "react";
import { orangTua } from "../../../lib/backendApi";

export default function OrtuDeleteModal({ ortu, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!ortu) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const result = await orangTua.delete(ortu.id);
      if (result?.success) {
        onDeleted();
      } else {
        setError(result?.message || "Gagal menghapus data orang tua");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-red-600 px-5 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base sm:text-lg">Hapus Data Orang Tua</h2>
            <p className="text-red-100 text-xs mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-red-200 hover:text-white transition-colors text-sm font-semibold cursor-pointer"
          >
            Tutup
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl space-y-1">
            <p className="text-xs sm:text-sm font-semibold text-gray-800">
              Yakin ingin menghapus data orang tua ini?
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{ortu.nama_orangtua}</span>
              {ortu.NIK && <span className="text-gray-400"> (NIK: {ortu.NIK})</span>}
            </p>
            <p className="text-[11px] text-red-600 font-medium pt-1">
              Catatan: Data tidak bisa dihapus jika masih terkait dengan siswa.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2.5 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md shadow-red-200 cursor-pointer"
            >
              {deleting ? "Menghapus..." : "Hapus Orang Tua"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
