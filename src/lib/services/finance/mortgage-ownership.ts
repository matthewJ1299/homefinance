/**
 * "What I own", the figure the mortgage screen leads with.
 *
 * Deliberately a share of what has been *paid for so far*, not of the whole
 * house: 86% of what's paid for reads as true and moving, where 44% of a
 * barely-started bond reads as stalled — and the second number changes so
 * slowly that the screen looks broken.
 */
export interface OwnershipSlice {
  userId: number;
  userName: string;
  depositMinor: number;
  /** Principal this person has repaid so far. */
  paidOffMinor: number;
  /** deposit + paid off. */
  ownedMinor: number;
  /** ownedMinor over everything paid for so far, in basis points. */
  shareOfPaidBp: number;
}

export interface OwnershipView {
  /** Deposits plus principal repaid: the part of the house that is bought. */
  paidForMinor: number;
  /** What the bank still has a claim on. */
  stillOwedMinor: number;
  slices: OwnershipSlice[];
}

export function calculateOwnership(input: {
  people: Array<{ userId: number; userName: string; depositMinor: number; paymentShare: number }>;
  /** Principal repaid across the whole bond so far. */
  principalRepaidMinor: number;
  currentBalanceMinor: number;
}): OwnershipView {
  const totalDeposits = input.people.reduce((s, p) => s + p.depositMinor, 0);
  const paidForMinor = totalDeposits + Math.max(0, input.principalRepaidMinor);
  const shareSum = input.people.reduce((s, p) => s + p.paymentShare, 0) || 1;

  const slices = input.people.map((p) => {
    // Principal is credited in proportion to what each person pays in, which is
    // the same model the share solver uses. One rule, both screens.
    const paidOffMinor = Math.round(
      (Math.max(0, input.principalRepaidMinor) * p.paymentShare) / shareSum
    );
    const ownedMinor = p.depositMinor + paidOffMinor;
    return {
      userId: p.userId,
      userName: p.userName,
      depositMinor: p.depositMinor,
      paidOffMinor,
      ownedMinor,
      shareOfPaidBp: paidForMinor > 0 ? Math.round((ownedMinor / paidForMinor) * 10_000) : 0,
    };
  });

  return { paidForMinor, stillOwedMinor: Math.max(0, input.currentBalanceMinor), slices };
}
