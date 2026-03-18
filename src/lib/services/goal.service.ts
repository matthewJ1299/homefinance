import { getGoalRepository } from "@/lib/repositories";
import type { Goal, GoalType, GoalStrategy } from "@/lib/types";

export interface CreateGoalOptions {
  name: string;
  type: GoalType;
  targetAmount?: number | null;
  monthlyTarget: number;
  linkedAccountId?: number | null;
  apr?: number | null;
  strategy?: GoalStrategy | null;
}

export interface UpdateGoalOptions {
  name?: string;
  targetAmount?: number | null;
  monthlyTarget?: number;
  linkedAccountId?: number | null;
  apr?: number | null;
  strategy?: GoalStrategy | null;
  archivedAt?: string | null;
}

export class GoalService {
  constructor(private readonly goalRepo = getGoalRepository()) {}

  async listGoals(userId: number, includeArchived = false): Promise<Goal[]> {
    return this.goalRepo.findAllForUser(userId, includeArchived);
  }

  async getGoal(userId: number, goalId: number): Promise<Goal | null> {
    return this.goalRepo.findById(goalId, userId);
  }

  async createGoal(userId: number, data: CreateGoalOptions): Promise<Goal> {
    if (!data.name?.trim()) throw new Error("Name is required");
    if (data.monthlyTarget <= 0) throw new Error("Monthly target must be positive");
    if (data.type === "savings" && (data.targetAmount == null || data.targetAmount <= 0)) {
      throw new Error("Savings goals require a positive target amount");
    }
    if (data.type === "credit" && data.linkedAccountId == null) {
      throw new Error("Credit goals must be linked to a credit account");
    }
    if (data.apr != null && data.apr < 0) throw new Error("APR cannot be negative");

    const { id } = await this.goalRepo.create(userId, {
      name: data.name.trim(),
      type: data.type,
      targetAmount: data.targetAmount ?? null,
      monthlyTarget: data.monthlyTarget,
      linkedAccountId: data.linkedAccountId ?? null,
      apr: data.apr ?? null,
      strategy: data.strategy ?? null,
    });
    const goal = await this.goalRepo.findById(id, userId);
    if (!goal) throw new Error("Failed to load goal after create");
    return goal;
  }

  async updateGoal(userId: number, goalId: number, data: UpdateGoalOptions): Promise<void> {
    const existing = await this.goalRepo.findById(goalId, userId);
    if (!existing) throw new Error("Goal not found");

    const nextType = existing.type;
    const nextTargetAmount = data.targetAmount ?? existing.targetAmount;
    const nextMonthlyTarget = data.monthlyTarget ?? existing.monthlyTarget;
    const nextLinkedAccountId =
      data.linkedAccountId !== undefined ? data.linkedAccountId : existing.linkedAccountId;
    const nextApr = data.apr ?? existing.apr;

    if (data.name !== undefined && !data.name.trim()) throw new Error("Name cannot be empty");
    if (nextMonthlyTarget <= 0) throw new Error("Monthly target must be positive");
    if (nextType === "savings" && (nextTargetAmount == null || nextTargetAmount <= 0)) {
      throw new Error("Savings goals require a positive target amount");
    }
    if (nextType === "credit" && nextLinkedAccountId == null) {
      throw new Error("Credit goals must be linked to a credit account");
    }
    if (nextApr != null && nextApr < 0) throw new Error("APR cannot be negative");

    await this.goalRepo.update(goalId, userId, {
      name: data.name?.trim(),
      targetAmount: data.targetAmount,
      monthlyTarget: data.monthlyTarget,
      linkedAccountId: data.linkedAccountId,
      apr: data.apr,
      strategy: data.strategy,
      archivedAt: data.archivedAt,
    });
  }

  async deleteGoal(userId: number, goalId: number): Promise<void> {
    await this.goalRepo.delete(goalId, userId);
  }
}

