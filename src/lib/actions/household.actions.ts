"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { getHouseholdRepository } from "@/lib/repositories";
import { normalizeBudgetMonthStartDay } from "@/lib/utils/date";

export type HouseholdActionResult = { success: true } | { success: false; error: string };

export async function renameHousehold(name: string): Promise<HouseholdActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const trimmed = name.trim();
  if (trimmed === "") return { success: false, error: "Give the house a name." };
  if (trimmed.length > 100) return { success: false, error: "That name is too long." };
  await getHouseholdRepository().rename(trimmed);
  revalidatePath("/welcome");
  revalidatePath("/settings");
  return { success: true };
}

/**
 * The budget month start day is a household setting: everyone in the house
 * looks at the same month, which is the whole point of the move off `users`.
 */
export async function setHouseholdBudgetMonthStartDay(
  day: number
): Promise<HouseholdActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  if (!Number.isInteger(day) || day < 1 || day > 28) {
    return { success: false, error: "Pick a day between 1 and 28." };
  }
  const repo = getHouseholdRepository();
  await repo.setBudgetMonthStartDay(normalizeBudgetMonthStartDay(day));
  // Choosing a day settles the disagreement the notice was about.
  await repo.clearBudgetMonthNotice();
  for (const path of ["/dashboard", "/budget", "/expenses", "/settings", "/welcome"]) {
    revalidatePath(path);
  }
  return { success: true };
}

/** Dismisses the one-time "we picked this day" notice. */
export async function dismissBudgetMonthNotice(): Promise<HouseholdActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  await getHouseholdRepository().clearBudgetMonthNotice();
  revalidatePath("/dashboard");
  return { success: true };
}
