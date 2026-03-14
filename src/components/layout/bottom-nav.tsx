"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNavItemsMobile, fullNavItems } from "./nav-items";
import { QuickAddTrigger } from "@/components/quick-add-fab/quick-add-trigger";
import type { QuickAddFabProps } from "@/components/quick-add-fab/quick-add-fab";
import { cn } from "@/lib/utils";

const mobileLeftItems = bottomNavItemsMobile.slice(0, 2);
const mobileRightItems = bottomNavItemsMobile.slice(2, 4);

function NavLinks({
  items,
  pathname,
  className,
}: {
  items: typeof bottomNavItemsMobile;
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
              "flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-sm font-medium transition-colors md:flex-row md:justify-start md:gap-2 md:rounded-md md:px-4",
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
              className
            )}
            title={label}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
    </>
  );
}

interface BottomNavProps {
  fabData?: QuickAddFabProps | null;
}

export function BottomNav({ fabData }: BottomNavProps) {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:left-auto md:right-0 md:top-14 md:bottom-0 md:w-56 md:border-l md:border-t-0">
      <div className="flex h-12 justify-around md:h-[calc(100vh-3.5rem)] md:flex-col md:justify-start md:gap-1 md:p-2">
        {/* Mobile: 5 slots – Home, Calendar, [+], Lists, Summary */}
        <div className="flex flex-1 justify-around items-center md:hidden">
          <NavLinks items={mobileLeftItems} pathname={pathname} />
          {fabData ? (
            <QuickAddTrigger {...fabData} menuAbove>
              {({ menuOpen, onClick }) => (
                <button
                  type="button"
                  onClick={onClick}
                  className="flex flex-col items-center justify-center h-12 -my-2 w-14 rounded-full bg-primary text-primary-foreground shadow-lg text-xl font-medium hover:opacity-90 transition-opacity"
                  aria-label="Quick add"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  +
                </button>
              )}
            </QuickAddTrigger>
          ) : (
            <div className="w-14" />
          )}
          <NavLinks items={mobileRightItems} pathname={pathname} />
        </div>
        {/* Desktop: full sidebar (hidden on mobile) */}
        <div className="hidden md:flex md:flex-col md:flex-1 md:gap-1">
          <NavLinks items={fullNavItems} pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}
