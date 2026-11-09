import {
  getAccountRepository,
  getAccountTransactionRepository,
  getCategoryRepository,
  getExpenseParticipantRepository,
  getExpenseRepository,
  getHouseholdRepository,
  getIncomeRepository,
  getSplitSettlementRepository,
  getTransferRepository,
  getUserRepository,
} from "@/lib/repositories";
import {
  budgetMonthStartDayForUser,
  getDefaultBudgetMonthForUser,
} from "@/lib/utils/budget-month-for-user";
import {
  budgetMonthWindows,
  exportFilename,
  lastBudgetMonthKeys,
  spanOfWindows,
} from "./household-export/periods";
import { shapeHouseholdExport, type HouseholdExport } from "./household-export/shape";

export const HOUSEHOLD_EXPORT_MONTHS = 3;

/**
 * Builds the one-file household export a user hands to an LLM for spending
 * analysis. See docs/export.md.
 *
 * Read-only by construction: every repository call here is a find. The window
 * is the last N *budget* months, resolved from the household's start day, and
 * each table is read once over the whole span; rows are assigned to a budget
 * month while shaping.
 */
export class HouseholdExportService {
  constructor(
    private readonly householdRepo = getHouseholdRepository(),
    private readonly userRepo = getUserRepository(),
    private readonly categoryRepo = getCategoryRepository(),
    private readonly accountRepo = getAccountRepository(),
    private readonly expenseRepo = getExpenseRepository(),
    private readonly participantRepo = getExpenseParticipantRepository(),
    private readonly incomeRepo = getIncomeRepository(),
    private readonly transferRepo = getTransferRepository(),
    private readonly ledgerRepo = getAccountTransactionRepository(),
    private readonly settlementRepo = getSplitSettlementRepository()
  ) {}

  async buildForUser(
    userId: number,
    options: { months?: number; now?: Date } = {}
  ): Promise<{ filename: string; data: HouseholdExport }> {
    const months = options.months ?? HOUSEHOLD_EXPORT_MONTHS;
    const now = options.now ?? new Date();

    const [household, me, startDay, currentMonth] = await Promise.all([
      this.householdRepo.getCurrent(),
      this.userRepo.findById(userId),
      budgetMonthStartDayForUser(userId),
      getDefaultBudgetMonthForUser(userId),
    ]);
    if (!household) throw new Error("Household not found");
    if (!me) throw new Error("User not found");

    const windows = budgetMonthWindows(lastBudgetMonthKeys(currentMonth, months), startDay);
    const span = spanOfWindows(windows);

    const [members, categories, accounts, expenses, income, transfers, ledger, settlements] =
      await Promise.all([
        this.userRepo.findAll(),
        this.categoryRepo.findAllIncludingInactive(),
        this.accountRepo.findAllInHousehold(),
        // No userId: the whole household's spends, not just the caller's.
        this.expenseRepo.findByMonth(currentMonth, undefined, undefined, span),
        this.incomeRepo.findByMonth(currentMonth, undefined, undefined, span),
        this.transferRepo.findInPeriodForHousehold(span),
        this.ledgerRepo.findInPeriodForHousehold(span),
        this.settlementRepo.findInPeriodForHousehold(span),
      ]);
    const participants = await this.participantRepo.findByExpenseIds(expenses.map((e) => e.id));

    const data = shapeHouseholdExport({
      generatedAt: now,
      household: { id: household.id, name: household.name },
      exportedBy: { id: me.id, name: me.name },
      budgetMonthStartDay: startDay,
      budgetMonths: windows,
      members,
      categories,
      accounts,
      expenses,
      participants,
      income,
      transfers,
      ledger,
      settlements,
    });

    return { filename: exportFilename(span), data };
  }
}
