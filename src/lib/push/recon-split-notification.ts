import { formatRand } from "@/lib/utils/currency";
import type { NotificationPayload } from "@/lib/services/notification.service";

export interface FiledExpense {
  id: number;
  /** Full amount of the spend, minor units. */
  amount: number;
}

export interface FiledShare {
  expenseId: number;
  userId: number;
  shareMinor: number;
}

export interface ReconSplitSummary {
  userId: number;
  /** How many of the filed shared spends this person is in. */
  count: number;
  /** Those spends' full amounts, summed. */
  totalMinor: number;
  /** This person's shares across them, summed. */
  shareMinor: number;
}

/**
 * One line per other person for a batch of recon-filed spends: how many they
 * are in, what those came to, and what their share is.
 *
 * A rule run can file twenty rows in one go. Twenty lock-screen pings is spam;
 * one summary is news. The adder is left out (they just did it), as is anyone
 * with no share, and a share that points at an expense outside the batch is
 * ignored rather than counted against a total it is not part of.
 */
export function summariseReconSplits(
  adderUserId: number,
  expenses: FiledExpense[],
  shares: FiledShare[]
): ReconSplitSummary[] {
  const amountById = new Map(expenses.map((e) => [e.id, e.amount]));
  const byUser = new Map<number, ReconSplitSummary>();
  for (const s of shares) {
    if (s.userId === adderUserId || s.shareMinor <= 0) continue;
    const amount = amountById.get(s.expenseId);
    if (amount == null) continue;
    const cur = byUser.get(s.userId) ?? {
      userId: s.userId,
      count: 0,
      totalMinor: 0,
      shareMinor: 0,
    };
    cur.count += 1;
    cur.totalMinor += amount;
    cur.shareMinor += s.shareMinor;
    byUser.set(s.userId, cur);
  }
  return [...byUser.values()].sort((a, b) => a.userId - b.userId);
}

/**
 * The push for one recipient of a recon run. `kind: "split"` is what gets it
 * past the beta push gate in NotificationService.
 */
export function reconSplitsFiledPayload(input: {
  adderName: string;
  summary: ReconSplitSummary;
}): NotificationPayload {
  const { count, totalMinor, shareMinor } = input.summary;
  const noun = count === 1 ? "shared spend" : "shared spends";
  return {
    title: "HomeFinance",
    body: `${input.adderName} filed ${count} ${noun} from the bank (${formatRand(totalMinor)}) — your share is ${formatRand(shareMinor)}`,
    url: "/splits",
    kind: "split",
  };
}
