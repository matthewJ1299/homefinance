"use client";

import Link from "next/link";
import { BottomNavAddButton } from "./bottom-nav-add-button";
import { usePathname } from "next/navigation";
import { bottomNavItemsFor, type NavItem } from "./nav-items";
import type { HomeMode } from "@/lib/features/home-mode";
import { cn } from "@/lib/utils";

function NavLinks({
  items,
  pathname,
  className,
}: {
  items: NavItem[];
  pathname: string;
  className?: string;
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
              className
            )}
            title={label}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="leading-none">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function BottomNav({
  hasAddSheet = false,
  homeMode,
}: {
  hasAddSheet?: boolean;
  homeMode: HomeMode;
}) {
  const pathname = usePathname();
  const addActive = pathname === "/add" || pathname.startsWith("/add/");

  const items = bottomNavItemsFor(homeMode);
  const mobileLeftItems = items.slice(0, 2);
  const mobileRightItems = items.slice(2, 4);

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden"
    >
      <div className="flex h-[calc(3.25rem+env(safe-area-inset-bottom))] justify-around">
        <div className="flex flex-1 justify-around items-end pb-[env(safe-area-inset-bottom)]">
          <NavLinks items={mobileLeftItems} pathname={pathname} />
          <BottomNavAddButton active={addActive} hasAddSheet={hasAddSheet} />
          <NavLinks items={mobileRightItems} pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}
