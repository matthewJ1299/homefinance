"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/lib/actions/_shared/authed-action";
import {
  changePasswordSchema,
  forcedChangePasswordSchema,
} from "@/lib/validators/password.schema";
import { PasswordService } from "@/lib/services/password.service";

export async function changePasswordAction(
  formData: FormData
): Promise<{ success: true } | { success: false; error: string }> {
  return authedAction<{ success: true }>(async ({ session, userId }) => {
    const service = new PasswordService();

    // Forced change: the user got here because an admin reset them, so there is
    // no current password to verify.
    if (session.user.mustChangePassword === true) {
      const parsed = forcedChangePasswordSchema.safeParse({
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
      });
      if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
      }
      await service.setPassword(userId, parsed.data.newPassword);
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

    const result = await service.changeOwnPassword(
      userId,
      parsed.data.currentPassword,
      parsed.data.newPassword
    );
    if (result.success) revalidatePath("/settings");
    return result;
  }, { onError: "That password didn't save. Try again." });
}
