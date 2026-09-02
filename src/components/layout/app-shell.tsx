import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { DesktopSidebar } from "./desktop-sidebar";
import { PushSubscriptionRepair } from "@/components/push/push-subscription-repair";

interface AppShellProps {
  children: React.ReactNode;
  reconEnabled: boolean;
  aiFeatureAllowed: boolean;
  owedToMeEnabled: boolean;
}

export function AppShell({
  children,
  reconEnabled,
  aiFeatureAllowed,
  owedToMeEnabled,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <PushSubscriptionRepair />
      <Header
        reconEnabled={reconEnabled}
        aiFeatureAllowed={aiFeatureAllowed}
        owedToMeEnabled={owedToMeEnabled}
      />
      {/* Keep this wrapper free of `min-h-0` / `overflow-*` so the sidebar's
          `sticky top-14` keeps working. */}
      <div className="flex flex-1">
        <DesktopSidebar
          reconEnabled={reconEnabled}
          aiFeatureAllowed={aiFeatureAllowed}
          owedToMeEnabled={owedToMeEnabled}
        />
        <main className="flex-1 min-w-0 pb-24 md:pb-8">
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:max-w-none md:mx-0 md:px-8">
            {children}
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
