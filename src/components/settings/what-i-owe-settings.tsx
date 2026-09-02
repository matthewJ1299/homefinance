"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { updateOwedToMeEnabledAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

interface WhatIOweSettingsProps {
  owedToMeEnabled: boolean;
}

export function WhatIOweSettings({ owedToMeEnabled }: WhatIOweSettingsProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(owedToMeEnabled);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setChecked(owedToMeEnabled);
  }, [owedToMeEnabled]);

  const onChange = (next: boolean) => {
    setChecked(next);
    startTransition(async () => {
      const result = await updateOwedToMeEnabledAction(next);
      if (!result.success) {
        setChecked(owedToMeEnabled);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "What I owe enabled." : "What I owe disabled.");
      void router.refresh();
    });
  };

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">What I owe</h2>
        <p className="text-xs text-muted-foreground mt-1">
          When enabled, the menu shows a printable statement of what you owe the other person
          (or what they owe you): net split costs since the last settlement, plus this month’s
          mortgage share. Off by default. Turn it on only on the account that uses that statement.
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
          <Label className="text-sm font-medium cursor-pointer">Show What I owe</Label>
          <p className="text-xs text-muted-foreground">
            Required to use the What I owe page. Leave this off if you do not use that statement.
          </p>
        </span>
      </label>
    </section>
  );
}
