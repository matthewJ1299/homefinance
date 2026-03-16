export interface CreateTransferInput {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note?: string | null;
}

export interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface ITransferRepository {
  create(input: CreateTransferInput): Promise<{ id: number }>;
  findByAccount(
    accountId: number,
    limit: number,
    offset: number
  ): Promise<Transfer[]>;
}

