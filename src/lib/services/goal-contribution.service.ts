import {
  getAccountRepository,
  getAccountTransactionRepository,
  getGoalContributionRepository,
  getGoalRepository,
  getTransferRepository,
} from "@/lib/repositories";
import type { GoalContribution } from "@/lib/types";

interface CreateTransferLedgerResult {
  transferId: number;
  fromAccountTxId: number;
  toAccountTxId: number;
}

interface SavingsContributionInput {
  fromAccountId: number;
  amount: number;
  effectiveDate: string;
  note?: string | null;
}

interface SavingsWithdrawalInput {
  toAccountId: number;
  amount: number;
  effectiveDate: string;
  note?: string | null;
}

interface CreditPaymentInput {
  fromAccountId: number;
  amount: number;
  effectiveDate: string;
  note?: string | null;
}

interface CreditInterestInput {
  amount: number;
  effectiveDate: string;
  note?: string | null;
}

export class GoalContributionService {
  constructor(
    private readonly goalRepo = getGoalRepository(),
    private readonly goalContributionRepo = getGoalContributionRepository(),
    private readonly accountRepo = getAccountRepository(),
    private readonly txRepo = getAccountTransactionRepository(),
    private readonly transferRepo = getTransferRepository()
  ) {}

  private async createTransferWithLedger(
    userId: number,
    fromAccountId: number,
    toAccountId: number,
    amount: number,
    note?: string | null
  ): Promise<CreateTransferLedgerResult> {
    if (amount <= 0) throw new Error("Amount must be positive");
    if (fromAccountId === toAccountId) throw new Error("From and to accounts must differ");

    const from = await this.accountRepo.findById(fromAccountId, userId);
    const to = await this.accountRepo.findById(toAccountId, userId);
    if (!from || !to) throw new Error("Account not found or not owned by user");

    const fromBalance = await this.txRepo.getBalance(from.id);
    const projectedFromBalance = fromBalance - amount;
    if (from.type !== "credit" && projectedFromBalance < 0) {
      throw new Error("Insufficient funds in source account");
    }

    const { id: transferId } = await this.transferRepo.create({
      fromAccountId: from.id,
      toAccountId: to.id,
      amount,
      note: note ?? null,
    });

    const { id: fromAccountTxId } = await this.txRepo.create({
      accountId: from.id,
      amount: -amount,
      transactionType: "transfer_out",
      referenceType: "transfer",
      referenceId: transferId,
      note: note ?? null,
    });

    const { id: toAccountTxId } = await this.txRepo.create({
      accountId: to.id,
      amount,
      transactionType: "transfer_in",
      referenceType: "transfer",
      referenceId: transferId,
      note: note ?? null,
    });

    return { transferId, fromAccountTxId, toAccountTxId };
  }

  async contributeToSavingsGoal(
    userId: number,
    goalId: number,
    input: SavingsContributionInput
  ): Promise<GoalContribution> {
    const goal = await this.goalRepo.findById(goalId, userId);
    if (!goal) throw new Error("Goal not found");
    if (goal.type !== "savings") throw new Error("Goal is not a savings goal");
    if (goal.linkedAccountId == null) {
      throw new Error("Savings goal must be linked to an account to contribute");
    }

    const { toAccountTxId } = await this.createTransferWithLedger(
      userId,
      input.fromAccountId,
      goal.linkedAccountId,
      input.amount,
      input.note
    );

    const { id } = await this.goalContributionRepo.create({
      goalId: goal.id,
      ownerUserId: userId,
      accountTransactionId: toAccountTxId,
      kind: "contribution",
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      note: input.note ?? null,
    });

    const rows = await this.goalContributionRepo.findByGoal(goal.id, userId, 1, 0);
    const created = rows.find((r) => r.id === id) ?? rows[0];
    if (!created) throw new Error("Failed to load contribution after create");
    return created;
  }

