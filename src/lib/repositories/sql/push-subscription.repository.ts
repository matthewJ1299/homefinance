import { all, get, run, lastInsertId } from "@/lib/db";
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
    await run(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)`,
      [userId, data.endpoint, data.p256dh, data.auth]
    );
    return { id: await lastInsertId() };
  }

  async findByUserId(userId: number): Promise<PushSubscriptionRecord[]> {
    const rows = await all<PushSubscriptionRow>(
      `${SELECT_FIELDS} WHERE user_id = ? ORDER BY id ASC`,
      [userId]
    );
    return rows.map(toRecord);
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    await run("DELETE FROM push_subscriptions WHERE endpoint = ?", [endpoint]);
  }

  async deleteByEndpointAndUserId(endpoint: string, userId: number): Promise<void> {
    await run("DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?", [
      endpoint,
      userId,
    ]);
  }
}
