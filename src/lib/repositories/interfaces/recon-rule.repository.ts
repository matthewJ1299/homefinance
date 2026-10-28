export type ReconRuleMatchKind = "merchant_exact" | "merchant_contains";

/** What a rule does with a matching transaction. */
export type ReconRuleAction = "file" | "ignore";

export interface ReconRuleRow {
  id: number;
  ownerUserId: number;
  matchKind: ReconRuleMatchKind;
  matchValue: string;
  /** 'file' places the transaction (needs a category); 'ignore' marks it ignored. */
  action: ReconRuleAction;
  categoryId: number | null;
  categoryName: string | null;
  participantUserIds: number[];
  timesUsed: number;
  createdAt: string;
}

export interface ReconRuleWriteFields {
  matchKind: ReconRuleMatchKind;
  matchValue: string;
  action: ReconRuleAction;
  /** Null for ignore rules; required for file rules (enforced in the service). */
  categoryId: number | null;
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
