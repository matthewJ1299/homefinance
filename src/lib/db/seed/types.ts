export type UserAccounts = {
  bankAccountId: number;
  savingsAccountId: number;
  creditAccountId: number;
};

export type SeedContext = {
  householdId: number;
  mattId: number;
  sydneyId: number;
  splitGroupId: number;
  categoryIds: Record<string, number>;
  accounts: {
    matt: UserAccounts;
    sydney: UserAccounts;
  };
};
