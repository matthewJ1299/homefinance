import {
  getAccountRepository,
  getAccountTransactionRepository,
  getTransferRepository,
} from "@/lib/repositories";
interface TransferBetweenAccountsInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note?: string | null;
}

export class TransferService {
  constructor(
    private readonly accountRepo = getAccountRepository(),
    private readonly txRepo = getAccountTransactionRepository(),
    private readonly transferRepo = getTransferRepository()
  ) {}

  async transferBetweenAccounts(
    userId: number,
    input: TransferBetweenAccountsInput
  ): Promise<void> {
    if (input.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    const from = await this.accountRepo.findById(
      input.fromAccountId,
      userId
    );
    const to = await this.accountRepo.findById(input.toAccountId, userId);

    if (!from || !to) {
      throw new Error("Account not found or not owned by user");
    }

    // Optionally enforce non-negative balances for non-credit accounts
    const fromBalance = await this.txRepo.getBalance(from.id);
    const projectedFromBalance = fromBalance - input.amount;
    if (from.type !== "credit" && projectedFromBalance < 0) {
      throw new Error("Insufficient funds in source account");
    }

    const { id: transferId } = await this.transferRepo.create({
      fromAccountId: from.id,
      toAccountId: to.id,
      amount: input.amount,
      note: input.note ?? null,
    });

    await this.txRepo.create({
      accountId: from.id,
      amount: -input.amount,
      transactionType: "transfer_out",
      referenceType: "transfer",
      referenceId: transferId,
    });

    await this.txRepo.create({
      accountId: to.id,
      amount: input.amount,
      transactionType: "transfer_in",
      referenceType: "transfer",
      referenceId: transferId,
    });
  }
}

