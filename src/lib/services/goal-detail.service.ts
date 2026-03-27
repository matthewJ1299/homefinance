import {
  getAccountRepository,
  getAccountTransactionRepository,
  getGoalContributionRepository,
  getTransferRepository,
} from "@/lib/repositories";
import type { CreditStrategyScenario, StrategyRecommendation } from "@/lib/services/finance/credit";
import { buildCreditStrategyScenarios } from "@/lib/services/credit-strategy.service";
import { GoalActivityImpactService } from "@/lib/services/goal-activity-impact.service";
import { GoalProjectionService } from "@/lib/services/goal-projection.service";
import { GoalService } from "@/lib/services/goal.service";
import { projectSavingsGoalCompletionMonth } from "@/lib/services/finance/projections";
import type { AccountTransaction } from "@/lib/repositories/interfaces/account-transaction.repository";
import type { Transfer } from "@/lib/repositories/interfaces/transfer.repository";
import type { Account, Goal, GoalContribution } from "@/lib/types";

export interface GoalActivityRow {
  id: number;
  kind: GoalContribution["kind"];
  amount: number;
  effectiveDate: string;
  note: string | null;
  accountTransactionId: number;
  transaction: {
    id: number;
    accountId: number;
    amount: number;
    transactionType: string;
    createdAt: string;
    note: string | null;
  };
  counterpartyLabel: string | null;
  savingsImpactSummary: string | null;
  creditImpactSummary: string | null;
}

export interface SavingsActual {
  type: "savings";
  current: number;
  target: number;
  progressPct: number;
  monthlyTarget: number;
  monthlyActual: number;
  monthlyDelta: number;
  remainingThisMonth: number;
  onTrack: boolean;
  behindAmountThisMonth: number;
}

export interface SavingsProjected {
  type: "savings";
  projectedCompletionMonth: string | null;
  ifContinueAtMonthlyActual: string | null;
  ifHitMonthlyTarget: string | null;
  note: string | null;
}

export interface CreditActual {
  type: "credit";
  balance: number;
  debt: number;
  apr: number | null;
  monthlyTarget: number;
  payoffMonths: number | null;
  totalInterestMinor: number;
  paidThisMonth: number;
  interestThisMonth: number;
  recommendedPayment: number;
  shortVsRecommended: number;
  recommendedStrategy: StrategyRecommendation;
}

export interface CreditProjected {
  type: "credit";
  payoffMonths: number | null;
  totalInterestMinor: number;
  strategies: CreditStrategyScenario[];
}

export interface GoalDetailResponse {
  goal: Goal;
  month: string;
  actual: SavingsActual | CreditActual;
  projected: SavingsProjected | CreditProjected;
  activity: { rows: GoalActivityRow[]; total: number; limit: number; offset: number };
}

export class GoalDetailService {
  constructor(
    private readonly goalService = new GoalService(),
    private readonly projection = new GoalProjectionService(),
    private readonly impactSvc = new GoalActivityImpactService(),
    private readonly contribRepo = getGoalContributionRepository(),
    private readonly txRepo = getAccountTransactionRepository(),
    private readonly transferRepo = getTransferRepository(),
    private readonly accountRepo = getAccountRepository()
  ) {}

  async getDetail(
    userId: number,
    goalId: number,
    month: string,
    activityLimit: number,
    activityOffset: number
  ): Promise<GoalDetailResponse> {
    const goal = await this.goalService.getGoal(userId, goalId);
    if (!goal) throw new Error("Goal not found");

    const limit = Math.min(Math.max(activityLimit, 1), 100);
    const offset = Math.max(activityOffset, 0);

    if (goal.type === "savings") {
      return this.getSavingsDetail(userId, goal, month, limit, offset);
    }
    return this.getCreditDetail(userId, goal, month, limit, offset);
  }

