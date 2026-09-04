"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { IncomeService } from "@/lib/services/income.service";
import { getIncomeRepository, getSplitSettlementRepository } from "@/lib/repositories";
import { createIncomeSchema, updateIncomeSchema } from "@/lib/validators/income.schema";
import type { IncomeType } from "@/lib/types";
import { legacyTypeForKind, type IncomeKind } from "@/lib/types/income-type";
import type { IncomeEntry } from "@/lib/repositories/interfaces/income.repository";

export type IncomeActionResult = { success: true; id?: number } | { success: false; error: string };

export type GetIncomeForEditResult =
  | { success: true; entry: IncomeEntry; isSettlementLinked: boolean }
  | { success: false; error: string };

async function assertIncomeEditable(
  incomeId: number,
  userId: number
): Promise<{ entry: IncomeEntry } | { error: string }> {
  const incomeRepo = getIncomeRepository();
  const entry = await incomeRepo.findById(incomeId);
  if (!entry) {
    return { error: "Income not found." };
  }
  if (entry.userId !== userId) {
    return { error: "You can only modify your own income." };
  }
  const settlement = await getSplitSettlementRepository().findByIncomeId(incomeId);
  if (settlement) {
    return { error: "This income is from a split settlement. Manage it from the Splits page." };
  }
  return { entry };
}

export async function getIncomeForEdit(id: number): Promise<GetIncomeForEditResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const incomeRepo = getIncomeRepository();
  const entry = await incomeRepo.findById(id);
  if (!entry) {
    return { success: false, error: "Income not found." };
  }
  if (entry.userId !== userId) {
    return { success: false, error: "You can only edit your own income." };
  }
  const settlement = await getSplitSettlementRepository().findByIncomeId(id);
  return {
    success: true,
    entry,
    isSettlementLinked: settlement != null,
  };
}

export async function addIncome(formData: {
  amount: number;
  /** Legacy settlement flag. Derived from `incomeKind` when only that is given. */
  type?: IncomeType;
  /** The user-facing kind: salary, bonus, interest, gift, other. */
  incomeKind?: IncomeKind;
  description?: string | null;
  date: string;
  accountId?: number;
}): Promise<IncomeActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const kind = formData.incomeKind ?? (formData.type === "salary" ? "salary" : "other");
  const parsed = createIncomeSchema.safeParse({
    ...formData,
    incomeKind: kind,
    type: formData.type ?? legacyTypeForKind(kind),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const service = new IncomeService();
  const { id } = await service.create(Number(session.user.id), parsed.data);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/reports");
  return { success: true, id };
}

export async function updateIncome(
  id: number,
  formData: {
    amount?: number;
    type?: IncomeType;
    description?: string | null;
    date?: string;
    accountId?: number;
  }
): Promise<IncomeActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const parsed = updateIncomeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.message };
  }
  const userId = Number(session.user.id);
  const check = await assertIncomeEditable(id, userId);
  if ("error" in check) {
    return { success: false, error: check.error };
  }
  const service = new IncomeService();
  await service.update(id, userId, parsed.data);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/reports");
  return { success: true };
}

export async function deleteIncome(id: number): Promise<IncomeActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const check = await assertIncomeEditable(id, userId);
  if ("error" in check) {
    return { success: false, error: check.error };
  }
  const service = new IncomeService();
  await service.delete(id);
  revalidatePath("/income");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  revalidatePath("/reports");
  return { success: true };
}
