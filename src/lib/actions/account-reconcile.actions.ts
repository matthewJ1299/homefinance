"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/lib/actions/_shared/authed-action";
import { AccountService } from "@/lib/services/account.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getCategoryRepository } from "@/lib/repositories";

export type ReconcileAccountResult =
  | { success: true; adjusted: number }
  | { success: false; error: string };

/** The category a balance check's gap is recorded against. */
const UNACCOUNTED = "Unaccounted";

/**
 * Accepts the gap between what the app thinks an account holds and what the
 * bank says, as one visible line.
 *
 * Never a silent correction: the difference becomes a real transaction in its
 * own category, so reports can separate it and the number stays honest.
 */
export async function reconcileAccount(
  accountId: number,
  statedBalanceMinor: number
): Promise<ReconcileAccountResult> {
  return authedAction<{ success: true; adjusted: number }>(async ({ userId }) => {
  if (!Number.isInteger(statedBalanceMinor)) {
    return { success: false, error: "Enter the balance your bank shows." };
  }

  const account = await new AccountService().getAccountWithBalance(userId, accountId);
  if (!account) return { success: false, error: "Account not found." };

  const diff = statedBalanceMinor - account.balance;
  if (diff === 0) return { success: true, adjusted: 0 };

  const categoryRepo = getCategoryRepository();
  const unaccounted =
    (await categoryRepo.findBySemanticKey("unaccounted")) ??
    (await categoryRepo.create({
      name: UNACCOUNTED,
      groupName: "Adjustments",
      costType: "variable",
      sortOrder: 999,
      semanticKey: "unaccounted",
    }));

  await new ExpenseService().create(userId, {
    categoryId: unaccounted.id,
    // A negative diff means money is missing, which is a spend.
    amount: -diff,
    date: new Date().toISOString().slice(0, 10),
    accountId,
    note: "Balance check",
  });

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/expenses");
  return { success: true, adjusted: diff };
  }, { onError: "The balance check didn't save. Nothing was adjusted." });
}
