import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { get, run } from "@/lib/db";
import { getUserRepository } from "@/lib/repositories";

export class PasswordService {
  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    const row = await get<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );
    if (!row) {
      return { success: false, error: "User not found" };
    }
    const match = await bcrypt.compare(currentPassword, row.password_hash);
    if (!match) {
      return { success: false, error: "Current password is incorrect" };
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await run(
      "UPDATE users SET password_hash = ?, must_change_password = false, password_changed_at = NOW() WHERE id = ?",
      [passwordHash, userId]
    );
    return { success: true };
  }

  /** Returns plaintext temp password once — caller must show it to the admin only. */
  async adminResetPassword(userId: number): Promise<string> {
    const tempPassword = randomBytes(12).toString("base64url").slice(0, 16);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    await run(
      "UPDATE users SET password_hash = ?, must_change_password = true, password_changed_at = NULL WHERE id = ?",
      [passwordHash, userId]
    );
    return tempPassword;
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const userRepo = getUserRepository();
    const user = await userRepo.findById(userId);
    if (!user) return false;
    const row = await get<{ email: string }>("SELECT email FROM users WHERE id = ?", [userId]);
    if (!row?.email) return false;
    const authUser = await getUserRepository().findByEmailForAuth(row.email);
    if (!authUser) return false;
    return bcrypt.compare(password, authUser.passwordHash);
  }
}
