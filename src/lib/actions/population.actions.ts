"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { PopulationService } from "@/lib/services/population.service";

export type PopulateMonthActionResult =
  | { success: true; incomeCreated: number; expensesCreated: number; errors: string[] }
  | { success: false; error: string };

export async function populateMonth(month: string): Promise<PopulateMonthActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);
  const service = new PopulationService();
  try {
    const result = await service.populateMonth(month, userId);
    revalidatePath("/dashboard");
    revalidatePath("/expenses");
    revalidatePath("/budget");
    revalidatePath("/income");
    revalidatePath("/settings");
    return {
      success: true,
      incomeCreated: result.incomeCreated,
      expensesCreated: result.expensesCreated,
      errors: result.errors,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to populate month",
    };
  }
}
