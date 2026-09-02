"use server";

import { registerHouseholdSchema } from "@/lib/validators/admin.schema";
import { RegistrationService } from "@/lib/services/registration.service";

export async function registerHouseholdAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = registerHouseholdSchema.safeParse({
    householdName: formData.get("householdName"),
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return new RegistrationService().registerPendingHousehold(parsed.data);
}
