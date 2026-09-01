"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { updateOwedToMeEnabledAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

interface OwedToMeSettingsProps {
  owedToMeEnabled: boolean;
}

export function OwedToMeSettings({ owedToMeEnabled }: OwedToMeSettingsProps) {
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
      toast.success(next ? "Owed to me enabled." : "Owed to me disabled.");
      void router.refresh();
    });
  };

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">Owed to me</h2>
        <p className="text-xs text-muted-foreground mt-1">
          When enabled, the menu shows a printable month statement of what the other person owes you
          (their split shares minus payments they made, plus their mortgage share). Off by default.
          Turn it on only on the account that sends that statement.
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
          <Label className="text-sm font-medium cursor-pointer">Show Owed to me</Label>
          <p className="text-xs text-muted-foreground">
            Required to use the Owed to me page. Leave this off if you are not the person invoicing.
          </p>
        </span>
      </label>
    </section>
  );
}
