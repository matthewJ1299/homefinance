import type { ReconImportItemRow } from "@/lib/repositories/interfaces/recon-import-item.repository";

export interface ReconMatchedExpenseSummary {
  id: number;
  categoryName: string;
  amount: number;
  note: string | null;
  date: string;
}

export type ReconPendingListItem = ReconImportItemRow & {
  matchedExpenses: ReconMatchedExpenseSummary[];
};
