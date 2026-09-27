import { ChevronLeft, ChevronRight } from "lucide-react";

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const prev = sorted[index - 1];

    if (index > 0 && page - prev > 1) {
      items.push(`ellipsis-${prev}-${page}`);
    }

    items.push(page);
  }

  return items;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  summary,
  className = "",
}) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);

  const baseButtonClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border text-sm font-medium transition";

  return (
    <div className={`flex flex-col gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className="text-xs text-gray-500">{summary}</p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`${baseButtonClass} w-9 border-gray-200 text-gray-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {items.map((item) =>
          typeof item === "string" ? (
            <span
              key={item}
              className="inline-flex h-9 min-w-9 items-center justify-center text-sm text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === page ? "page" : undefined}
              className={
                item === page
                  ? `${baseButtonClass} border-blue-600 bg-blue-600 px-3 text-white shadow-sm`
                  : `${baseButtonClass} border-gray-200 bg-white px-3 text-gray-600 hover:border-blue-200 hover:text-blue-600`
              }
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`${baseButtonClass} w-9 border-gray-200 text-gray-500 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
