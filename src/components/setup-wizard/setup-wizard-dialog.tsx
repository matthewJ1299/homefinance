"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Dialog, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { updateSetupWizardStatusAction } from "@/lib/actions/user-preferences.actions";
import type { SetupWizardBootstrapData } from "@/components/setup-wizard/setup-wizard-types";
import { SetupWizardWelcomeStep } from "@/components/setup-wizard/steps/setup-wizard-welcome-step";
import { SetupWizardAccountsStep } from "@/components/setup-wizard/steps/setup-wizard-accounts-step";
import { SetupWizardBudgetStep } from "@/components/setup-wizard/steps/setup-wizard-budget-step";
import { SetupWizardFeaturesStep } from "@/components/setup-wizard/steps/setup-wizard-features-step";
import { SetupWizardCompleteStep } from "@/components/setup-wizard/steps/setup-wizard-complete-step";

type WizardStep = "welcome" | "accounts" | "budget" | "features" | "complete";

const steps: WizardStep[] = ["welcome", "accounts", "budget", "features", "complete"];

function stepTitle(step: WizardStep): string {
  switch (step) {
    case "welcome":
      return "Setup wizard";
    case "accounts":
      return "Accounts";
    case "budget":
      return "Budget basics";
    case "features":
      return "Optional features";
    case "complete":
      return "Done";
    default: {
      const _exhaustive: never = step;
      return String(_exhaustive);
    }
  }
}

export function SetupWizardDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bootstrap: SetupWizardBootstrapData;
  /** If true, closing the wizard persists a dismissed status. */
  persistDismissal: boolean;
}) {
  const { open, onOpenChange, bootstrap, persistDismissal } = props;
  const [step, setStep] = useState<WizardStep>("welcome");
  const [accountsReady, setAccountsReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const stepIndex = useMemo(() => steps.indexOf(step), [step]);
  const pctValue = useMemo(() => stepIndex + 1, [stepIndex]);

  useEffect(() => {
    if (!open) return;
    setStep("welcome");
    startTransition(async () => {
      const result = await updateSetupWizardStatusAction("in_progress");
      if (!result.success) toast.error(result.error);
    });
  }, [open]);

  const closeAsDismissed = () => {
    if (!persistDismissal) {
      onOpenChange(false);
      return;
    }
    startTransition(async () => {
      const result = await updateSetupWizardStatusAction("dismissed");
      if (!result.success) toast.error(result.error);
      onOpenChange(false);
    });
  };

  const closeAsCompleted = () => {
    startTransition(async () => {
      const result = await updateSetupWizardStatusAction("completed");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      onOpenChange(false);
      toast.success("Setup completed.");
    });
  };

  const canGoNext =
    step === "accounts" ? accountsReady : step === "complete" ? true : true;

  const goNext = () => {
    const idx = steps.indexOf(step);
    const next = steps[idx + 1] ?? "complete";
    setStep(next);
  };

  const goBack = () => {
    const idx = steps.indexOf(step);
    const prev = steps[idx - 1] ?? "welcome";
    setStep(prev);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          closeAsDismissed();
          return;
        }
        onOpenChange(next);
      }}
      className="max-w-2xl"
    >
      <DialogHeader>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span>{stepTitle(step)}</span>
            <span className="text-xs text-muted-foreground">
              Step {stepIndex + 1} of {steps.length}
            </span>
          </div>
          <Progress value={pctValue} max={steps.length} />
        </div>
      </DialogHeader>

      <div className="space-y-4">
        {step === "welcome" ? <SetupWizardWelcomeStep /> : null}

        {step === "accounts" ? <SetupWizardAccountsStep onReadyChange={setAccountsReady} /> : null}

        {step === "budget" ? <SetupWizardBudgetStep budgetMonthStartDay={bootstrap.budgetMonthStartDay} /> : null}

        {step === "features" ? (
          <SetupWizardFeaturesStep
            aiFeatureAllowed={bootstrap.aiFeatureAllowed}
            aiEnabled={bootstrap.aiEnabled}
            aiUsePaid={bootstrap.aiUsePaid}
            reconFeatureAllowed={bootstrap.reconFeatureAllowed}
            reconEnabled={bootstrap.reconEnabled}
          />
        ) : null}

        {step === "complete" ? <SetupWizardCompleteStep /> : null}
      </div>

      <DialogFooter className="justify-between">
        <Button type="button" variant="ghost" onClick={closeAsDismissed} disabled={isPending}>
          Not now
        </Button>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={goBack} disabled={isPending || step === "welcome"}>
            Back
          </Button>
          {step === "complete" ? (
            <Button type="button" onClick={closeAsCompleted} disabled={isPending}>
              Finish
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={isPending || !canGoNext}>
              Next
            </Button>
          )}
        </div>
      </DialogFooter>
    </Dialog>
  );
}

