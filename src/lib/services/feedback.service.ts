import { getFeedbackRepository, getUserRepository } from "@/lib/repositories";
import type {
  FeedbackRow,
  FeedbackSource,
} from "@/lib/repositories/interfaces/feedback.repository";

/** What the admin screen needs in one call. */
export interface FeedbackInbox {
  items: FeedbackRow[];
  /** Arrived since this admin last opened the screen. */
  unreadCount: number;
}

export class FeedbackService {
  constructor(
    private repo = getFeedbackRepository(),
    private userRepo = getUserRepository()
  ) {}

  async submit(input: {
    userId: number;
    body: string;
    attemptedAction?: string | null;
    pathname: string;
    errorMessage?: string | null;
    source: FeedbackSource;
  }): Promise<{ id: number }> {
    return this.repo.create({
      userId: input.userId,
      // Trimmed here so the NOT-EMPTY check in the schema and the validator
      // agree on what "empty" means.
      body: input.body.trim(),
      attemptedAction: input.attemptedAction?.trim() || null,
      pathname: input.pathname,
      errorMessage: input.errorMessage?.trim() || null,
      source: input.source,
    });
  }

  /** Unread count only — for the nav badge, which renders on every page. */
  async unreadCountFor(adminUserId: number): Promise<number> {
    const since = await this.userRepo.getFeedbackLastSeenAt(adminUserId);
    return this.repo.countSinceForAdmin(since);
  }

  /**
   * The list, plus how many of it is new to this admin.
   *
   * The count is read BEFORE the marker is moved, so the screen can say "3 new"
   * on the visit that clears them rather than on the visit after.
   */
  async openInbox(adminUserId: number): Promise<FeedbackInbox> {
    const since = await this.userRepo.getFeedbackLastSeenAt(adminUserId);
    const [items, unreadCount] = await Promise.all([
      this.repo.listAllForAdmin(),
      this.repo.countSinceForAdmin(since),
    ]);
    await this.userRepo.markFeedbackSeen(adminUserId);
    return { items, unreadCount };
  }
}
