import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BudgetMonthStartDayProvider } from "@/components/settings/budget-month-start-context";
import { getUserRepository } from "@/lib/repositories";
import { resolveReconInteractiveEnabled } from "@/lib/services/feature-access.service";
import { SetupWizardHost } from "@/components/setup-wizard/setup-wizard-host";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // `auth()` binds request context (userId, householdId, isSuperAdmin) and repairs
  // a missing householdId on older sessions — see src/lib/auth.ts.
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = Number(session.user.id);
  const userRepo = getUserRepository();

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
