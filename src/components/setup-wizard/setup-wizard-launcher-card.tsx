"use client";

import { Button } from "@/components/ui/button";
import { openSetupWizard } from "@/components/setup-wizard/setup-wizard-host";

export function SetupWizardLauncherCard() {
  return (
    <section className="rounded-lg border bg-card p-4 space-y-3">
      <div>
        <h2 className="text-sm font-medium">Setup wizard</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Run a guided setup to configure accounts, budget month settings, and optional features like AI and Recon.
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={() => openSetupWizard()}>
          Run setup wizard
        </Button>
      </div>
    </section>
  );
}

