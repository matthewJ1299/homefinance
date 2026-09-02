import { z } from "zod";

const passwordMatchRefine = {
  message: "Passwords do not match",
  path: ["confirmPassword"],
};

const newPasswordObject = z.object({
  newPassword: z.string().min(10, "Password must be at least 10 characters"),
  confirmPassword: z.string().min(1, "Confirm your new password"),
});

export const forcedChangePasswordSchema = newPasswordObject.refine(
  (data) => data.newPassword === data.confirmPassword,
  passwordMatchRefine
);

export const changePasswordSchema = newPasswordObject
  .extend({
    currentPassword: z.string().min(1, "Current password is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, passwordMatchRefine);

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForcedChangePasswordInput = z.infer<typeof forcedChangePasswordSchema>;