  async withdrawFromSavingsGoal(
    userId: number,
    goalId: number,
    input: SavingsWithdrawalInput
  ): Promise<GoalContribution> {
    const goal = await this.goalRepo.findById(goalId, userId);
    if (!goal) throw new Error("Goal not found");
    if (goal.type !== "savings") throw new Error("Goal is not a savings goal");
    if (goal.linkedAccountId == null) {
      throw new Error("Savings goal must be linked to an account to withdraw");
    }

    const { fromAccountTxId } = await this.createTransferWithLedger(
      userId,
      goal.linkedAccountId,
      input.toAccountId,
      input.amount,
      input.note
    );

    const { id } = await this.goalContributionRepo.create({
      goalId: goal.id,
      ownerUserId: userId,
      accountTransactionId: fromAccountTxId,
      kind: "withdrawal",
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      note: input.note ?? null,
    });

    const rows = await this.goalContributionRepo.findByGoal(goal.id, userId, 1, 0);
    const created = rows.find((r) => r.id === id) ?? rows[0];
    if (!created) throw new Error("Failed to load withdrawal after create");
    return created;
  }

  async payCreditGoal(
    userId: number,
    goalId: number,
    input: CreditPaymentInput
  ): Promise<GoalContribution> {
    const goal = await this.goalRepo.findById(goalId, userId);
    if (!goal) throw new Error("Goal not found");
    if (goal.type !== "credit") throw new Error("Goal is not a credit goal");
    if (goal.linkedAccountId == null) throw new Error("Credit goal must be linked to an account");

    const linked = await this.accountRepo.findById(goal.linkedAccountId, userId);
    if (!linked) throw new Error("Linked account not found");
    if (linked.type !== "credit") throw new Error("Linked account must be a credit account");

    const { toAccountTxId } = await this.createTransferWithLedger(
      userId,
      input.fromAccountId,
      goal.linkedAccountId,
      input.amount,
      input.note
    );

    const { id } = await this.goalContributionRepo.create({
      goalId: goal.id,
      ownerUserId: userId,
      accountTransactionId: toAccountTxId,
      kind: "payment",
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      note: input.note ?? null,
    });

    const rows = await this.goalContributionRepo.findByGoal(goal.id, userId, 1, 0);
    const created = rows.find((r) => r.id === id) ?? rows[0];
    if (!created) throw new Error("Failed to load payment after create");
    return created;
  }

  async addManualInterestToCreditGoal(
    userId: number,
    goalId: number,
    input: CreditInterestInput
  ): Promise<GoalContribution> {
    const goal = await this.goalRepo.findById(goalId, userId);
    if (!goal) throw new Error("Goal not found");
    if (goal.type !== "credit") throw new Error("Goal is not a credit goal");
    if (goal.linkedAccountId == null) throw new Error("Credit goal must be linked to an account");
    if (input.amount <= 0) throw new Error("Amount must be positive");

    const linked = await this.accountRepo.findById(goal.linkedAccountId, userId);
    if (!linked) throw new Error("Linked account not found");
    if (linked.type !== "credit") throw new Error("Linked account must be a credit account");

    // Interest increases the debt: more negative balance on a credit account.
    const { id: accountTransactionId } = await this.txRepo.create({
      accountId: linked.id,
      amount: -input.amount,
      transactionType: "adjustment",
      note: input.note ?? "Interest",
    });

    const { id } = await this.goalContributionRepo.create({
      goalId: goal.id,
      ownerUserId: userId,
      accountTransactionId,
      kind: "interest",
      amount: input.amount,
      effectiveDate: input.effectiveDate,
      note: input.note ?? null,
    });

    const rows = await this.goalContributionRepo.findByGoal(goal.id, userId, 1, 0);
    const created = rows.find((r) => r.id === id) ?? rows[0];
    if (!created) throw new Error("Failed to load interest entry after create");
    return created;
  }
}

