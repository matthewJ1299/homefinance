export type ReconRuleMatchKind = "merchant_exact" | "merchant_contains";

export interface ReconRuleRow {
  id: number;
  ownerUserId: number;
  matchKind: ReconRuleMatchKind;
  matchValue: string;
  categoryId: number | null;
  categoryName: string | null;
  participantUserIds: number[];
  timesUsed: number;
  createdAt: string;
}

export interface CreateReconRuleInput {
  ownerUserId: number;
  matchKind: ReconRuleMatchKind;
  matchValue: string;
  categoryId: number | null;
  participantUserIds: number[];
}

export interface IReconRuleRepository {
  /** Rules are personal, like the mailbox they come from. */
  findByOwner(ownerUserId: number): Promise<ReconRuleRow[]>;
  create(data: CreateReconRuleInput): Promise<{ id: number }>;
  delete(id: number, ownerUserId: number): Promise<void>;
  incrementTimesUsed(ids: number[]): Promise<void>;
}
