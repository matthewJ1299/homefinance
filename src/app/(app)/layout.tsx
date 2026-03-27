import { auth } from "@/lib/auth";
import { setRequestContext } from "@/lib/db/request-context";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BudgetMonthStartDayProvider } from "@/components/settings/budget-month-start-context";
import { getUserRepository } from "@/lib/repositories";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  setRequestContext({
    userId: session.user.id,
    userName: session.user.name ?? undefined,
  });

  const userId = Number(session.user.id);
  const budgetMonthStartDay = await getUserRepository().getBudgetMonthStartDay(userId);

  return (
    <BudgetMonthStartDayProvider value={budgetMonthStartDay}>
      <AppShell>{children}</AppShell>
    </BudgetMonthStartDayProvider>
  );
}
