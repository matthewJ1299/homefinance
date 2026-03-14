import Link from "next/link";
import { auth } from "@/lib/auth";
import { OfflineIndicator } from "./offline-indicator";
import { ThemeToggle } from "./theme-toggle";
import { MobileNavMenu } from "./mobile-nav-menu";

export async function Header() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="font-semibold text-foreground hover:underline"
        >
          Home
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <ThemeToggle />
          <OfflineIndicator />
          <MobileNavMenu />
        </div>
      </div>
    </header>
  );
}
