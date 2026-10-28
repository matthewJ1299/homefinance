import { z } from "zod";

export const reconRuleWriteSchema = z
  .object({
    matchKind: z.enum(["merchant_exact", "merchant_contains"]),
    matchValue: z
      .string()
      .trim()
      .min(1, "A rule needs a merchant to match.")
      .max(200, "That merchant name is longer than we store."),
    action: z.enum(["file", "ignore"]).default("file"),
    categoryId: z.number().int().positive().nullable().default(null),
    participantUserIds: z.array(z.number().int().positive()).default([]),
  })
  .superRefine((v, ctx) => {
    // File rules place the row, so they need a category and someone to own it.
    // Ignore rules just drop it, so neither applies.
    if (v.action === "file") {
      if (v.categoryId == null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Pick a category.", path: ["categoryId"] });
      }
      if (v.participantUserIds.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pick at least one person.",
          path: ["participantUserIds"],
        });
      }
    }
  });

export type ReconRuleWriteInput = z.infer<typeof reconRuleWriteSchema>;
