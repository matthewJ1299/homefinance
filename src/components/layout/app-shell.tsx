import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FeedbackProvider } from "@/components/feedback/feedback-context";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { DesktopSidebar } from "./desktop-sidebar";
import { PushSubscriptionRepair } from "@/components/push/push-subscription-repair";
import { AddSheetProvider } from "@/components/add/add-sheet-context";
import type { AddSheetData } from "@/components/add/load-add-sheet-data";
import type { FeatureKey } from "@/lib/features/registry";
import type { HomeMode } from "@/lib/features/home-mode";

interface AppShellProps {
  children: React.ReactNode;
  featureKeys: FeatureKey[];
  isSuperAdmin: boolean;
  homeMode: HomeMode;
  /** Null while the household has no budget yet; the centre button then routes. */
  addSheetData: AddSheetData | null;
}

export function AppShell({
  children,
  featureKeys,
  isSuperAdmin,
  homeMode,
  addSheetData,
}: AppShellProps) {
  return (
    <AddSheetProvider data={addSheetData}>
    <FeedbackProvider>
    <div className="min-h-screen flex flex-col">
      {/*
        Each piece of shell chrome is contained on its own. These render from the
        layout, above the page segment, so an uncaught throw here would otherwise
        skip `(app)/error.tsx` entirely and replace the whole app with the
        full-page `global-error` fallback.
      */}
      <ErrorBoundary name="PushSubscriptionRepair">
        <PushSubscriptionRepair />
      </ErrorBoundary>
      <ErrorBoundary name="Header">
        <Header featureKeys={featureKeys} isSuperAdmin={isSuperAdmin} homeMode={homeMode} />
      </ErrorBoundary>
      <div className="flex flex-1">
        <ErrorBoundary name="DesktopSidebar">
          <DesktopSidebar featureKeys={featureKeys} isSuperAdmin={isSuperAdmin} homeMode={homeMode} />
        </ErrorBoundary>
        <main className="flex-1 min-w-0 pb-24 md:pb-8">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:max-w-none md:mx-0 md:px-8">
            {children}
          </div>
        </main>
      </div>
      <ErrorBoundary name="BottomNav">
        <BottomNav hasAddSheet={addSheetData != null} homeMode={homeMode} />
      </ErrorBoundary>
    </div>
    </FeedbackProvider>
    </AddSheetProvider>
  );
}