  private async getSavingsDetail(
    userId: number,
    goal: Goal,
    month: string,
    limit: number,
    offset: number
  ): Promise<GoalDetailResponse> {
    const progress = await this.projection.getSavingsProgress(userId, goal.id, month);
    const [total, page, eventsAsc] = await Promise.all([
      this.contribRepo.countByGoal(goal.id, userId),
      this.contribRepo.findByGoal(goal.id, userId, limit, offset),
      this.contribRepo.findByGoalChronologicalAsc(goal.id, userId),
    ]);

    const impactMap = this.impactSvc.buildSavingsImpacts({
      targetAmount: progress.target,
      eventsAsc,
      monthlyPace: progress.monthlyTarget,
      fallbackAnchorMonth: month,
    });

    const rows = await this.enrichActivityRows(userId, goal, page, impactMap, null);

    const remainingThisMonth = Math.max(0, progress.monthlyTarget - progress.monthlyActual);
    const plannedCompletion = progress.projectedCompletionMonth;
    const paceActual = progress.monthlyActual;
    const altCompletionIfTargetPace = projectSavingsGoalCompletionMonth({
      month,
      remaining: Math.max(0, progress.target - progress.current),
      monthlyTarget: progress.monthlyTarget,
    });

    const actual = {
      type: "savings" as const,
      current: progress.current,
      target: progress.target,
      progressPct: progress.progressPct,
      monthlyTarget: progress.monthlyTarget,
      monthlyActual: progress.monthlyActual,
      monthlyDelta: progress.monthlyDelta,
      remainingThisMonth,
      onTrack: progress.monthlyDelta >= 0,
      behindAmountThisMonth: progress.monthlyDelta < 0 ? -progress.monthlyDelta : 0,
    };

    const projected = {
      type: "savings" as const,
      projectedCompletionMonth: plannedCompletion,
      ifContinueAtMonthlyActual: projectSavingsGoalCompletionMonth({
        month,
        remaining: Math.max(0, progress.target - progress.current),
        monthlyTarget: paceActual > 0 ? paceActual : progress.monthlyTarget,
      }),
      ifHitMonthlyTarget: altCompletionIfTargetPace,
      note:
        paceActual > 0 && paceActual !== progress.monthlyTarget
          ? "If you continue at this month’s net pace, completion uses that pace (not your monthly target)."
          : null,
    };

    return { goal, month, actual, projected, activity: { rows, total, limit, offset } };
  }

  private async getCreditDetail(
    userId: number,
    goal: Goal,
    month: string,
    limit: number,
    offset: number
  ): Promise<GoalDetailResponse> {
    const progress = await this.projection.getCreditProgress(userId, goal.id);
    const [total, page, eventsAsc] = await Promise.all([
      this.contribRepo.countByGoal(goal.id, userId),
      this.contribRepo.findByGoal(goal.id, userId, limit, offset),
      this.contribRepo.findByGoalChronologicalAsc(goal.id, userId),
    ]);

    const impactMap = this.impactSvc.buildCreditImpacts({
      eventsAsc,
      currentDebt: progress.debt,
      apr: progress.goal.apr,
      baselineMonthlyPayment: progress.monthlyTarget,
    });

    const rows = await this.enrichActivityRows(userId, goal, page, null, impactMap);

    const recommendedPayment = progress.monthlyTarget;
    const thisMonthTotals = await this.contribRepo.totalsByGoalForMonth(goal.id, userId, month);
    const paidThisMonth = thisMonthTotals.totalPaid;
    const interestThisMonth = thisMonthTotals.totalInterest;
    const shortVsRecommended = Math.max(0, recommendedPayment - paidThisMonth);

    const strategies = buildCreditStrategyScenarios({
      debt: progress.debt,
      apr: progress.goal.apr,
      baselineMonthlyPayment: progress.monthlyTarget,
      avalancheMonthlyPayment: progress.monthlyTarget,
      snowballMonthlyPayment: progress.monthlyTarget,
      targetPayoffMonth: null,
      projectionStartMonth: month,
    });

    const actual = {
      type: "credit" as const,
      /** Signed ledger balance on the linked credit account. */
      balance: progress.balance,
      debt: progress.debt,
      apr: progress.goal.apr,
      monthlyTarget: progress.monthlyTarget,
      payoffMonths: progress.payoffMonths,
      totalInterestMinor: progress.totalInterest,
      paidThisMonth,
      interestThisMonth,
      recommendedPayment,
      shortVsRecommended,
      recommendedStrategy: progress.recommendedStrategy,
    };

    const projected = {
      type: "credit" as const,
      payoffMonths: progress.payoffMonths,
      totalInterestMinor: progress.totalInterest,
      strategies,
    };

    return { goal, month, actual, projected, activity: { rows, total, limit, offset } };
  }

