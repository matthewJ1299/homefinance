import { formatRand } from "@/lib/utils/currency";
import { splitExpense, splitExpenseWithRatios } from "./accounts";

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
 * How a bill is divided.
 *
 * Even is the default because it is what most shared spends are. The other two
 * exist because "we split it 80/20" and "I owe 560, they owe 140" are both
 * things people say, and neither survives being rounded into an even split.
 */
export type SplitMode = "even" | "ratio" | "exact";

/**
 * Shares from proportions -- 80/20, or three ways at 2:1:1.
 *
 * Goes through the ratio splitter rather than multiplying and rounding, so the
 * shares always add to the bill exactly. 80/20 of R700 is R560 and R140; 1/3
 * each of R100 is 34/33/33, not three lots of R33,33 and a lost cent.
 */
export function sharesFromRatios(
  amountMinor: number,
  ratios: Record<number, number>
): ParticipantShare[] {
  const ids = Object.keys(ratios).map(Number);
  if (ids.length === 0) return [];
  const total = ids.reduce((sum, id) => sum + Math.max(0, ratios[id] ?? 0), 0);
  // All zeroes would divide by nothing; fall back to an even split.
  if (total <= 0) return solveShares(amountMinor, ids, {});
  const keyed = splitExpenseWithRatios({
    amount: amountMinor,
    splits: Object.fromEntries(ids.map((id) => [String(id), Math.max(0, ratios[id] ?? 0)])),
  });
  return ids.map((id) => ({ userId: id, shareMinor: keyed[String(id)] ?? 0 }));
}

/**
 * Solves the shares given whatever the user has typed so far.
 *
 * A share the user has set is honoured exactly -- "I owe 560 and they owe 140"
 * has to come out as 560 and 140, not as the nearest the arithmetic felt like.
 * Everyone they have not touched splits what is left, equally and to the cent.
 *
 * When every share is set, the figures are returned untouched even if they do
 * not add up: the sheet shows the gap and refuses to save. Silently absorbing
 * the difference into whichever person was edited last would change a number
 * the user had already decided.
 */
export function solveShares(
  amountMinor: number,
  userIds: number[],
  pinned: Record<number, number> = {}
): ParticipantShare[] {
  if (userIds.length === 0) return [];

  const pinnedIds = userIds.filter((id) => pinned[id] != null);
  const freeIds = userIds.filter((id) => pinned[id] == null);

  if (freeIds.length === 0) {
    return userIds.map((id) => ({ userId: id, shareMinor: Math.max(0, pinned[id] ?? 0) }));
  }

  // Clamp the pinned total: a set of typed shares that already exceeds the
  // amount cannot leave the others owing a negative.
  let pinnedTotal = 0;
  const clampedPins: Record<number, number> = {};
  for (const id of pinnedIds) {
    const value = Math.max(0, Math.min(amountMinor - pinnedTotal, pinned[id] ?? 0));
    clampedPins[id] = value;
    pinnedTotal += value;
  }

  const rest = divideEqually(Math.max(0, amountMinor - pinnedTotal), freeIds);
  return userIds.map((id) => ({
    userId: id,
    shareMinor: pinned[id] != null ? (clampedPins[id] ?? 0) : (rest[id] ?? 0),
  }));
}

/**
 * Single-pin form of {@link solveShares}: the nudged share is honoured and the
 * rest absorb the difference equally, so the total stays pinned.
 */
export function rebalanceAround(
  amountMinor: number,
  participants: ParticipantShare[],
  pinnedUserId: number,
  pinnedShareMinor: number
): ParticipantShare[] {
  const ids = participants.map((p) => p.userId);
  if (!ids.includes(pinnedUserId)) ids.unshift(pinnedUserId);
  const solved = solveShares(amountMinor, ids, { [pinnedUserId]: pinnedShareMinor });
  // Historical ordering: the pinned person first, then the rest as given.
  return [
    solved.find((p) => p.userId === pinnedUserId)!,
    ...solved.filter((p) => p.userId !== pinnedUserId),
  ];
}
