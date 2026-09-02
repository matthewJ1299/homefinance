import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BudgetMonthStartDayProvider } from "@/components/settings/budget-month-start-context";
import { getUserRepository } from "@/lib/repositories";

const BYPASS_PATHS = ["/pending-approval", "/welcome", "/change-password"];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.mustChangePassword === true) {
    redirect("/change-password");
  }

  const approval = session.user.householdApprovalStatus ?? "active";
  const isSuperAdmin = session.user.isSuperAdmin === true;
  if (!isSuperAdmin && approval !== "active") {
    redirect("/pending-approval");
  }

  const userId = Number(session.user.id);
  const userRepo = getUserRepository();
  const featureKeys = session.user.featureKeys ?? [];

  const [budgetMonthStartDay, setup] = await Promise.all([
    userRepo.getBudgetMonthStartDay(userId),
    userRepo.getSetupWizardState(userId),
  ]);

  const pathname = (await headers()).get("x-pathname") ?? "";
  const onBypassPath = BYPASS_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (approval === "active" && setup.status === "not_started" && !onBypassPath) {
    redirect("/welcome");
  }

  return (
    <BudgetMonthStartDayProvider value={budgetMonthStartDay}>
      <AppShell featureKeys={featureKeys} isSuperAdmin={isSuperAdmin}>
        {children}
      </AppShell>
    </BudgetMonthStartDayProvider>
  );
}
