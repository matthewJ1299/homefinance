import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-24 md:pb-0 md:pl-56">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
