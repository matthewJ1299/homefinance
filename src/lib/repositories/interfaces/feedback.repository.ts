/** How the person reached the feedback form. */
export const FEEDBACK_SOURCES = ["menu", "error"] as const;
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

export function isFeedbackSource(value: unknown): value is FeedbackSource {
  return typeof value === "string" && (FEEDBACK_SOURCES as readonly string[]).includes(value);
}

export interface CreateFeedbackInput {
  userId: number;
  body: string;
  /** What they were trying to do. Auto-filled from a failure, else typed. */
  attemptedAction?: string | null;
  /** The route they were on. */
  pathname: string;
  /** The failure that prompted this, when there was one. */
  errorMessage?: string | null;
  source: FeedbackSource;
}

export interface FeedbackRow {
  id: number;
  body: string;
  attemptedAction: string | null;
  pathname: string;
  errorMessage: string | null;
  source: FeedbackSource;
  createdAt: string;
  userId: number;
  userName: string;
  userEmail: string;
  householdId: number;
  householdName: string;
}

export interface IFeedbackRepository {
  /** Tenant-scoped: a person files feedback as themselves, in their household. */
  create(input: CreateFeedbackInput): Promise<{ id: number }>;

  /**
   * Every household's feedback, newest first. Deliberately NOT tenant-scoped —
   * this backs the super-admin screen, which is global like the rest of /admin.
   * Guarded by `requireSuperAdmin()` rather than `requireHouseholdId()`.
   */
  listAllForAdmin(limit?: number): Promise<FeedbackRow[]>;

  /** How many arrived after `since`. Null `since` means none has been read yet. */
  countSinceForAdmin(since: string | null): Promise<number>;
}
