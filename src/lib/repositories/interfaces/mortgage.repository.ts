export interface MortgageConfigRow {
  id: number;
  propertyValue: number;
  loanAmount: number;
  annualInterestRate: number;
  loanTermMonths: number;
  startDate: string;
  targetEquityUserAPct: number | null;
}

export interface MortgageUserConfigRow {
  userId: number;
  userName: string;
  initialDeposit: number;
  baseSplitPct: number;
  monthlyCap: number | null;
}

export interface MortgagePaymentRow {
  id: number;
  mortgageId: number;
  userId: number;
  paymentDate: string;
  monthNumber: number;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  isExtraPayment: boolean;
  note: string | null;
  createdAt: string;
}

export interface IMortgageRepository {
  getActiveConfig(): Promise<MortgageConfigRow | null>;
  getUserConfigs(mortgageId: number): Promise<MortgageUserConfigRow[]>;
  upsertConfig(data: {
    propertyValue: number;
    loanAmount: number;
    annualInterestRate: number;
    loanTermMonths: number;
    startDate: string;
    targetEquityUserAPct?: number | null;
  }): Promise<MortgageConfigRow>;
  upsertUserConfig(
    mortgageId: number,
    userId: number,
    data: { initialDeposit: number; baseSplitPct: number; monthlyCap?: number | null }
  ): Promise<void>;
  getPayments(mortgageId: number): Promise<MortgagePaymentRow[]>;
  insertPayment(data: {
    mortgageId: number;
    userId: number;
    paymentDate: string;
    monthNumber: number;
    amount: number;
    principalPortion: number;
    interestPortion: number;
    isExtraPayment: boolean;
    note?: string | null;
  }): Promise<number>;
  saveSnapshot(data: {
    mortgageId: number;
    triggerEvent: string;
    triggerPaymentId?: number | null;
    scheduleJson: string;
    projectedPayoffDate: string;
    projectedMonths: number;
    monthlyTopup: number;
    userAFinalEquityPct: number;
    userBFinalEquityPct: number;
  }): Promise<void>;
}
