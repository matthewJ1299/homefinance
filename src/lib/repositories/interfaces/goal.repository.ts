import type { Goal, GoalStrategy, GoalType } from "@/lib/types";

export interface CreateGoalInput {
  name: string;
  type: GoalType;
  targetAmount?: number | null;
  monthlyTarget: number;
  linkedAccountId?: number | null;
  apr?: number | null;
  strategy?: GoalStrategy | null;
}

export interface UpdateGoalInput {
  name?: string;
  targetAmount?: number | null;
  monthlyTarget?: number;
  linkedAccountId?: number | null;
  apr?: number | null;
  strategy?: GoalStrategy | null;
  archivedAt?: string | null;
}

export interface IGoalRepository {
  findById(id: number, ownerUserId: number): Promise<Goal | null>;
  findAllForUser(ownerUserId: number, includeArchived?: boolean): Promise<Goal[]>;
  create(ownerUserId: number, data: CreateGoalInput): Promise<{ id: number }>;
  update(id: number, ownerUserId: number, data: UpdateGoalInput): Promise<void>;
  delete(id: number, ownerUserId: number): Promise<void>;
}

