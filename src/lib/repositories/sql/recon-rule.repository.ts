import { all, run, lastInsertId } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  IReconRuleRepository,
  ReconRuleRow,
  CreateReconRuleInput,
  ReconRuleMatchKind,
} from "../interfaces/recon-rule.repository";

interface Row {
  id: number;
  owner_user_id: number;
  match_kind: string;
  match_value: string;
  category_id: number | null;
  category_name: string | null;
  participant_user_ids: number[] | null;
  times_used: number;
  created_at: string;
}

function toRule(r: Row): ReconRuleRow {
  return {
    id: r.id,
    ownerUserId: r.owner_user_id,
    matchKind: r.match_kind as ReconRuleMatchKind,
    matchValue: r.match_value,
    categoryId: r.category_id,
    categoryName: r.category_name,
    participantUserIds: r.participant_user_ids ?? [],
    timesUsed: r.times_used,
    createdAt: r.created_at,
  };
}

export class ReconRuleRepository implements IReconRuleRepository {
  async findByOwner(ownerUserId: number): Promise<ReconRuleRow[]> {
    const hid = requireHouseholdId();
    const rows = await all<Row>(
      `SELECT r.id, r.owner_user_id, r.match_kind, r.match_value, r.category_id,
              c.name AS category_name, r.participant_user_ids, r.times_used, r.created_at
       FROM recon_rules r
       LEFT JOIN categories c ON c.id = r.category_id AND c.household_id = r.household_id
       WHERE r.household_id = ? AND r.owner_user_id = ?
       ORDER BY r.times_used DESC, r.created_at DESC`,
      [hid, ownerUserId]
    );
    return rows.map(toRule);
  }

  async create(data: CreateReconRuleInput): Promise<{ id: number }> {
    const hid = requireHouseholdId();
    await run(
      `INSERT INTO recon_rules (household_id, owner_user_id, match_kind, match_value, category_id, participant_user_ids)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (household_id, owner_user_id, match_kind, match_value)
       DO UPDATE SET category_id = excluded.category_id, participant_user_ids = excluded.participant_user_ids`,
      [
        hid,
        data.ownerUserId,
        data.matchKind,
        data.matchValue,
        data.categoryId,
        // pg takes an int[] literal; the driver's param binding is typed for
        // scalars, so the array is written in its text form.
        `{${data.participantUserIds.join(",")}}`,
      ]
    );
    return { id: await lastInsertId() };
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM recon_rules WHERE id = ? AND household_id = ? AND owner_user_id = ?", [
      id,
      hid,
      ownerUserId,
    ]);
  }

  async incrementTimesUsed(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    const hid = requireHouseholdId();
    const placeholders = ids.map(() => "?").join(",");
    await run(
      `UPDATE recon_rules SET times_used = times_used + 1 WHERE household_id = ? AND id IN (${placeholders})`,
      [hid, ...ids]
    );
  }
}
