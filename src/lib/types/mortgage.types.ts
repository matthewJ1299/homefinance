export interface AmortisationRow {
  month: number;
  date: string;
  openingBalance: number;
  interest: number;
  principal: number;
  totalPayment: number;
  userAPayment: number;
  userBPayment: number;
  userACumulativeEquityPct: number;
  userBCumulativeEquityPct: number;
  closingBalance: number;
}

export interface ScheduleResult {
  monthlyBasePayment: number;
  monthlyTopUp: number;
  projectedMonths: number;
  projectedPayoffDate: string;
  schedule: AmortisationRow[];
  convergenceAchieved: boolean;
  userAFinalEquityPct: number;
  userBFinalEquityPct: number;
}

export interface MortgageParams {
  loanAmount: number;
  monthlyRate: number;
  termMonths: number;
  propertyValue: number;
  userA: {
    deposit: number;
    baseSplitPct: number;
    monthlyCap: number | null;
  };
  userB: {
    deposit: number;
    baseSplitPct: number;
    monthlyCap: number | null;
  };
}
