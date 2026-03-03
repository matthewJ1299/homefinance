"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Wallet, PiggyBank, BarChart3, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/categories", label: "Categories", icon: FolderOpen },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:left-auto md:right-0 md:top-14 md:bottom-0 md:w-56 md:border-l md:border-t-0">
      <div className="flex h-14 justify-around md:flex-col md:justify-start md:gap-1 md:p-2 md:h-[calc(100vh-3.5rem)]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-4 py-2 text-sm font-medium transition-colors md:flex-row md:justify-start md:gap-2 md:rounded-md",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
