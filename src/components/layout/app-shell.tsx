import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { DesktopSidebar } from "./desktop-sidebar";
import { PushSubscriptionRepair } from "@/components/push/push-subscription-repair";
import { AddSheetProvider } from "@/components/add/add-sheet-context";
import type { AddSheetData } from "@/components/add/load-add-sheet-data";
import type { FeatureKey } from "@/lib/features/registry";

interface AppShellProps {
  children: React.ReactNode;
  featureKeys: FeatureKey[];
  isSuperAdmin: boolean;
  /** Null while the household has no budget yet; the centre button then routes. */
  addSheetData: AddSheetData | null;
}

export function AppShell({ children, featureKeys, isSuperAdmin, addSheetData }: AppShellProps) {
  return (
    <AddSheetProvider data={addSheetData}>
    <div className="min-h-screen flex flex-col">
      <PushSubscriptionRepair />
      <Header featureKeys={featureKeys} isSuperAdmin={isSuperAdmin} />
      <div className="flex flex-1">
        <DesktopSidebar featureKeys={featureKeys} isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 min-w-0 pb-24 md:pb-8">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:max-w-none md:mx-0 md:px-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav hasAddSheet={addSheetData != null} />
    </div>
    </AddSheetProvider>
  );
}
