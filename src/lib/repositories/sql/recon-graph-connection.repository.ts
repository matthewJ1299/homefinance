import { get, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  IReconGraphConnectionRepository,
  ReconGraphConnectionRow,
} from "../interfaces/recon-graph-connection.repository";

interface Row {
  user_id: number;
  refresh_token_encrypted: string;
  ms_account_email: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(r: Row): ReconGraphConnectionRow {
  return {
    userId: r.user_id,
    refreshTokenEncrypted: r.refresh_token_encrypted,
    msAccountEmail: r.ms_account_email,
    lastSyncedAt: r.last_synced_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class ReconGraphConnectionRepository implements IReconGraphConnectionRepository {
  async upsert(userId: number, refreshTokenEncrypted: string, msAccountEmail: string | null): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO recon_graph_connections (user_id, refresh_token_encrypted, ms_account_email, updated_at, household_id)
       VALUES (?, ?, ?, NOW(), ?)
       ON CONFLICT (user_id) DO UPDATE SET
         refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
         ms_account_email = EXCLUDED.ms_account_email,
         household_id = EXCLUDED.household_id,
         updated_at = NOW()`,
      [userId, refreshTokenEncrypted, msAccountEmail, hid]
    );
  }

  async findByUserId(userId: number): Promise<ReconGraphConnectionRow | null> {
    const hid = requireHouseholdId();
    const row = await get<Row>(
      `SELECT user_id, refresh_token_encrypted, ms_account_email, last_synced_at, created_at, updated_at
       FROM recon_graph_connections WHERE user_id = ? AND household_id = ?`,
      [userId, hid]
    );
    return row ? mapRow(row) : null;
  }

  async deleteByUserId(userId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM recon_graph_connections WHERE user_id = ? AND household_id = ?", [userId, hid]);
  }

  async setLastSyncedAt(userId: number, lastSyncedAt: Date): Promise<void> {
    const hid = requireHouseholdId();
    await run(
      "UPDATE recon_graph_connections SET last_synced_at = ?, updated_at = NOW() WHERE user_id = ? AND household_id = ?",
      [lastSyncedAt.toISOString(), userId, hid]
    );
  }
}
