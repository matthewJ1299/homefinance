import { get } from "@/lib/db";
import type {
  AdminOverviewCounts,
  IAdminReportingRepository,
} from "../interfaces/admin-reporting.repository";

interface CountsRow {
  households: number;
  users: number;
  accounts: number;
  expenses: number;
  income: number;
  transfers: number;
}

export class AdminReportingRepository implements IAdminReportingRepository {
  async getOverviewCounts(): Promise<AdminOverviewCounts> {
    const row = await get<CountsRow>(
      `
      SELECT
        (SELECT COUNT(*)::INTEGER FROM households) AS households,
        (SELECT COUNT(*)::INTEGER FROM users) AS users,
        (SELECT COUNT(*)::INTEGER FROM accounts) AS accounts,
        (SELECT COUNT(*)::INTEGER FROM expenses) AS expenses,
        (SELECT COUNT(*)::INTEGER FROM income) AS income,
        (SELECT COUNT(*)::INTEGER FROM transfers) AS transfers
      `
    );
    if (!row) {
      return { households: 0, users: 0, accounts: 0, expenses: 0, income: 0, transfers: 0 };
    }
    return row;
  }
}

