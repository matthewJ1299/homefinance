import { z } from "zod";

export const reconRuleWriteSchema = z.object({
  matchKind: z.enum(["merchant_exact", "merchant_contains"]),
  matchValue: z
    .string()
    .trim()
    .min(1, "A rule needs a merchant to match.")
    .max(200, "That merchant name is longer than we store."),
  categoryId: z.number().int().positive(),
  participantUserIds: z.array(z.number().int().positive()).min(1, "Pick at least one person."),
});

export type ReconRuleWriteInput = z.infer<typeof reconRuleWriteSchema>;
