import { formatRand } from "@/lib/utils/currency";

export interface MortgageDeposit {
  userId: number;
  amountMinor: number;
}

export interface MortgageTarget {
  userId: number;
  /** Basis points. 50% is 5000. Integer maths, so two shares always add to 10000. */
  shareBp: number;
}

export interface SolvedShare {
  userId: number;
  monthlyMinor: number;
  /** Where this person's equity actually lands at term end, in basis points. */
  projectedShareBp: number;
}

export interface SolveSharesInput {
  price: number;
  paymentMinor: number;
  termMonths: number;
  annualRateBp: number;
  deposits: MortgageDeposit[];
  targets: MortgageTarget[];
}

export interface SolveSharesResult {
  reachable: boolean;
  shares: SolvedShare[];
  /** The split the given payment and term can actually reach. Set when unreachable. */
  closest?: MortgageTarget[];
  /** Plain-language reasons the target cannot be met. Empty when reachable. */
  blockers: string[];
}

const BP = 10_000;

/**
 * Principal repaid over the whole term at a fixed payment.
 *
 * Deliberately not `simulateMortgage`: that one caps the balance at zero and
 * stops early. Here the payment is an input rather than a solved-for figure, so
 * it can be below the monthly interest — in which case the balance grows and
 * principal repaid is negative. That is a real, and reportable, state of
 * affairs; clamping it to zero would hide it.
 */
function principalRepaidOverTerm(input: {
  loanMinor: number;
  monthlyRate: number;
  paymentMinor: number;
  termMonths: number;
}): number {
  let balance = input.loanMinor;
  for (let m = 0; m < input.termMonths; m++) {
    const interest = balance * input.monthlyRate;
    const principal = input.paymentMinor - interest;
    balance -= principal;
    if (balance <= 0) {
      // Settled inside the term: everything left was repaid, nothing more.
      return input.loanMinor;
    }
  }
  return input.loanMinor - balance;
}

/** Rounds fractional shares to whole cents so they still sum to exactly `total`. */
function roundSharesToTotal(raw: Array<{ userId: number; value: number }>, total: number): Map<number, number> {
  const floored = raw.map((r) => ({ userId: r.userId, whole: Math.floor(r.value), frac: r.value - Math.floor(r.value) }));
  let remainder = total - floored.reduce((s, f) => s + f.whole, 0);
  const order = [...floored].sort((a, b) => b.frac - a.frac || a.userId - b.userId);
  const out = new Map(floored.map((f) => [f.userId, f.whole]));
  let i = 0;
  const step = remainder >= 0 ? 1 : -1;
  remainder = Math.abs(remainder);
  while (remainder > 0 && order.length > 0) {
    const id = order[i % order.length].userId;
    out.set(id, (out.get(id) ?? 0) + step);
    remainder -= 1;
    i += 1;
  }
  return out;
}

/**
 * Given deposits, price, term, rate and a target ownership split, solves for
 * each person's monthly share of the bond payment.
 *
 * Model: at term end a person owns their deposit plus their share of the
 * principal repaid, and contributes to principal in proportion to their share
 * of the monthly payment. That makes the system linear:
 *
 *     deposit_i + (share_i / payment) * principalRepaid = target_i * totalEquity
 *
 * solved for `share_i`. Because the targets sum to one, the solved shares sum
 * to the payment identically — no normalisation fudge.
 *
 * A target that needs someone to pay more than the whole bond, or less than
 * nothing, is reported as unreachable with the reachable split alongside it.
 * It is never clamped silently: telling someone they are on track for an
 * arithmetically impossible split is the failure mode with real consequences.
 */
