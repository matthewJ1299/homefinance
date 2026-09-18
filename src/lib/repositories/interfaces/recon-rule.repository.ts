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

export interface ReconRuleWriteFields {
  matchKind: ReconRuleMatchKind;
  matchValue: string;
  categoryId: number;
  participantUserIds: number[];
}

export interface CreateReconRuleInput extends ReconRuleWriteFields {
  ownerUserId: number;
}

export type ReconRuleUpdateResult = "ok" | "missing" | "conflict";

export interface IReconRuleRepository {
  /** Rules are personal, like the mailbox they come from. */
  findByOwner(ownerUserId: number): Promise<ReconRuleRow[]>;
  create(data: CreateReconRuleInput): Promise<{ id: number }>;
  /**
   * Rewrite one rule the caller owns. `conflict` is another of their rules
   * already using that (kind, merchant) pair — we do not merge them, because
   * `times_used` would then mean two different histories.
   */
  update(
    id: number,
    ownerUserId: number,
    data: ReconRuleWriteFields
  ): Promise<ReconRuleUpdateResult>;
  delete(id: number, ownerUserId: number): Promise<void>;
  incrementTimesUsed(ids: number[]): Promise<void>;
}
