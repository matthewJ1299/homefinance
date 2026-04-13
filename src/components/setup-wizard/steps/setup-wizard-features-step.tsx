"use client";

import { AiSettings } from "@/components/settings/ai-settings";
import { ReconSettings } from "@/components/settings/recon-settings";

export function SetupWizardFeaturesStep(props: {
  aiFeatureAllowed: boolean;
  aiEnabled: boolean;
  aiUsePaid: boolean;
  reconFeatureAllowed: boolean;
  reconEnabled: boolean;
}) {
  const { aiFeatureAllowed, aiEnabled, aiUsePaid, reconFeatureAllowed, reconEnabled } = props;

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <p className="font-medium">Optional features</p>
        <p className="text-muted-foreground">
          These are optional. If you don’t have access, the sections below will explain what’s missing.
        </p>
      </div>

      <ReconSettings reconFeatureAllowed={reconFeatureAllowed} reconEnabled={reconEnabled} />

      {aiFeatureAllowed ? (
        <AiSettings aiEnabled={aiEnabled} aiUsePaid={aiUsePaid} />
      ) : (
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <div>
            <h2 className="text-sm font-medium">AI analysis</h2>
            <p className="text-xs text-muted-foreground mt-1">
              AI analysis is not enabled for your account. An administrator can grant access.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

