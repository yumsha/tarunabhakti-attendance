import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronDown, Check } from "lucide-react";

export default function SearchableKelasSelect({ value, onChange, kelasList = [], disabled = false }) {
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
      const text = `${k.kelas} ${k.jurusan} ${k.tahun?.tahun_ajaran || ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [kelasList, query]);

  const selected = kelasList.find((k) => String(k.id) === String(value));

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2 text-xs sm:text-sm transition " +
          (open ? "border-transparent ring-2 ring-blue-500" : "border-gray-300 hover:border-gray-400") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        <span className={selected ? "text-gray-800 font-medium" : "text-gray-400"}>
          {selected
            ? `${selected.kelas} ${selected.jurusan}${selected.tahun?.tahun_ajaran ? ` (${selected.tahun.tahun_ajaran})` : ""}`
            : "-- Pilih Kelas --"}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="rounded p-0.5 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open ? (
        <div className="absolute z-50 left-0 top-full mt-1.5 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-dropdown">
          <div className="border-b border-gray-100 px-2.5 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
              <svg className="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari kelas, jurusan, atau tahun..."
                className="w-full bg-transparent text-xs sm:text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} className="text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </div>
          <ul className="overflow-y-auto py-1" style={{ maxHeight: "calc(5 * 2.5rem)" }}>
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs sm:text-sm text-gray-400">Kelas tidak ditemukan</li>
            ) : (
              filtered.map((k) => {
                const isSelected = String(k.id) === String(value);
                return (
                  <li
                    key={k.id}
                    onClick={() => {
                      onChange(String(k.id));
                      setOpen(false);
                      setQuery("");
                    }}
                    className={
                      "flex h-10 cursor-pointer items-center justify-between px-3.5 text-xs sm:text-sm transition " +
                      (isSelected ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50")
                    }
                  >
                    <span>
                      <span className="font-medium">{k.kelas} {k.jurusan}</span>
                      {k.tahun?.tahun_ajaran ? (
                        <span className="ml-1.5 text-gray-400 text-xs">({k.tahun.tahun_ajaran})</span>
                      ) : null}
                    </span>
                    {isSelected ? (
                      <Check className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-gray-100 px-3 py-1.5 text-[10px] sm:text-xs text-gray-400">
            {filtered.length} kelas ditampilkan · ketik untuk memfilter
          </div>
        </div>
      ) : null}
    </div>
  );
}
