import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-12 md:pb-0 md:pl-56">
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
          {children}
        </div>
      </main>
      <BottomNav />
      <PwaInstallPrompt />
    </div>
  );
}
