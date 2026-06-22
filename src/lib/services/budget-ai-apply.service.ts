import { withTransaction } from "@/lib/db";
import {
  getAIAnalysisRunApplicationRepository,
  getAIAnalysisRunRepository,
} from "@/lib/repositories";
import { BudgetService } from "@/lib/services/budget.service";
import type { BudgetAnalysisReport } from "@/lib/types/budget-ai-report";
import { normalizeBudgetAnalysisReport } from "@/lib/utils/normalize-budget-analysis-report";
import { resolveBudgetCategoryId, type CategoryNameCandidate } from "@/lib/utils/resolve-budget-category";

export interface ApplyBudgetAiSuggestionsInput {
  runId: number;
  userId: number;
  moveIndexes: number[];
  allocationIndexes: number[];
}

export interface ApplyBudgetAiSuggestionsResult {
  success: boolean;
  appliedCount: number;
  applicationIds: number[];
  errors: string[];
}

interface PreparedAllocationOp {
  kind: "allocation_change";
  index: number;
  categoryId: number;
  newAllocatedCents: number;
  previousAllocatedCents: number;
  label: string;
}

interface PreparedTransferOp {
  kind: "recommended_move";
  index: number;
  fromCategoryId: number;
  toCategoryId: number;
  amountCents: number;
  previousFromAllocatedCents: number;
  previousToAllocatedCents: number;
  label: string;
}

type PreparedOp = PreparedAllocationOp | PreparedTransferOp;

export class BudgetAiApplyService {
  async applySuggestions(input: ApplyBudgetAiSuggestionsInput): Promise<ApplyBudgetAiSuggestionsResult> {
    const runRepo = getAIAnalysisRunRepository();
    const run = await runRepo.getRunForUser(input.userId, input.runId);
    if (!run || run.analysisType !== "expenses_monthly") {
      return { success: false, appliedCount: 0, applicationIds: [], errors: ["Report not found."] };
    }

    const report = normalizeBudgetAnalysisReport(run.outputJson);
    if (!report) {
      return { success: false, appliedCount: 0, applicationIds: [], errors: ["Report data is invalid."] };
    }

    const budgetService = new BudgetService();
    const overview = await budgetService.getOverview(run.month, input.userId);
    const candidates: CategoryNameCandidate[] = overview.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
    }));

    const { ops, errors } = await this.prepareOperations(
      report,
      input.moveIndexes,
      input.allocationIndexes,
      candidates,
      overview.categories
    );

    if (ops.length === 0) {
      return {
        success: false,
        appliedCount: 0,
        applicationIds: [],
        errors: errors.length > 0 ? errors : ["No valid suggestions to apply."],
      };
    }

    const applicationRepo = getAIAnalysisRunApplicationRepository();
    const applicationIds: number[] = [];

    try {
      await withTransaction(async () => {
        for (const op of ops) {
          if (op.kind === "allocation_change") {
            const appId = await applicationRepo.insert({
              runId: input.runId,
              userId: input.userId,
              month: run.month,
              actionType: "allocation_set",
              categoryId: op.categoryId,
              amountCents: op.newAllocatedCents,
              previousAllocatedCents: op.previousAllocatedCents,
              suggestionKind: "allocation_change",
              suggestionIndex: op.index,
            });
            applicationIds.push(appId);
            await budgetService.setAllocation(op.categoryId, run.month, op.newAllocatedCents, input.userId);
          } else {
            const appId = await applicationRepo.insert({
              runId: input.runId,
              userId: input.userId,
              month: run.month,
              actionType: "transfer",
              fromCategoryId: op.fromCategoryId,
              toCategoryId: op.toCategoryId,
              amountCents: op.amountCents,
              previousFromAllocatedCents: op.previousFromAllocatedCents,
              previousToAllocatedCents: op.previousToAllocatedCents,
              suggestionKind: "recommended_move",
              suggestionIndex: op.index,
            });
            applicationIds.push(appId);
            const transferResult = await budgetService.transfer({
              fromCategoryId: op.fromCategoryId,
              toCategoryId: op.toCategoryId,
              month: run.month,
              amount: op.amountCents,
              userId: input.userId,
              reason: `AI report #${input.runId}`,
            });
            if (!transferResult.success) {
              throw new Error(transferResult.error);
            }
          }
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Apply failed.";
      return {
        success: false,
        appliedCount: 0,
        applicationIds: [],
        errors: [...errors, msg],
      };
    }

    return {
      success: true,
      appliedCount: applicationIds.length,
      applicationIds,
      errors,
    };
  }

  private async prepareOperations(
    report: BudgetAnalysisReport,
    moveIndexes: number[],
    allocationIndexes: number[],
    candidates: CategoryNameCandidate[],
    categoryRows: Array<{
      categoryId: number;
      categoryName: string;
      allocated: number;
      remaining: number;
    }>
  ): Promise<{ ops: PreparedOp[]; errors: string[] }> {
    const errors: string[] = [];
    const ops: PreparedOp[] = [];

    for (const index of allocationIndexes) {
      const change = report.allocation_changes[index];
      if (!change) {
        errors.push(`Allocation suggestion #${index + 1} not found.`);
        continue;
      }
      const resolved = await resolveBudgetCategoryId(change.category_name, candidates);
      if (!resolved) {
        errors.push(`Category not found: "${change.category_name}".`);
        continue;
      }
      const row = categoryRows.find((c) => c.categoryId === resolved.categoryId);
      if (!row) {
        errors.push(`Category not in budget: "${change.category_name}".`);
        continue;
      }
      if (change.new_allocated_cents < 0) {
        errors.push(`Invalid allocation for "${change.category_name}".`);
        continue;
      }
      ops.push({
        kind: "allocation_change",
        index,
        categoryId: resolved.categoryId,
        newAllocatedCents: change.new_allocated_cents,
        previousAllocatedCents: row.allocated,
        label: `${resolved.categoryName}: set allocation`,
      });
    }

    for (const index of moveIndexes) {
      const move = report.recommended_moves[index];
      if (!move) {
        errors.push(`Move suggestion #${index + 1} not found.`);
        continue;
      }
      const from = await resolveBudgetCategoryId(move.from_category, candidates);
      const to = await resolveBudgetCategoryId(move.to_category, candidates);
      if (!from) {
        errors.push(`From category not found: "${move.from_category}".`);
        continue;
      }
      if (!to) {
        errors.push(`To category not found: "${move.to_category}".`);
        continue;
      }
      const fromRow = categoryRows.find((c) => c.categoryId === from.categoryId);
      const toRow = categoryRows.find((c) => c.categoryId === to.categoryId);
      if (!fromRow || !toRow) {
        errors.push(`Categories not in budget for move #${index + 1}.`);
        continue;
      }
      if (move.amount_cents <= 0) {
        errors.push(`Invalid amount for move #${index + 1}.`);
        continue;
      }
      if (fromRow.remaining < move.amount_cents) {
        errors.push(
          `Insufficient funds in "${from.categoryName}" for move of R${(move.amount_cents / 100).toFixed(2)} (remaining too low).`
        );
        continue;
      }
      ops.push({
        kind: "recommended_move",
        index,
        fromCategoryId: from.categoryId,
        toCategoryId: to.categoryId,
        amountCents: move.amount_cents,
        previousFromAllocatedCents: fromRow.allocated,
        previousToAllocatedCents: toRow.allocated,
        label: `${from.categoryName} to ${to.categoryName}`,
      });
    }

    return { ops, errors };
  }
}
