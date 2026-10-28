import { z } from "zod";
import { FEEDBACK_SOURCES } from "@/lib/repositories/interfaces/feedback.repository";

/**
 * A server action is a public HTTP surface, so every field is bounded here
 * rather than trusting the form. The caps are generous enough that nobody
 * writing in good faith will meet them.
 */
export const submitFeedbackSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Tell us what happened.")
    .max(4000, "That is longer than we can store — trim it a little."),
  attemptedAction: z.string().trim().max(300).optional().nullable(),
  // Same-origin path only: never a full URL, so a report cannot smuggle a link.
  pathname: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\//, "Path must start with /"),
  errorMessage: z.string().trim().max(2000).optional().nullable(),
  source: z.enum(FEEDBACK_SOURCES),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
