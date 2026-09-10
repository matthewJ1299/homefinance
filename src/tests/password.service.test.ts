import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { PasswordService, BCRYPT_ROUNDS } from "@/lib/services/password.service";

/**
 * The service no longer writes SQL of its own — password reads and writes moved
 * to the user repository — so this injects a fake repo rather than mocking the
 * db surface.
 */
function fakeUserRepo(storedHash: string | null) {
  return {
    getPasswordHash: vi.fn().mockResolvedValue(storedHash),
    setPasswordHash: vi.fn().mockResolvedValue(undefined),
  };
}

describe("PasswordService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects wrong current password", async () => {
    const repo = fakeUserRepo(await bcrypt.hash("CorrectPass123!", 4));
    const svc = new PasswordService(repo as never);

    const result = await svc.changeOwnPassword(1, "WrongPass123!", "NewPassword123!");

    expect(result).toEqual({ success: false, error: "Current password is incorrect" });
    expect(repo.setPasswordHash).not.toHaveBeenCalled();
  });

  it("reports a missing user rather than throwing", async () => {
    const repo = fakeUserRepo(null);
    const svc = new PasswordService(repo as never);

    const result = await svc.changeOwnPassword(1, "Whatever123!", "NewPassword123!");

    expect(result).toEqual({ success: false, error: "User not found" });
    expect(repo.setPasswordHash).not.toHaveBeenCalled();
  });

  it("stores a new hash and clears must_change_password on success", async () => {
    const repo = fakeUserRepo(await bcrypt.hash("OldPassword123!", 4));
    const svc = new PasswordService(repo as never);

    const result = await svc.changeOwnPassword(1, "OldPassword123!", "NewPassword456!");

    expect(result).toEqual({ success: true });
    expect(repo.setPasswordHash).toHaveBeenCalledWith(1, expect.any(String), {
      mustChangePassword: false,
    });
    // The stored value is a hash of the NEW password, never the password itself.
    const [, storedHash] = repo.setPasswordHash.mock.calls[0];
    expect(storedHash).not.toContain("NewPassword456!");
    await expect(bcrypt.compare("NewPassword456!", storedHash)).resolves.toBe(true);
  });

  it("forces a change on admin reset and returns the temp password once", async () => {
    const repo = fakeUserRepo(null);
    const svc = new PasswordService(repo as never);

    const temp = await svc.adminResetPassword(7);

    expect(temp).toHaveLength(16);
    expect(repo.setPasswordHash).toHaveBeenCalledWith(7, expect.any(String), {
      mustChangePassword: true,
    });
    const [, storedHash] = repo.setPasswordHash.mock.calls[0];
    await expect(bcrypt.compare(temp, storedHash)).resolves.toBe(true);
  });

  it("hashes at the shared work factor", async () => {
    const repo = fakeUserRepo(null);
    await new PasswordService(repo as never).setPassword(1, "Whatever123!");
    const [, storedHash] = repo.setPasswordHash.mock.calls[0];
    expect(bcrypt.getRounds(storedHash)).toBe(BCRYPT_ROUNDS);
  });
});
