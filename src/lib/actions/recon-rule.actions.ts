"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getReconRuleRepository, getUserRepository } from "@/lib/repositories";
import { ReconService } from "@/lib/services/recon/recon.service";
import { getReconImportItemRepository } from "@/lib/repositories";
import { matchRules } from "@/lib/services/recon/match-rules";
import { divideEqually } from "@/lib/services/finance/participants";
import type { ReconRuleRow } from "@/lib/repositories/interfaces/recon-rule.repository";

export type ReconRuleResult = { success: true } | { success: false; error: string };

/** Rules are personal, so every call is scoped to the caller. */
export async function listReconRules(): Promise<ReconRuleRow[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  setRequestContextFromSession(session);
  return getReconRuleRepository().findByOwner(Number(session.user.id));
}

/**
 * "Do this every time", written from the row you were already accepting. This
 * is the feature that makes Recon beat manual entry on effort rather than
 * matching it.
 */
export async function createReconRule(data: {
  matchKind: "merchant_exact" | "merchant_contains";
  matchValue: string;
  categoryId: number | null;
  /** Explicit list. Omit and pass `splitWithHousehold` to have the server fill it. */
  participantUserIds?: number[];
  /** "Everyone", resolved server-side so the caller need not know the roster. */
  splitWithHousehold?: boolean;
}): Promise<ReconRuleResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);

  const value = data.matchValue.trim();
  if (value === "") return { success: false, error: "A rule needs a merchant to match." };

  const roster = (await getUserRepository().findAll()).map((m) => m.id);
  const members = new Set(roster);
  const participantUserIds = data.participantUserIds
    ?? (data.splitWithHousehold ? roster : [userId]);
  if (participantUserIds.some((id) => !members.has(id))) {
    return { success: false, error: "Someone is not in this household." };
  }

  await getReconRuleRepository().create({
    ownerUserId: userId,
    matchKind: data.matchKind,
    matchValue: value,
    categoryId: data.categoryId,
    participantUserIds,
  });
  revalidatePath("/recon");
  return { success: true };
}

export async function deleteReconRule(id: number): Promise<ReconRuleResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  await getReconRuleRepository().delete(id, Number(session.user.id));
  revalidatePath("/recon");
  return { success: true };
}

/**
 * Accepts every pending row a rule already decided, in one go.
 *
 * Six rows that match a rule deserve one button, not six. Each row still goes
 * through ReconService.acceptAdd, so participants and rollover behave exactly
 * as they would for a row typed by hand.
 */
export async function acceptAllRuleMatched(): Promise<
  { success: true; accepted: number; failed: number } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);

  const [rules, pending] = await Promise.all([
    getReconRuleRepository().findByOwner(userId),
    getReconImportItemRepository().findPendingByUserId(userId),
  ]);
  const { matched } = matchRules(pending, rules);

  const service = new ReconService();
  let accepted = 0;
  let failed = 0;
  const usedRuleIds = new Set<number>();
  for (const { item, rule } of matched) {
    try {
      // The rule knows who was in on it; an even split across those people is
      // what the rule was created from. Passing a boolean here meant "everyone
      // in the house", which is not what the rule said.
      const ids = rule.participantUserIds.length > 0 ? rule.participantUserIds : [userId];
      const even = divideEqually(item.amount, ids);
      await service.acceptAdd(
        userId,
        item.id,
        rule.categoryId ?? undefined,
        null,
        ids.length > 1 ? ids.map((id) => ({ userId: id, shareMinor: even[id] ?? 0 })) : undefined,
        undefined,
        undefined,
        "expense"
      );
      accepted += 1;
      usedRuleIds.add(rule.id);
    } catch {
      // One bad row must not strand the rest; the count reports it instead.
      failed += 1;
    }
  }
  await getReconRuleRepository().incrementTimesUsed([...usedRuleIds]);

  revalidatePath("/recon");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true, accepted, failed };
}
