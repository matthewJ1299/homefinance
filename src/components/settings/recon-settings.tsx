"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/ui/label";
import { updateReconEnabledAction } from "@/lib/actions/user-preferences.actions";
import { toast } from "sonner";

interface ReconSettingsProps {
  /** Admin-style gate: user may use Recon at all (see `users.recon_feature_allowed`). */
  reconFeatureAllowed: boolean;
  reconEnabled: boolean;
}

export function ReconSettings({ reconFeatureAllowed, reconEnabled }: ReconSettingsProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(reconEnabled);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setChecked(reconEnabled);
  }, [reconEnabled]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("recon");
    if (q === "off") {
      toast.info("Enable Recon below before connecting Outlook and syncing bank emails.");
    }
    if (q === "no_access") {
      toast.info("Recon is not enabled for your account. An administrator can grant access.");
    }
  }, []);

  const onChange = (next: boolean) => {
    setChecked(next);
    startTransition(async () => {
      const result = await updateReconEnabledAction(next);
      if (!result.success) {
        setChecked(reconEnabled);
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Recon enabled." : "Recon disabled.");
      void router.refresh();
    });
  };

  if (!reconFeatureAllowed) {
    return (
      <section className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-medium">Bank email reconciliation (Recon)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Recon is not enabled for your account. An administrator can grant access per user; after that, you can turn
            it on here and connect Outlook.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">Bank email reconciliation (Recon)</h2>
        <p className="text-xs text-muted-foreground mt-1">
          When enabled, the Recon page appears in the menu and you can connect Outlook to sync bank notification emails.
          This is separate from other features; turn it on only if you use Microsoft Graph mail for reconciliation.
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
          <Label className="text-sm font-medium cursor-pointer">Enable Recon</Label>
          <p className="text-xs text-muted-foreground">Required to use the Recon page and Outlook connection.</p>
        </span>
      </label>
    </section>
  );
}
