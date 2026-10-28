import { all, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type { PushSubscriptionRecord } from "../interfaces/push-subscription.repository";
import type {
  IPushSubscriptionRepository,
  CreatePushSubscriptionInput,
} from "../interfaces/push-subscription.repository";

const SELECT_FIELDS = `
  SELECT id, user_id AS "userId", endpoint, p256dh, auth, created_at AS "createdAt"
  FROM push_subscriptions
`;

interface PushSubscriptionRow {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

function toRecord(r: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: r.id,
    userId: r.userId,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    createdAt: r.createdAt,
  };
}

export class PushSubscriptionRepository implements IPushSubscriptionRepository {
  async create(userId: number, data: CreatePushSubscriptionInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, household_id) VALUES (?, ?, ?, ?, ?)`,
      [userId, data.endpoint, data.p256dh, data.auth, hid]
    );
    return { id: await lastInsertId() };
  }

  async findByUserId(userId: number): Promise<PushSubscriptionRecord[]> {
    const hid = requireHouseholdId();
    const rows = await all<PushSubscriptionRow>(
      `${SELECT_FIELDS} WHERE user_id = ? AND household_id = ? ORDER BY id ASC`,
      [userId, hid]
    );
    return rows.map(toRecord);
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM push_subscriptions WHERE endpoint = ? AND household_id = ?", [endpoint, hid]);
  }

  async deleteByEndpointAndUserId(endpoint: string, userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ? AND household_id = ?", [
      endpoint,
      userId,
      hid,
    ]);
  }
}
