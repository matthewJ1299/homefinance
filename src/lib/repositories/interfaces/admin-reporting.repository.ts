export interface AdminOverviewCounts {
  households: number;
  users: number;
  accounts: number;
  expenses: number;
  income: number;
  transfers: number;
}

export interface IAdminReportingRepository {
  getOverviewCounts(): Promise<AdminOverviewCounts>;
}

