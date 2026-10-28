import { all, get, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId, requireSuperAdmin } from "@/lib/db/request-context";
import { coerceBigInt } from "@/lib/db/coerce-bigint";
import type {
  CreateFeedbackInput,
  FeedbackRow,
  FeedbackSource,
  IFeedbackRepository,
} from "../interfaces/feedback.repository";

interface Row {
  id: number;
  body: string;
  attempted_action: string | null;
  pathname: string;
  error_message: string | null;
  source: string;
  created_at: string;
  user_id: number;
  user_name: string;
  user_email: string;
  household_id: number;
  household_name: string;
}

const SELECT_ROWS = `
  SELECT f.id, f.body, f.attempted_action, f.pathname, f.error_message, f.source, f.created_at,
         f.user_id, u.name AS user_name, u.email AS user_email,
         f.household_id, h.name AS household_name
    FROM feedback f
    INNER JOIN users u ON u.id = f.user_id
    INNER JOIN households h ON h.id = f.household_id
`;

function toRow(r: Row): FeedbackRow {
  return {
    id: coerceBigInt(r.id),
    body: r.body,
    attemptedAction: r.attempted_action,
    pathname: r.pathname,
    errorMessage: r.error_message,
    source: r.source as FeedbackSource,
    createdAt: r.created_at,
    userId: coerceBigInt(r.user_id),
    userName: r.user_name,
    userEmail: r.user_email,
    householdId: coerceBigInt(r.household_id),
    householdName: r.household_name,
  };
}

export class FeedbackRepository implements IFeedbackRepository {
  async create(input: CreateFeedbackInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO feedback
         (household_id, user_id, body, attempted_action, pathname, error_message, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        hid,
        input.userId,
        input.body,
        input.attemptedAction ?? null,
        input.pathname,
        input.errorMessage ?? null,
        input.source,
      ]
    );
    return { id: await lastInsertId() };
  }

  async listAllForAdmin(limit = 200): Promise<FeedbackRow[]> {
    // Global on purpose — /admin is a super-admin surface across households, so
    // this asks for that privilege instead of a household scope.
    requireSuperAdmin();
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit)));
    const rows = await all<Row>(`${SELECT_ROWS} ORDER BY f.created_at DESC, f.id DESC LIMIT ?`, [
      safeLimit,
    ]);
    return rows.map(toRow);
  }

  async countSinceForAdmin(since: string | null): Promise<number> {
    requireSuperAdmin();
    if (since == null) {
      const row = await get<{ c: string | number }>("SELECT COUNT(*) AS c FROM feedback");
      return coerceBigInt(row?.c);
    }
    const row = await get<{ c: string | number }>(
      "SELECT COUNT(*) AS c FROM feedback WHERE created_at > ?",
      [since]
    );
    return coerceBigInt(row?.c);
  }
}
