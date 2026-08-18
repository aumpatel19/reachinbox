import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, limit, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-zinc-100 px-6 py-3">
      <p className="text-xs text-zinc-500">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
