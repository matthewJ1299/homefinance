"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { updateAiEnabledAction, updateAiUsePaidAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

interface AiSettingsProps {
  /** Admin-style gate: user may use AI at all (see `users.ai_feature_allowed`). */
  aiFeatureAllowed: boolean;
  aiEnabled: boolean;
  aiUsePaid: boolean;
}

export function AiSettings({ aiFeatureAllowed, aiEnabled, aiUsePaid }: AiSettingsProps) {
  const router = useRouter();
  const [enabledChecked, setEnabledChecked] = useState(aiEnabled);
  const [tierChecked, setTierChecked] = useState(aiUsePaid);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setEnabledChecked(aiEnabled);
    setTierChecked(aiUsePaid);
  }, [aiEnabled, aiUsePaid]);

  const onToggleEnabled = (next: boolean) => {
    setEnabledChecked(next);
    startTransition(async () => {
      const result = await updateAiEnabledAction(next);
      if (!result.success) {
        setEnabledChecked(aiEnabled);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "AI enabled." : "AI disabled.");
      void router.refresh();
    });
  };

  const onToggleTier = (next: boolean) => {
    setTierChecked(next);
    startTransition(async () => {
      const result = await updateAiUsePaidAction(next);
      if (!result.success) {
        setTierChecked(aiUsePaid);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Paid AI selected." : "Free AI selected.");
      void router.refresh();
    });
  };

  if (!aiFeatureAllowed) {
    return (
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-medium">AI analysis</h2>
          <p className="text-xs text-muted-foreground mt-1">
            AI analysis is not enabled for your account. An administrator can grant access per user; after that, you can
            turn it on here and choose free vs paid tier.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">AI analysis</h2>
        <p className="text-xs text-muted-foreground mt-1">
          AI features are <strong>off by default</strong>. Enable them here, then choose whether the app should use the
          free-tier AI configuration or the paid AI configuration when generating analysis. These preferences are saved
          per user.
        </p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabledChecked}
          disabled={isPending}
          onChange={(e) => onToggleEnabled(e.target.checked)}
          className="mt-1 rounded border-input"
        />
        <span>
          <Label className="text-sm font-medium cursor-pointer">Enable AI features</Label>
          <p className="text-xs text-muted-foreground">
            When disabled, AI buttons and AI report generation are hidden/disabled even if the server has API keys
            configured.
          </p>
        </span>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={tierChecked}
          disabled={isPending || !enabledChecked}
          onChange={(e) => onToggleTier(e.target.checked)}
          className="mt-1 rounded border-input"
        />
        <span>
          <Label className="text-sm font-medium cursor-pointer">Use paid AI</Label>
          <p className="text-xs text-muted-foreground">
            Paid prefers `OPENAI_API_KEY` (optional `OPENAI_MODEL`). If OpenAI is out of credit, it automatically falls
            back to Gemini free. Free uses `GEMINI_FREE_API_KEY` (or legacy `GEMINI_API_KEY`).
          </p>
        </span>
      </label>
    </section>
  );
}

