import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

vi.mock("@/lib/db", () => ({
  get: vi.fn(),
  run: vi.fn(),
}));

vi.mock("@/lib/repositories", () => ({
  getUserRepository: vi.fn(),
}));

import { get, run } from "@/lib/db";
import { PasswordService } from "@/lib/services/password.service";

describe("PasswordService", () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
    vi.mocked(run).mockReset();
  });

  it("rejects wrong current password", async () => {
    const hash = await bcrypt.hash("CorrectPass123!", 4);
    vi.mocked(get).mockResolvedValue({ password_hash: hash });

    const svc = new PasswordService();
    const result = await svc.changeOwnPassword(1, "WrongPass123!", "NewPassword123!");

    expect(result).toEqual({ success: false, error: "Current password is incorrect" });
    expect(run).not.toHaveBeenCalled();
  });

  it("updates hash and clears must_change_password on success", async () => {
    const hash = await bcrypt.hash("OldPassword123!", 4);
    vi.mocked(get).mockResolvedValue({ password_hash: hash });

    const svc = new PasswordService();
    const result = await svc.changeOwnPassword(1, "OldPassword123!", "NewPassword456!");

    expect(result).toEqual({ success: true });
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining("must_change_password = false"),
      expect.arrayContaining([expect.any(String), 1])
    );
  });
});
