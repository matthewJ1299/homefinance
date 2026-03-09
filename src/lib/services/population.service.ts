import {
  getRecurringIncomeRepository,
  getRecurringExpenseRepository,
  getIncomeRepository,
  getExpenseRepository,
} from "@/lib/repositories";
import { dateForMonthAndDay } from "@/lib/utils/date";

export interface PopulateMonthResult {
  incomeCreated: number;
  expensesCreated: number;
  errors: string[];
}

export class PopulationService {
  constructor(
    private recurringIncomeRepo = getRecurringIncomeRepository(),
    private recurringExpenseRepo = getRecurringExpenseRepository(),
    private incomeRepo = getIncomeRepository(),
    private expenseRepo = getExpenseRepository()
  ) {}

  /**
   * Creates income and expense rows for the given month from recurring templates.
   * Idempotent: skips when a row from that template already exists for the month.
   * @param month - yyyy-MM
   * @param userId - if provided, only process templates for this user; otherwise all users
   */
  async populateMonth(month: string, userId?: number): Promise<PopulateMonthResult> {
    const result: PopulateMonthResult = { incomeCreated: 0, expensesCreated: 0, errors: [] };

    const recurringIncomeList = userId != null
      ? await this.recurringIncomeRepo.findByUserId(userId)
      : await this.recurringIncomeRepo.findAll();

    for (const rec of recurringIncomeList) {
      try {
        const exists = await this.incomeRepo.hasIncomeFromRecurring(rec.id, month);
        if (exists) continue;
        const date = dateForMonthAndDay(month, rec.dayOfMonth);
        await this.incomeRepo.create({
          userId: rec.userId,
          amount: rec.amount,
          type: rec.type,
          description: rec.description,
          date,
          month,
          recurringIncomeId: rec.id,
        });
        result.incomeCreated += 1;
      } catch (e) {
        result.errors.push(
          `Recurring income ${rec.id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    const recurringExpenseList = userId != null
      ? await this.recurringExpenseRepo.findByUserId(userId)
      : await this.recurringExpenseRepo.findAll();

    for (const rec of recurringExpenseList) {
      try {
        const exists = await this.expenseRepo.hasExpenseFromRecurring(rec.id, month);
        if (exists) continue;
        const date = dateForMonthAndDay(month, rec.dayOfMonth);
        await this.expenseRepo.create({
          userId: rec.userId,
          categoryId: rec.categoryId,
          amount: rec.amount,
          note: rec.note,
          date,
          month,
          recurringExpenseId: rec.id,
        });
        result.expensesCreated += 1;
      } catch (e) {
        result.errors.push(
          `Recurring expense ${rec.id}: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    return result;
  }
}
