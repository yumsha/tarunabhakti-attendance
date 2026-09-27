import React from "react";

export default function SiswaToast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[999] flex items-center justify-between gap-3 bg-white border border-gray-100 shadow-2xl rounded-2xl p-3.5 sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md">
      <div className="flex-1 min-w-0">
        <h4
          className={`text-xs sm:text-sm font-bold ${
            toast.type === "success" ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {toast.type === "success" ? "Berhasil" : "Gagal"}
        </h4>
        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 truncate">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-xs text-gray-400 hover:text-gray-600 font-semibold px-2 py-1 transition-colors cursor-pointer"
        aria-label="Tutup"
      >
        Tutup
      </button>
    </div>
  );
}