export function solveMortgageShares(input: SolveSharesInput): SolveSharesResult {
  const depositByUser = new Map(input.deposits.map((d) => [d.userId, d.amountMinor]));
  const userIds = input.targets.map((t) => t.userId);
  const totalDeposits = input.deposits.reduce((s, d) => s + d.amountMinor, 0);
  const loanMinor = input.price - totalDeposits;
  const monthlyRate = input.annualRateBp / BP / 12;

  const principalRepaid = principalRepaidOverTerm({
    loanMinor,
    monthlyRate,
    paymentMinor: input.paymentMinor,
    termMonths: input.termMonths,
  });
  const totalEquity = totalDeposits + principalRepaid;

  const targetBpSum = input.targets.reduce((s, t) => s + t.shareBp, 0) || BP;

  // Degenerate bond: no principal moves, so no monthly share can shift equity.
  // Fall back to the target split of the payment itself.
  if (principalRepaid === 0) {
    const raw = input.targets.map((t) => ({
      userId: t.userId,
      value: (input.paymentMinor * t.shareBp) / targetBpSum,
    }));
    const rounded = roundSharesToTotal(raw, input.paymentMinor);
    return {
      reachable: false,
      shares: userIds.map((id) => ({
        userId: id,
        monthlyMinor: rounded.get(id) ?? 0,
        projectedShareBp: totalEquity === 0 ? 0 : Math.round(((depositByUser.get(id) ?? 0) / totalEquity) * BP),
      })),
      closest: userIds.map((id) => ({
        userId: id,
        shareBp: totalEquity === 0 ? 0 : Math.round(((depositByUser.get(id) ?? 0) / totalEquity) * BP),
      })),
      blockers: [
        `Over ${input.termMonths} months this payment repays none of the bond, so the shares cannot move towards the target.`,
      ],
    };
  }

  const required = input.targets.map((t) => {
    const targetEquity = (totalEquity * t.shareBp) / targetBpSum;
    const deposit = depositByUser.get(t.userId) ?? 0;
    return {
      userId: t.userId,
      shareBp: t.shareBp,
      value: (input.paymentMinor * (targetEquity - deposit)) / principalRepaid,
    };
  });

  const blockers: string[] = [];
  for (const r of required) {
    if (r.value > input.paymentMinor) {
      blockers.push(
        `A ${(r.shareBp / 100).toFixed(0)}% share needs ${formatRand(Math.round(r.value))}/month, not ${formatRand(input.paymentMinor)}.`
      );
    } else if (r.value < 0) {
      blockers.push(
        `A ${(r.shareBp / 100).toFixed(0)}% share is already covered by the ${formatRand(depositByUser.get(r.userId) ?? 0)} deposit, so it would need a payment of less than nothing.`
      );
    }
  }
  const reachable = blockers.length === 0;

  // Unreachable: clamp into range, then re-spread so the shares still add to the
  // payment — the person is going to pay the whole bond either way. What is
  // returned as `closest` is where that clamped split actually lands.
  const usable = reachable
    ? required.map((r) => ({ userId: r.userId, value: r.value }))
    : (() => {
        const clamped = required.map((r) => ({
          userId: r.userId,
          value: Math.max(0, Math.min(input.paymentMinor, r.value)),
        }));
        const sum = clamped.reduce((s, c) => s + c.value, 0);
        if (sum === 0) {
          return clamped.map((c) => ({ userId: c.userId, value: input.paymentMinor / clamped.length }));
        }
        return clamped.map((c) => ({ userId: c.userId, value: (c.value * input.paymentMinor) / sum }));
      })();

  const rounded = roundSharesToTotal(usable, input.paymentMinor);

  const shares: SolvedShare[] = userIds.map((id) => {
    const monthlyMinor = rounded.get(id) ?? 0;
    const equity = (depositByUser.get(id) ?? 0) + (monthlyMinor / input.paymentMinor) * principalRepaid;
    return {
      userId: id,
      monthlyMinor,
      projectedShareBp: totalEquity === 0 ? 0 : Math.round((equity / totalEquity) * BP),
    };
  });

  return {
    reachable,
    shares,
    closest: reachable ? undefined : shares.map((s) => ({ userId: s.userId, shareBp: s.projectedShareBp })),
    blockers,
  };
}
