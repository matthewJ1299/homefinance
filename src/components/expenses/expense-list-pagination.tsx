"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const paginationButtonClass =
  "inline-flex items-center justify-center rounded-md font-medium h-9 px-3 border border-input bg-background hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

interface ExpenseListPaginationProps {
  month: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

export function ExpenseListPagination({
  month,
  page,
  totalPages,
  total,
  pageSize,
}: ExpenseListPaginationProps) {
  if (total === 0 || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const baseHref = `/dashboard?month=${encodeURIComponent(month)}`;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t"
      aria-label="Expense list pagination"
    >
      <p className="text-sm text-muted-foreground">
        {start}&ndash;{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={page <= 1 ? "#" : `${baseHref}&page=${page - 1}`}
          className={cn(paginationButtonClass, page <= 1 && "opacity-50 pointer-events-none")}
          aria-disabled={page <= 1}
        >
          Previous
        </Link>
        <span className="text-sm text-muted-foreground px-1">
          Page {page} of {totalPages}
        </span>
        <Link
          href={page >= totalPages ? "#" : `${baseHref}&page=${page + 1}`}
          className={cn(paginationButtonClass, page >= totalPages && "opacity-50 pointer-events-none")}
          aria-disabled={page >= totalPages}
        >
          Next
        </Link>
      </div>
    </nav>
  );
}
