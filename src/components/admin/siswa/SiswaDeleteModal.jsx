import React, { useState } from "react";
import { AlertCircle, XCircle } from "lucide-react";
import { siswa } from "../../../lib/backendApi";

export default function SiswaDeleteModal({ student, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!student) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const result = await siswa.delete(student.id);
      if (result?.success) {
        onDeleted();
      } else {
        setError(result?.message || "Gagal menghapus siswa");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">Hapus Data Siswa</h2>
            <p className="text-red-200 text-xs mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
          </div>
          <button onClick={onClose} disabled={deleting} className="text-red-200 hover:text-white transition-colors cursor-pointer">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
            <span className="text-red-500 mt-0.5 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Yakin ingin menghapus siswa ini?</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">{student.nama}</span>
                {(student.NISN || student.nisn) && (
                  <span className="text-gray-400"> · NISN: {student.NISN || student.nisn}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">Data akan dinonaktifkan (soft delete) dan tidak muncul di daftar.</p>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-xs sm:text-sm font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {deleting ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Menghapus...</span>
                </>
              ) : (
                "Hapus Siswa"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
