import React from "react";

export default function JadwalDeleteModal({
  isOpen,
  selectedJadwal,
  onCancel,
  onConfirm,
  isSubmitting,
}) {
  if (!isOpen || !selectedJadwal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 sm:p-6 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Hapus Jadwal?</h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed">
            Hapus jadwal <strong className="text-gray-800">{selectedJadwal?.mata_pelajaran?.nama_mapel}</strong> untuk kelas{" "}
            <strong className="text-gray-800">
              {selectedJadwal?.kelas?.kelas} {selectedJadwal?.kelas?.jurusan}
            </strong>{" "}
            pada hari <strong className="text-gray-800">{selectedJadwal?.hari}</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition font-medium cursor-pointer"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-red-700 transition-all shadow-md shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              onClick={onConfirm}
              disabled={isSubmitting}
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
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
