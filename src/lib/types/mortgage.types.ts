export interface AmortisationRow {
  month: number;
  date: string;
  openingBalance: number;
  interest: number;
  principal: number;
  totalPayment: number;
  /** This month's payment per person. Sums to `totalPayment`. */
  paymentByUserId: Record<number, number>;
  /** Share of everything contributed so far, per person. Sums to 1. */
  equityPctByUserId: Record<number, number>;
  closingBalance: number;
}

export interface ScheduleResult {
  monthlyBasePayment: number;
  monthlyTopUp: number;
  projectedMonths: number;
  projectedPayoffDate: string;
  schedule: AmortisationRow[];
  convergenceAchieved: boolean;
  /** Final share of the home per person. Sums to 1. */
  finalEquityPctByUserId: Record<number, number>;
  /** Balance after last actual payment, or loan amount when no payments yet. */
  currentBalance: number;
}

export interface MortgagePerson {
  userId: number;
  deposit: number;
  baseSplitPct: number;
  monthlyCap: number | null;
}

export interface MortgageParams {
  loanAmount: number;
  monthlyRate: number;
  termMonths: number;
  propertyValue: number;
  /**
   * Everyone on the bond, any number of them.
   *
   * One person carries the remainder: everyone else pays their own base (their
   * share of the payment, capped), and whatever is left of the month's payment
   * is theirs. That role goes to the largest `baseSplitPct`, which is exactly
   * what `userA` was when this modelled two people by name.
   */
  people: MortgagePerson[];
}

/** The person who covers whatever the others' bases do not. */
export function primaryPerson(people: MortgagePerson[]): MortgagePerson {
  if (people.length === 0) throw new Error("A mortgage needs at least one person");
  return people.reduce((best, p) => (p.baseSplitPct > best.baseSplitPct ? p : best), people[0]);
}
