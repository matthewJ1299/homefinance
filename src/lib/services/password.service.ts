import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { getUserRepository } from "@/lib/repositories";

/**
 * bcrypt work factor, in one place so every hash site agrees.
 *
 * 12 rather than 10: measured at ~210ms with bcryptjs on this hardware, which
 * is fine for a sign-in and four times the work for an attacker. Existing
 * cost-10 hashes keep verifying -- bcrypt stores the cost in the hash.
 */
export const BCRYPT_ROUNDS = 12;

export class PasswordService {
  constructor(private userRepo = getUserRepository()) {}

  async changeOwnPassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    const currentHash = await this.userRepo.getPasswordHash(userId);
    if (!currentHash) {
      return { success: false, error: "User not found" };
    }
    const match = await bcrypt.compare(currentPassword, currentHash);
    if (!match) {
      return { success: false, error: "Current password is incorrect" };
    }
    await this.setPassword(userId, newPassword);
    return { success: true };
  }

  /**
   * Sets a password without checking the old one. Only for the forced-change
   * screen, which the user reaches because an admin reset them -- there is no
   * current password they know.
   */
  async setPassword(userId: number, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepo.setPasswordHash(userId, passwordHash, { mustChangePassword: false });
  }

  /** Returns plaintext temp password once — caller must show it to the admin only. */
  async adminResetPassword(userId: number): Promise<string> {
    const tempPassword = randomBytes(12).toString("base64url").slice(0, 16);
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await this.userRepo.setPasswordHash(userId, passwordHash, { mustChangePassword: true });
    return tempPassword;
  }

  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const hash = await this.userRepo.getPasswordHash(userId);
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }
}
