import {
  getCategoryRepository,
  getReconRuleRepository,
  getUserRepository,
} from "@/lib/repositories";
import type {
  ReconRuleWriteFields,
  ReconRuleMatchKind,
} from "@/lib/repositories/interfaces/recon-rule.repository";
import { normalizeMerchantKey } from "@/lib/services/recon/parsers/parse-helpers";

export type RuleWriteResult = { ok: true } | { ok: false; error: string };

/**
 * Personal merchant rules: what to match, which category, who splits.
 *
 * Kept off ReconService so mailbox sync and accept do not grow another job.
 * Create from an accept is an upsert on (kind, merchant); edit is an UPDATE
 * of one row, and will not silently merge into a different rule.
 */
export class ReconRuleService {
  constructor(
    private rules = getReconRuleRepository(),
    private users = getUserRepository(),
    private categories = getCategoryRepository()
  ) {}

  async create(
    userId: number,
    input: {
      matchKind: ReconRuleMatchKind;
      matchValue: string;
      categoryId: number;
      participantUserIds: number[];
    }
  ): Promise<RuleWriteResult> {
    const prepared = await this.prepareWrite(userId, input);
    if (!prepared.ok) return prepared;
    await this.rules.create({ ownerUserId: userId, ...prepared.data });
    return { ok: true };
  }

  async update(
    userId: number,
    id: number,
    input: {
      matchKind: ReconRuleMatchKind;
      matchValue: string;
      categoryId: number;
      participantUserIds: number[];
    }
  ): Promise<RuleWriteResult> {
    const prepared = await this.prepareWrite(userId, input);
    if (!prepared.ok) return prepared;
    const result = await this.rules.update(id, userId, prepared.data);
    if (result === "missing") return { ok: false, error: "That rule is gone." };
    if (result === "conflict") {
      return { ok: false, error: "You already have a rule for that merchant." };
    }
    return { ok: true };
  }

  async delete(userId: number, id: number): Promise<RuleWriteResult> {
    await this.rules.delete(id, userId);
    return { ok: true };
  }

  /**
   * Normalise the merchant the same way accept-from-mail does, keep the owner
   * in the split (accept always files as them), and refuse a contains needle
   * so short it would match half the inbox.
   */
  private async prepareWrite(
    userId: number,
    input: {
      matchKind: ReconRuleMatchKind;
      matchValue: string;
      categoryId: number;
      participantUserIds: number[];
    }
  ): Promise<{ ok: true; data: ReconRuleWriteFields } | { ok: false; error: string }> {
    const matchValue = normalizeMerchantKey(input.matchValue);
    if (matchValue === "") {
      return { ok: false, error: "A rule needs a merchant to match." };
    }
    if (input.matchKind === "merchant_contains" && matchValue.length < 2) {
      return { ok: false, error: "A contains rule needs at least two characters." };
    }

    const category = await this.categories.findById(input.categoryId);
    if (!category) return { ok: false, error: "Pick a category." };

    const roster = await this.users.findAll();
    const memberIds = new Set(roster.map((m) => m.id));
    const participantUserIds = uniqueIds([userId, ...input.participantUserIds]);
    if (participantUserIds.some((id) => !memberIds.has(id))) {
      return { ok: false, error: "Someone is not in this household." };
    }

    return {
      ok: true,
      data: {
        matchKind: input.matchKind,
        matchValue,
        categoryId: category.id,
        participantUserIds,
      },
    };
  }
}

function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids)];
}
