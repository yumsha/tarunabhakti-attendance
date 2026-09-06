import React from "react";

export default function JadwalToast({ notification }) {
  if (!notification) return null;

  const isSuccess = notification.type === "success";
  const isError = notification.type === "error";

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 left-4 sm:left-auto z-[100] max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div
        className={`px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-white ${
          isSuccess
            ? "bg-emerald-600"
            : isError
            ? "bg-red-600"
            : "bg-blue-600"
        }`}
      >
        {isSuccess ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : isError ? (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="font-semibold text-xs sm:text-sm leading-tight">{notification.message}</span>
      </div>
    </div>
  );
}
