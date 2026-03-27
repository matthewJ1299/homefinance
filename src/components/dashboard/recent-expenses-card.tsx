import Link from "next/link";
import type { Category, ExpenseWithDetails } from "@/lib/types";
import { ExpenseList } from "@/components/expenses/expense-list";

export function RecentExpensesCard({
  expenses,
  categories,
  otherUserName,
  title = "Recent expenses",
  seeAllHref = "/expenses",
}: {
  expenses: ExpenseWithDetails[];
  categories: Category[];
  otherUserName?: string;
  title?: string;
  seeAllHref?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <Link
          href={seeAllHref}
          className="text-xs font-medium text-primary hover:underline cursor-pointer"
        >
          See all
        </Link>
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/90 p-3 shadow-sm">
        <ExpenseList expenses={expenses} categories={categories} otherUserName={otherUserName} />
      </div>
    </section>
  );
}

