"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { run } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  changePasswordSchema,
  forcedChangePasswordSchema,
} from "@/lib/validators/password.schema";
import { PasswordService } from "@/lib/services/password.service";

export async function changePasswordAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  setRequestContextFromSession(session);
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = Number(session.user.id);
  const forced = session.user.mustChangePassword === true;

  if (forced) {
    const parsed = forcedChangePasswordSchema.safeParse({
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await run(
      "UPDATE users SET password_hash = ?, must_change_password = false, password_changed_at = NOW() WHERE id = ?",
      [passwordHash, userId]
    );
    revalidatePath("/change-password");
    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return { success: true };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await new PasswordService().changeOwnPassword(
    userId,
    parsed.data.currentPassword,
    parsed.data.newPassword
  );
  if (result.success) {
    revalidatePath("/settings");
  }
  return result;
}
