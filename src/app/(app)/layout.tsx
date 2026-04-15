import { auth } from "@/lib/auth";
import { setRequestContextFromSession } from "@/lib/auth/set-session-request-context";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BudgetMonthStartDayProvider } from "@/components/settings/budget-month-start-context";
import { getUserRepository } from "@/lib/repositories";
import { resolveReconInteractiveEnabled } from "@/lib/services/feature-access.service";
import { SetupWizardHost } from "@/components/setup-wizard/setup-wizard-host";

function normalizeHouseholdId(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : undefined;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const sessionHouseholdId = normalizeHouseholdId(session.user.householdId);
  if (sessionHouseholdId == null) {
    try {
      session.user.householdId = String(await userRepo.getHouseholdId(userId));
    } catch {
      delete session.user.householdId;
    }
  } else {
    session.user.householdId = sessionHouseholdId;
  }
  setRequestContextFromSession(session);

  const [budgetMonthStartDay, reconEnabled, aiFeatureAllowed, aiEnabled, aiUsePaid, reconFeatureAllowed, reconPrefEnabled, setup] =
    await Promise.all([
    userRepo.getBudgetMonthStartDay(userId),
    resolveReconInteractiveEnabled(userId),
    userRepo.getAiFeatureAllowed(userId),
    userRepo.getAiEnabled(userId),
    userRepo.getAiUsePaid(userId),
    userRepo.getReconFeatureAllowed(userId),
    userRepo.getReconEnabled(userId),
    userRepo.getSetupWizardState(userId),
  ]);

  return (
    <BudgetMonthStartDayProvider value={budgetMonthStartDay}>
      <AppShell reconEnabled={reconEnabled} aiFeatureAllowed={aiFeatureAllowed}>
        {children}
        <SetupWizardHost
          autoPrompt
          bootstrap={{
            setup,
            budgetMonthStartDay,
            aiFeatureAllowed,
            aiEnabled,
            aiUsePaid,
            reconFeatureAllowed,
            reconEnabled: reconPrefEnabled,
          }}
        />
      </AppShell>
    </BudgetMonthStartDayProvider>
  );
}
