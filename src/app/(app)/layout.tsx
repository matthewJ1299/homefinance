import { auth } from "@/lib/auth";

import { headers } from "next/headers";

import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";

import { BudgetMonthStartDayProvider } from "@/components/settings/budget-month-start-context";


import { loadAddSheetData } from "@/components/add/load-add-sheet-data";
import { budgetMonthStartDayForUser } from "@/lib/utils/budget-month-for-user";



/**

 * Paths that render before a household has a budget: the Add sheet is skipped

 * there. The onboarding redirect itself lives on Home, because a layout cannot

 * redirect into a route that it also renders.

 */

const BYPASS_PATHS = ["/welcome"];



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


  const featureKeys = session.user.featureKeys ?? [];

  const homeMode = session.user.homeMode ?? "budget";



  const budgetMonthStartDay = await budgetMonthStartDayForUser(userId);



  const pathname = (await headers()).get("x-pathname") ?? "";

  const onBypassPath = BYPASS_PATHS.some(

    (p) => pathname === p || pathname.startsWith(`${p}/`)

  );



  // The sheet is only reachable once setup is done; before that the shell

  // renders on paths where a budget does not exist yet.

  const addSheetData = onBypassPath

    ? null

    : await loadAddSheetData(userId, String(session.user.name ?? session.user.email ?? ""));



  return (

    <BudgetMonthStartDayProvider value={budgetMonthStartDay}>

      <AppShell
        featureKeys={featureKeys}
        isSuperAdmin={isSuperAdmin}
        homeMode={homeMode}
        addSheetData={addSheetData}
      >

        {children}

      </AppShell>

    </BudgetMonthStartDayProvider>

  );

}

