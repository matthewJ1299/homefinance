"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

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
        <Button variant="outline" size="sm" asChild disabled={page <= 1}>
          <Link href={page <= 1 ? "#" : `${baseHref}&page=${page - 1}`}>
            Previous
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground px-1">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={page >= totalPages}
        >
          <Link
            href={page >= totalPages ? "#" : `${baseHref}&page=${page + 1}`}
          >
            Next
          </Link>
        </Button>
      </div>
    </nav>
  );
}
