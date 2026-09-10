"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/lib/actions/_shared/authed-action";
import { FeedbackService } from "@/lib/services/feedback.service";
import { submitFeedbackSchema } from "@/lib/validators/feedback.schema";

export type SubmitFeedbackResult =
  | { success: true }
  | { success: false; error: string };

export async function submitFeedback(input: {
  body: string;
  attemptedAction?: string | null;
  pathname: string;
  errorMessage?: string | null;
  source: "menu" | "error";
}): Promise<SubmitFeedbackResult> {
  return authedAction<{ success: true }>(
    async ({ userId }) => {
      const parsed = submitFeedbackSchema.safeParse(input);
      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? "That feedback could not be sent.",
        };
      }
      await new FeedbackService().submit({ userId, ...parsed.data });
      // The admin badge counts rows, so the inbox has to re-render.
      revalidatePath("/admin/feedback");
      return { success: true };
    },
    { onError: "That feedback didn't send. Try again." }
  );
}