  private async enrichActivityRows(
    userId: number,
    goal: Goal,
    contributions: GoalContribution[],
    savingsImpact: Map<number, { summary: string | null }> | null,
    creditImpact: Map<number, { summary: string | null }> | null
  ): Promise<GoalActivityRow[]> {
    if (contributions.length === 0) return [];

    const txIds = contributions.map((c) => c.accountTransactionId);
    const txs = await this.txRepo.findByIds(txIds);
    const txById = new Map(txs.map((t) => [t.id, t]));

    const transferIds = txs
      .filter((t) => t.referenceType === "transfer" && t.referenceId != null)
      .map((t) => t.referenceId!);
    const uniqueTransferIds = [...new Set(transferIds)];
    const transfers = await Promise.all(uniqueTransferIds.map((id) => this.transferRepo.findById(id)));
    const transferById = new Map(transfers.filter(Boolean).map((t) => [t!.id, t!]));

    const accountIds = new Set<number>();
    for (const t of txs) accountIds.add(t.accountId);
    for (const tr of transfers) {
      if (tr) {
        accountIds.add(tr.fromAccountId);
        accountIds.add(tr.toAccountId);
      }
    }
    const accounts = await Promise.all([...accountIds].map((id) => this.accountRepo.findById(id, userId)));
    const accountById = new Map(accounts.filter(Boolean).map((a) => [a!.id, a!]));

    const out: GoalActivityRow[] = [];
    for (const c of contributions) {
      const tx = txById.get(c.accountTransactionId);
      if (!tx) continue;

      const counterpartyLabel = this.resolveCounterpartyLabel(goal, tx, transferById, accountById);

      out.push({
        id: c.id,
        kind: c.kind,
        amount: c.amount,
        effectiveDate: c.effectiveDate,
        note: c.note,
        accountTransactionId: c.accountTransactionId,
        transaction: {
          id: tx.id,
          accountId: tx.accountId,
          amount: tx.amount,
          transactionType: tx.transactionType,
          createdAt: tx.createdAt,
          note: tx.note,
        },
        counterpartyLabel,
        savingsImpactSummary: savingsImpact?.get(c.id)?.summary ?? null,
        creditImpactSummary: creditImpact?.get(c.id)?.summary ?? null,
      });
    }
    return out;
  }

  private resolveCounterpartyLabel(
    goal: Goal,
    tx: AccountTransaction,
    transferById: Map<number, Transfer>,
    accountById: Map<number, Account>
  ): string | null {
    if (tx.referenceType !== "transfer" || tx.referenceId == null) return null;
    const tr = transferById.get(tx.referenceId);
    if (!tr) return null;

    const linkedId = goal.linkedAccountId;
    if (linkedId == null) return null;

    if (tx.transactionType === "transfer_in" && tx.accountId === linkedId) {
      const from = accountById.get(tr.fromAccountId);
      return from ? `From: ${from.name}` : null;
    }
    if (tx.transactionType === "transfer_out" && tx.accountId === linkedId) {
      const to = accountById.get(tr.toAccountId);
      return to ? `To: ${to.name}` : null;
    }
    if (tx.accountId === tr.fromAccountId) {
      const to = accountById.get(tr.toAccountId);
      return to ? `To: ${to.name}` : null;
    }
    const from = accountById.get(tr.fromAccountId);
    return from ? `From: ${from.name}` : null;
  }
}
