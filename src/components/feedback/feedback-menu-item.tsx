"use client";

import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFeedback } from "./feedback-context";

/**
 * Opens the feedback form. A button rather than a nav link because the form is
 * a modal — routing to it would lose the screen the person wants to talk about,
 * which is the one thing the report needs.
 */
export function FeedbackMenuItem({
  collapsed = false,
  onOpened,
}: {
  collapsed?: boolean;
  /** Lets the mobile menu close itself as the form opens. */
  onOpened?: () => void;
}) {
  const feedback = useFeedback();
  if (!feedback) return null;

  return (
    <button
      type="button"
      onClick={() => {
        feedback.open();
        onOpened?.();
      }}
      title="Send feedback"
      className={cn(
        "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer",
        collapsed && "justify-center px-2"
      )}
    >
      <MessageSquarePlus className="h-5 w-5 shrink-0" />
      <span className={cn(collapsed && "hidden")}>Send feedback</span>
    </button>
  );
}
