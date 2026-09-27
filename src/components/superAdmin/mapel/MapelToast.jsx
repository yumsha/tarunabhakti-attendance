import React, { useEffect } from "react";
import { BookOpen, AlertTriangle, X } from "lucide-react";

export default function MapelToast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-emerald-50 border-emerald-200 text-emerald-700";

  return (
    <div
      className={`fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-50 flex items-center justify-between gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium max-w-md ${styles} animate-in fade-in slide-in-from-bottom-2 duration-200`}
      role="alert"
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {type === "error" ? (
          <AlertTriangle className="w-4 h-4 shrink-0" />
        ) : (
          <BookOpen className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 opacity-60 hover:opacity-100 transition-opacity rounded-lg"
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
