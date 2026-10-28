"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFeedback } from "@/lib/actions/feedback.actions";
import type { FeedbackPrefill } from "./feedback-context";

const MAX_BODY = 4000;

export function FeedbackDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: FeedbackPrefill;
}) {
  const pathname = usePathname();
  const [body, setBody] = useState("");
  const [attemptedAction, setAttemptedAction] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset each time it opens, and take whatever the failure knew about.
  useEffect(() => {
    if (!open) return;
    setBody("");
    setAttemptedAction(prefill.attemptedAction ?? "");
    setError(null);
  }, [open, prefill.attemptedAction]);

  const raisedFromError = prefill.errorMessage != null;

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Tell us what happened.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitFeedback({
        body: trimmed,
        attemptedAction: attemptedAction.trim() || null,
        pathname,
        errorMessage: prefill.errorMessage ?? null,
        source: raisedFromError ? "error" : "menu",
      });
      if (result.success) {
        onOpenChange(false);
        toast.success("Thanks — that's been sent.");
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>{raisedFromError ? "Report what went wrong" : "Send feedback"}</DialogHeader>
      <div className="space-y-3">
        {raisedFromError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-xs font-medium text-destructive">What the app reported</p>
            <p className="mt-1 text-sm text-muted-foreground break-words">
              {prefill.errorMessage}
            </p>
          </div>
        ) : null}

        <div>
          <Label htmlFor="feedback-body">
            {raisedFromError ? "What were you seeing?" : "What would you like to tell us?"}
          </Label>
          <textarea
            id="feedback-body"
            value={body}
            maxLength={MAX_BODY}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            autoFocus
            placeholder={
              raisedFromError
                ? "It said it saved but the amount was wrong…"
                : "Anything at all — what is confusing, what is missing, what you would change."
            }
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div>
          <Label htmlFor="feedback-action">What were you trying to do?</Label>
          <Input
            id="feedback-action"
            type="text"
            value={attemptedAction}
            maxLength={300}
            onChange={(e) => setAttemptedAction(e.target.value)}
            placeholder="e.g. Save a shared spend"
          />
          {prefill.attemptedAction ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Filled in from what failed — change it if that is not right.
            </p>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Sent with your name and the screen you are on ({pathname}).
        </p>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Sending…" : "Send"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
