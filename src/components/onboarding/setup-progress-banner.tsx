"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_STEPS,
  resolveOnboardingStep,
  stepsRemainingFrom,
  type OnboardingStep,
} from "@/lib/onboarding/steps";
import type { SetupWizardStatus } from "@/lib/repositories/interfaces/user.repository";

const SESSION_DISMISS_KEY = "homefinance:setup-banner-dismissed";

export function SetupProgressBanner(props: {
  status: SetupWizardStatus;
  storedStep: string | null;
}) {
  const { status, storedStep } = props;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(sessionStorage.getItem(SESSION_DISMISS_KEY) === "1");
  }, []);

  if (status !== "in_progress" && status !== "dismissed") {
    return null;
  }
  if (hidden) {
    return null;
  }

  const step = resolveOnboardingStep(storedStep);
  const remaining = stepsRemainingFrom(step);
  const stepNumber = ONBOARDING_STEPS.indexOf(step) + 1;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    setHidden(true);
  };

  return (
    <section
      className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
      aria-label="Setup progress"
    >
      <div className="space-y-1 min-w-0">
        <p className="text-sm font-medium">Finish setting up your budget</p>
        <p className="text-xs text-muted-foreground">
          Step {stepNumber} of {ONBOARDING_STEPS.length} — {remaining}{" "}
          {remaining === 1 ? "step" : "steps"} left
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/welcome"
          className={cn(
            "inline-flex items-center justify-center rounded-md font-medium h-9 px-3 text-sm",
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          )}
        >
          Continue setup
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={dismiss}
          aria-label="Dismiss setup reminder"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}