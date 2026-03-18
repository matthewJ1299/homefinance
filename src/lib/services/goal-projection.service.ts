import { getAccountTransactionRepository, getGoalContributionRepository, getGoalRepository } from "@/lib/repositories";
import { estimateCreditPayoff, recommendCreditStrategy } from "@/lib/services/credit-strategy.service";
import type { Goal } from "@/lib/types";
import { calculateProgressPct } from "@/lib/services/finance/goals";
import { projectSavingsGoalCompletionMonth } from "@/lib/services/finance/projections";

export interface SavingsGoalProgress {
  goal: Goal;
  current: number;
  target: number;
  progressPct: number;
  monthlyTarget: number;
  monthlyActual: number;
  monthlyDelta: number;
  projectedCompletionMonth: string | null;
}

export interface CreditGoalProgress {
  goal: Goal;
  balance: number;
  debt: number;
  monthlyTarget: number;
  payoffMonths: number | null;
  totalInterest: number;
  recommendedStrategy: ReturnType<typeof recommendCreditStrategy>;
}

export class GoalProjectionService {
  constructor(
    private readonly goalRepo = getGoalRepository(),
    private readonly contribRepo = getGoalContributionRepository(),
    private readonly txRepo = getAccountTransactionRepository()
  ) {}

  async getSavingsProgress(
    userId: number,
    goalId: number,
    month: string
  ): Promise<SavingsGoalProgress> {
    const goal = await this.goalRepo.findById(goalId, userId);
    if (!goal) throw new Error("Goal not found");
    if (goal.type !== "savings") throw new Error("Goal is not a savings goal");
    if (goal.targetAmount == null) throw new Error("Savings goal is missing a target amount");

    const [totalsAll, totalsMonth] = await Promise.all([
      this.contribRepo.totalsByGoal(goal.id, userId),
      this.contribRepo.totalsByGoalForMonth(goal.id, userId, month),
    ]);

    const current = totalsAll.totalContributed - totalsAll.totalWithdrawn;
    const monthlyActual = totalsMonth.totalContributed - totalsMonth.totalWithdrawn;
    const monthlyDelta = monthlyActual - goal.monthlyTarget;
    const target = goal.targetAmount;
    const progressPct = calculateProgressPct({ current, target });
    const projectedCompletionMonth = projectSavingsGoalCompletionMonth({
      month,
      remaining: Math.max(0, target - current),
      monthlyTarget: goal.monthlyTarget,
    });

    return {
      goal,
      current,
      target,
      progressPct,
      monthlyTarget: goal.monthlyTarget,
      monthlyActual,
      monthlyDelta,
      projectedCompletionMonth,
    };
  }

  async getCreditProgress(userId: number, goalId: number): Promise<CreditGoalProgress> {
    const goal = await this.goalRepo.findById(goalId, userId);
    if (!goal) throw new Error("Goal not found");
    if (goal.type !== "credit") throw new Error("Goal is not a credit goal");
    if (goal.linkedAccountId == null) throw new Error("Credit goal is missing a linked account");

    const balance = await this.txRepo.getBalance(goal.linkedAccountId);
    const debt = Math.max(0, -balance);

    const payoff = estimateCreditPayoff({
      debt,
      apr: goal.apr,
      monthlyPayment: goal.monthlyTarget,
    });

    return {
      goal,
      balance,
      debt,
      monthlyTarget: goal.monthlyTarget,
      payoffMonths: payoff.months,
      totalInterest: payoff.totalInterest,
      recommendedStrategy: recommendCreditStrategy(goal, debt),
    };
  }

  async getDashboardSummary(userId: number, month: string): Promise<{
    savings: SavingsGoalProgress[];
    credit: CreditGoalProgress[];
    alerts: string[];
  }> {
    const goals = await this.goalRepo.findAllForUser(userId, false);
    const savingsGoals = goals.filter((g) => g.type === "savings");
    const creditGoals = goals.filter((g) => g.type === "credit");

    const [savings, credit] = await Promise.all([
      Promise.all(savingsGoals.map((g) => this.getSavingsProgress(userId, g.id, month))),
      Promise.all(creditGoals.map((g) => this.getCreditProgress(userId, g.id))),
    ]);

    const alerts: string[] = [];
    for (const s of savings) {
      if (s.monthlyDelta < 0) {
        alerts.push(`Behind on ${s.goal.name} by ${-s.monthlyDelta}`);
      }
    }

    return { savings, credit, alerts };
  }
}

