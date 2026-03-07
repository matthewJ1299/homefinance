import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OfflineIndicator } from "./offline-indicator";
import { ThemeToggle } from "./theme-toggle";
import { MobileNavMenu } from "./mobile-nav-menu";

export async function Header() {
  const session = await auth();
  async function handleSignOut() {
    "use server";
    await signOut({ redirect: false });
    redirect("/login");
  }
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <Link
          href="/dashboard"
          className="font-semibold text-foreground hover:underline"
        >
          HomeFinance
        </Link>
        <div className="flex items-center gap-2">
          <MobileNavMenu />
          <ThemeToggle />
          <OfflineIndicator />
          <span className="text-sm text-muted-foreground">
            {session?.user?.name ?? session?.user?.email}
          </span>
          <form action={handleSignOut}>
            <button
              type="submit"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
