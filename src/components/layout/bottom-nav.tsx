"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { bottomNavItemsMobile, type NavItem } from "./nav-items";
import { cn } from "@/lib/utils";

const mobileLeftItems = bottomNavItemsMobile.slice(0, 2);
const mobileRightItems = bottomNavItemsMobile.slice(2, 4);

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

export function BottomNav() {
  const pathname = usePathname();
  const addActive = pathname === "/add" || pathname.startsWith("/add/");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex h-[calc(3.25rem+env(safe-area-inset-bottom))] justify-around">
        <div className="flex flex-1 justify-around items-end pb-[env(safe-area-inset-bottom)]">
          <NavLinks items={mobileLeftItems} pathname={pathname} />
          <Link
            href="/add"
            className={cn(
              "flex flex-col items-center justify-center -mt-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl text-xl font-medium",
              "cursor-pointer transition-transform duration-200 hover:opacity-95 active:scale-95 touch-manipulation",
              addActive && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
            )}
            aria-label="Create new"
            aria-current={addActive ? "page" : undefined}
          >
            <span className="leading-none">+</span>
            <span className="text-[10px] font-medium mt-0.5 leading-none">Add</span>
          </Link>
          <NavLinks items={mobileRightItems} pathname={pathname} />
        </div>
      </div>
    </nav>
  );
}
