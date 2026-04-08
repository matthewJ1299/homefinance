export type ReconImportItemStatus =
  | "pending_duplicate"
  | "pending_add"
  | "accepted_duplicate"
  | "accepted_add"
  | "ignored";

export interface ReconImportItemRow {
  id: number;
  userId: number;
  graphMessageId: string;
  status: ReconImportItemStatus;
  parseType: string;
  amount: number;
  txnDate: string;
  vendor: string;
  merchantKeyNormalized: string;
  matchedExpenseIds: number[] | null;
  suggestedCategoryId: number | null;
  rawSubject: string | null;
  rawBodyPreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReconImportItemInput {
  userId: number;
  graphMessageId: string;
  status: ReconImportItemStatus;
  parseType: string;
  amount: number;
  txnDate: string;
  vendor: string;
  merchantKeyNormalized: string;
  matchedExpenseIds: number[] | null;
  suggestedCategoryId: number | null;
  rawSubject: string | null;
  rawBodyPreview: string | null;
}

export interface IReconImportItemRepository {
  upsertByMessageId(input: CreateReconImportItemInput): Promise<{ id: number }>;
  findByIdForUser(id: number, userId: number): Promise<ReconImportItemRow | null>;
  deleteByUserId(userId: number): Promise<void>;
  findPendingByUserId(userId: number): Promise<ReconImportItemRow[]>;
  updateStatusById(id: number, userId: number, status: ReconImportItemStatus): Promise<void>;
}
