import React, { useState, useEffect, useRef, useMemo } from "react";

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Pilih...",
  disabled = false,
  renderLabel = (item) => String(item.label || item.nama || item),
  getSearchText = (item) => String(item.label || item.nama || item),
  activeBlue = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) => getSearchText(item).toLowerCase().includes(q));
  }, [options, query, getSearchText]);

  const selected = options.find((item) => String(item.id || item.value || item) === String(value));

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={
          "flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 sm:px-4 py-2 text-xs sm:text-sm transition " +
          (open
            ? "border-transparent ring-2 ring-blue-500 bg-white"
            : selected && !disabled && activeBlue
            ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
            : "border-gray-200 bg-gray-50 hover:border-gray-300") +
          (disabled ? " cursor-not-allowed opacity-60" : " cursor-pointer")
        }
      >
        <span
          className={
            "truncate " +
            (selected
              ? activeBlue && !disabled
                ? "text-blue-700 font-semibold"
                : "text-gray-800 font-medium"
              : "text-gray-400")
          }
        >
          {selected ? renderLabel(selected) : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className={`rounded p-0.5 ${
                activeBlue
                  ? "text-blue-400 hover:text-blue-600 hover:bg-blue-100"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }`}
              aria-label="Hapus pilihan"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </span>
          ) : null}
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            } ${
              selected && activeBlue && !disabled ? "text-blue-500" : "text-gray-400"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-1.5 w-full z-50 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-dropdown"
        >
          <div className="border-b border-gray-100 px-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari..."
                className="w-full bg-transparent text-xs sm:text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Bersihkan"
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-6 text-center text-xs sm:text-sm text-gray-400">
                Tidak ada data
              </li>
            ) : (
              filtered.map((item) => {
                const itemValue = String(item.id || item.value || item);
                const isSelected = itemValue === String(value);
                return (
                  <li
                    key={itemValue}
                    onClick={() => {
                      onChange(itemValue);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={
                      "flex cursor-pointer items-center justify-between px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm transition " +
                      (isSelected
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50")
                    }
                  >
                    <span className="truncate">{renderLabel(item)}</span>
                    {isSelected ? (
                      <svg
                        className="h-3.5 w-3.5 text-blue-500 shrink-0 ml-2"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
