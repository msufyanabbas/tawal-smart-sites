import React from "react";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  // Build a compact page range: first, last, and up to 5 pages around current.
  const pages: (number | "...")[] = [];
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  if (totalPages <= 7) {
    pages.push(...range(1, totalPages));
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    pages.push(...range(start, end));
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase =
    "inline-flex h-9 w-9 items-center justify-center rounded text-sm font-medium transition-colors";
  const btnActive = "bg-brand-600 text-white";
  const btnInactive =
    "text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 px-1 py-3"
    >
      <p className="text-sm text-slate-500">
        Showing page {page} of {totalPages} ({total} total sites)
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={`${btnBase} ${btnInactive}`}
        >
          ‹
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
            >
              {p}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={`${btnBase} ${btnInactive}`}
        >
          ›
        </button>
      </div>
    </nav>
  );
};
