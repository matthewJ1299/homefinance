"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SetupWizardAccountsStep } from "@/components/setup-wizard/steps/setup-wizard-accounts-step";
import { OnboardingPaydayStep } from "@/components/onboarding/steps/onboarding-payday-step";
import { OnboardingIncomeStep } from "@/components/onboarding/steps/onboarding-income-step";
import { OnboardingCategoriesStep } from "@/components/onboarding/steps/onboarding-categories-step";
import { OnboardingBudgetStep } from "@/components/onboarding/steps/onboarding-budget-step";
import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_DESCRIPTIONS,
  ONBOARDING_STEP_HEADINGS,
  onboardingStepIndex,
  resolveOnboardingStep,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import {
  updateSetupWizardStatusAction,
  updateSetupWizardStepAction,
} from "@/lib/actions/user-preferences.actions";
import type { SetupWizardStatus } from "@/lib/repositories/interfaces/user.repository";
import type { CategoryWithActive } from "@/lib/types";
import type { BudgetOverviewResult } from "@/lib/services/budget.service";
import { toast } from "sonner";

export function OnboardingFlow(props: {
  setupStatus: SetupWizardStatus;
  storedStep: string | null;
  budgetMonthStartDay: number;
  defaultIncomeDate: string;
  categories: CategoryWithActive[];
  budgetMonth: string;
  budgetOverview: BudgetOverviewResult;
}) {
  const {
    setupStatus,
    storedStep,
    budgetMonthStartDay,
    defaultIncomeDate,
    categories,
    budgetMonth,
    budgetOverview,
  } = props;

  const router = useRouter();
  const initialStep = resolveOnboardingStep(storedStep);
  const initialStepIndex = onboardingStepIndex(initialStep);
  const [step, setStep] = useState<OnboardingStep>(initialStep);
  const [accountsReady, setAccountsReady] = useState(initialStepIndex > 0);
  const [paydayDay, setPaydayDay] = useState(budgetMonthStartDay);
  const [paydaySaved, setPaydaySaved] = useState(initialStepIndex > 1);
  const [incomeAdded, setIncomeAdded] = useState(initialStepIndex > 2);
  const [categoriesReady, setCategoriesReady] = useState(initialStepIndex > 3);
  const [isPending, startTransition] = useTransition();
  const categoriesPersistRef = useRef<(() => Promise<boolean>) | null>(null);
  const startedRef = useRef(false);

  const stepIndex = onboardingStepIndex(step);
  const progressValue = stepIndex + 1;

  useEffect(() => {
    if (startedRef.current) return;
    if (setupStatus === "completed") return;
    startedRef.current = true;
    if (setupStatus === "not_started") {
      startTransition(async () => {
        const result = await updateSetupWizardStatusAction("in_progress");
        if (!result.success) toast.error(result.error);
        else await updateSetupWizardStepAction("accounts");
      });
    }
  }, [setupStatus]);

  const persistStep = useCallback(
    (next: OnboardingStep) => {
      startTransition(async () => {
        await updateSetupWizardStepAction(next);
      });
    },
    []
  );

  const canGoNext = useMemo(() => {
    switch (step) {
      case "accounts":
        return accountsReady;
      case "payday":
        return paydaySaved;
      case "income":
        return incomeAdded;
      case "categories":
        return categoriesReady;
      case "budget":
        return true;
      default: {
        const _exhaustive: never = step;
        return Boolean(_exhaustive);
      }
    }
  }, [step, accountsReady, paydaySaved, incomeAdded, categoriesReady]);

  const skipSetup = () => {
    startTransition(async () => {
      const result = await updateSetupWizardStatusAction("dismissed");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  };

  const finishSetup = () => {
    startTransition(async () => {
      const result = await updateSetupWizardStatusAction("completed");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      await updateSetupWizardStepAction(null);
      toast.success("Setup complete.");
      router.push("/dashboard");
      router.refresh();
    });
  };

  const goNext = async () => {
    if (step === "categories" && categoriesPersistRef.current) {
      const ok = await categoriesPersistRef.current();
      if (!ok) return;
    }

    const idx = onboardingStepIndex(step);
    const next = ONBOARDING_STEPS[idx + 1];
    if (!next) {
      finishSetup();
      return;
    }
    setStep(next);
    persistStep(next);
  };

  const goBack = () => {
    const idx = onboardingStepIndex(step);
    const prev = ONBOARDING_STEPS[idx - 1];
    if (!prev) return;
    setStep(prev);
    persistStep(prev);
  };

  return (
    <div className="mx-auto max-w-2xl w-full min-w-0 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Getting started</p>
          <span className="text-xs text-muted-foreground">
            Step {stepIndex + 1} of {ONBOARDING_STEPS.length}
          </span>
        </div>
        <Progress value={progressValue} max={ONBOARDING_STEPS.length} />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">{ONBOARDING_STEP_HEADINGS[step]}</h1>
          <p className="text-sm text-muted-foreground">{ONBOARDING_STEP_DESCRIPTIONS[step]}</p>
        </div>
      </header>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {step === "accounts" ? (
          <SetupWizardAccountsStep onReadyChange={setAccountsReady} />
        ) : null}
        {step === "payday" ? (
          <OnboardingPaydayStep
            budgetMonthStartDay={paydayDay}
            onSaved={(day) => {
              setPaydayDay(day);
              setPaydaySaved(true);
            }}
          />
        ) : null}
        {step === "income" ? (
          <OnboardingIncomeStep
            defaultDate={defaultIncomeDate}
            paydayDay={paydayDay}
            onIncomeAdded={() => setIncomeAdded(true)}
          />
        ) : null}
        {step === "categories" ? (
          <OnboardingCategoriesStep
            categories={categories}
            onReadyChange={setCategoriesReady}
            onPersistRef={categoriesPersistRef}
          />
        ) : null}
        {step === "budget" ? (
          <OnboardingBudgetStep month={budgetMonth} initialOverview={budgetOverview} />
        ) : null}
      </div>

      <footer className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pb-8">
        <Button type="button" variant="ghost" onClick={skipSetup} disabled={isPending}>
          Skip for now
        </Button>
        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={isPending || stepIndex === 0}
          >
            Back
          </Button>
          {step === "budget" ? (
            <Button type="button" onClick={finishSetup} disabled={isPending}>
              Finish
            </Button>
          ) : (
            <Button type="button" onClick={() => void goNext()} disabled={isPending || !canGoNext}>
              Continue
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
