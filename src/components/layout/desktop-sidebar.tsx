"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { fullNavItems, groupNavItems, navItemsForFeatures } from "./nav-items";
import { cn } from "@/lib/utils";
import { FeedbackMenuItem } from "@/components/feedback/feedback-menu-item";
import type { FeatureKey } from "@/lib/features/registry";

const STORAGE_KEY = "sidebar:collapsed";

export function DesktopSidebar({
  featureKeys,
  isSuperAdmin,
}: {
  featureKeys: FeatureKey[];
  isSuperAdmin: boolean;
}) {
  const pathname = usePathname();
  const featureSet = useMemo(() => new Set(featureKeys), [featureKeys]);
  const items = navItemsForFeatures(fullNavItems, featureSet, { includeAdmin: isSuperAdmin });
  const groups = useMemo(() => groupNavItems(items), [items]);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable — keep default
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore persistence failure
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col sticky top-14 self-start h-[calc(100dvh-3.5rem)] shrink-0 overflow-y-auto border-r bg-background/95 backdrop-blur transition-[width] duration-200",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className={cn("flex p-2", collapsed ? "justify-center" : "justify-end")}>
        <button
          type="button"
          onClick={toggle}
          className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav aria-label="Primary" className="flex flex-col gap-1 p-2 flex-1">
        {groups.map((group) => (
          <div key={group.name} className="pb-2">
            {/* Headings would be noise at 64px wide, where only icons show. */}
            {!collapsed ? (
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.name}
              </p>
            ) : null}
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className={cn(collapsed && "hidden")}>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto p-2 border-t">
        <FeedbackMenuItem collapsed={collapsed} />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className={cn(
            "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className={cn(collapsed && "hidden")}>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
