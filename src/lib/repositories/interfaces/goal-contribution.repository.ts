import type { GoalContribution, GoalContributionKind } from "@/lib/types";

export interface CreateGoalContributionInput {
  goalId: number;
  ownerUserId: number;
  accountTransactionId: number;
  kind: GoalContributionKind;
  /** Minor units; always positive. */
  amount: number;
  effectiveDate: string;
  note?: string | null;
}

export interface GoalContributionTotals {
  totalContributed: number;
  totalWithdrawn: number;
  totalPaid: number;
  totalInterest: number;
}

export interface IGoalContributionRepository {
  create(input: CreateGoalContributionInput): Promise<{ id: number }>;
  findByGoal(goalId: number, ownerUserId: number, limit: number, offset: number): Promise<GoalContribution[]>;
  findByGoalChronologicalAsc(goalId: number, ownerUserId: number): Promise<GoalContribution[]>;
  countByGoal(goalId: number, ownerUserId: number): Promise<number>;
  totalsByGoal(goalId: number, ownerUserId: number): Promise<GoalContributionTotals>;
  totalsByGoalForMonth(goalId: number, ownerUserId: number, month: string): Promise<GoalContributionTotals>;
}

