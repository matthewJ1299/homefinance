import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  reconEnabled: boolean;
  aiFeatureAllowed: boolean;
}

export function AppShell({ children, reconEnabled, aiFeatureAllowed }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header reconEnabled={reconEnabled} aiFeatureAllowed={aiFeatureAllowed} />
      <main className="flex-1 pb-24 md:pb-0 md:pr-[20%]">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:max-w-none md:mx-0">
          {children}
        </div>
      </main>
      <BottomNav reconEnabled={reconEnabled} aiFeatureAllowed={aiFeatureAllowed} />
    </div>
  );
}
