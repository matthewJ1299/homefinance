"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { updateAiUsePaidAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

interface AiSettingsProps {
  aiUsePaid: boolean;
}

export function AiSettings({ aiUsePaid }: AiSettingsProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(aiUsePaid);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setChecked(aiUsePaid);
  }, [aiUsePaid]);

  const onChange = (next: boolean) => {
    setChecked(next);
    startTransition(async () => {
      const result = await updateAiUsePaidAction(next);
      if (!result.success) {
        setChecked(aiUsePaid);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Paid AI enabled." : "Free AI enabled.");
      void router.refresh();
    });
  };

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">AI analysis</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Choose whether the app uses the free-tier AI configuration or the paid AI configuration when generating analysis.
          This preference is saved per user.
        </p>
      </div>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 rounded border-input"
        />
        <span>
          <Label className="text-sm font-medium cursor-pointer">Use paid AI</Label>
          <p className="text-xs text-muted-foreground">
            Requires `GEMINI_PAID_API_KEY` on the server. When off, the app uses `GEMINI_FREE_API_KEY` (or the legacy `GEMINI_API_KEY`).
          </p>
        </span>
      </label>
    </section>
  );
}

