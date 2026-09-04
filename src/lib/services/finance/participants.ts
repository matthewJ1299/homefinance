import { formatRand } from "@/lib/utils/currency";
import { splitExpense } from "./accounts";

export interface ParticipantShare {
  userId: number;
  shareMinor: number;
}

/**
 * Divides `amountMinor` equally among `userIds`, giving the remainder cents to
 * the earliest ids so the result is deterministic and always sums exactly.
 */
export function divideEqually(amountMinor: number, userIds: number[]): Record<number, number> {
  if (userIds.length === 0) return {};
  const keyed = splitExpense({ amount: amountMinor, users: userIds.map(String) });
  const out: Record<number, number> = {};
  for (const id of userIds) out[id] = keyed[String(id)] ?? 0;
  return out;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateParticipantShares(
  amountMinor: number,
  participants: ParticipantShare[],
  payerUserId?: number
): ValidationResult {
  if (participants.length === 0) {
    return { ok: false, error: "Pick at least one person" };
  }
  const ids = new Set(participants.map((p) => p.userId));
  if (ids.size !== participants.length) {
    return { ok: false, error: "Someone is listed twice" };
  }
  if (payerUserId != null && !ids.has(payerUserId)) {
    return { ok: false, error: "The payer must be one of the participants" };
  }
  if (participants.some((p) => p.shareMinor < 0)) {
    return { ok: false, error: "A share cannot be negative" };
  }
  const sum = participants.reduce((s, p) => s + p.shareMinor, 0);
  if (sum !== amountMinor) {
    return { ok: false, error: `Shares add up to ${formatRand(sum)}, not ${formatRand(amountMinor)}` };
  }
  return { ok: true };
}

/**
 * Rebalances after the user nudges one share: the nudged share is honoured and
 * the rest absorb the difference equally, so the total stays pinned.
 */
export function rebalanceAround(
  amountMinor: number,
  participants: ParticipantShare[],
  pinnedUserId: number,
  pinnedShareMinor: number
): ParticipantShare[] {
  const others = participants.filter((p) => p.userId !== pinnedUserId);
  if (others.length === 0) return [{ userId: pinnedUserId, shareMinor: amountMinor }];
  const clamped = Math.max(0, Math.min(amountMinor, pinnedShareMinor));
  const rest = divideEqually(amountMinor - clamped, others.map((o) => o.userId));
  return [
    { userId: pinnedUserId, shareMinor: clamped },
    ...others.map((o) => ({ userId: o.userId, shareMinor: rest[o.userId] ?? 0 })),
  ];
}
