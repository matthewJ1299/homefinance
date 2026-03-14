import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import type { QuickAddFabProps } from "@/components/quick-add-fab/quick-add-fab";

interface AppShellProps {
  children: React.ReactNode;
  fabData: QuickAddFabProps;
}

export function AppShell({ children, fabData }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-12 md:pb-0 md:pl-56">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>
      <BottomNav fabData={fabData} />
    </div>
  );
}
