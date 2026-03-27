import type { ExpenseWithDetails } from "@/lib/types";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";
import type { IExpenseRepository } from "@/lib/repositories/interfaces/expense.repository";
import type { IIncomeRepository } from "@/lib/repositories/interfaces/income.repository";
import { getExpenseRepository, getIncomeRepository } from "@/lib/repositories";

const CSV_HEADER = [
  "kind",
  "id",
  "date",
  "budget_month",
  "amount_cents",
  "amount_major",
  "category",
  "income_type",
  "note",
  "account_id",
  "split_group_id",
  "paid_by_user_id",
  "split_expense_group_id",
  "created_at",
].join(",");

type SortableRow = {
  date: string;
  createdAt: string;
  id: number;
  kind: "expense" | "income";
  cells: string[];
};

export class TransactionExportService {
  constructor(
    private expenseRepo: IExpenseRepository = getExpenseRepository(),
    private incomeRepo: IIncomeRepository = getIncomeRepository()
  ) {}

  async buildCsvForUser(userId: number): Promise<string> {
    const [expenses, incomes] = await Promise.all([
      this.expenseRepo.findAllByUserId(userId),
      this.incomeRepo.findAllByUserId(userId),
    ]);
    const rows: SortableRow[] = [
      ...expenses.map((e) => this.expenseToSortableRow(e)),
      ...incomes.map((i) => this.incomeToSortableRow(i)),
    ];
    rows.sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const byCreated = a.createdAt.localeCompare(b.createdAt);
      if (byCreated !== 0) return byCreated;
      const byKind = a.kind.localeCompare(b.kind);
      if (byKind !== 0) return byKind;
      return a.id - b.id;
    });
    const lines = [CSV_HEADER, ...rows.map((r) => r.cells.join(","))];
    return `\uFEFF${lines.join("\r\n")}\r\n`;
  }

  private expenseToSortableRow(e: ExpenseWithDetails): SortableRow {
    return {
      date: e.date,
      createdAt: e.createdAt,
      id: e.id,
      kind: "expense",
      cells: [
        "expense",
        String(e.id),
        this.escapeCsvField(e.date),
        this.escapeCsvField(e.month),
        String(e.amount),
        this.formatMajor(e.amount),
        this.escapeCsvField(e.categoryName),
        "",
        this.escapeCsvField(e.note ?? ""),
        e.accountId != null ? String(e.accountId) : "",
        this.escapeCsvField(e.splitGroupId ?? ""),
        e.paidByUserId != null ? String(e.paidByUserId) : "",
        e.splitExpenseGroupId != null ? String(e.splitExpenseGroupId) : "",
        this.escapeCsvField(e.createdAt),
      ],
    };
  }

  private incomeToSortableRow(i: IncomeEntry): SortableRow {
    return {
      date: i.date,
      createdAt: i.createdAt,
      id: i.id,
      kind: "income",
      cells: [
        "income",
        String(i.id),
        this.escapeCsvField(i.date),
        this.escapeCsvField(i.month),
        String(i.amount),
        this.formatMajor(i.amount),
        "",
        this.escapeCsvField(i.type),
        this.escapeCsvField(i.description ?? ""),
        i.accountId != null ? String(i.accountId) : "",
        "",
        "",
        "",
        this.escapeCsvField(i.createdAt),
      ],
    };
  }

  private formatMajor(amountCents: number): string {
    return (amountCents / 100).toFixed(2);
  }

  private escapeCsvField(value: string): string {
    if (value === "") return "";
    const mustQuote = /[",\r\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
  }
}
