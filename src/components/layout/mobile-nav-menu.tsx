"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";
import { fullNavItems, navItemsForUserPreferences } from "./nav-items";
import { cn } from "@/lib/utils";

export function MobileNavMenu({
  reconEnabled,
  aiFeatureAllowed,
}: {
  reconEnabled: boolean;
  aiFeatureAllowed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const menuItems = navItemsForUserPreferences(fullNavItems, reconEnabled, aiFeatureAllowed);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => setOpen(false);

  const menuContent =
    open && mounted ? (
      <>
        <div
          className="fixed inset-0 z-[60] bg-black/50 md:hidden"
          onClick={close}
          aria-hidden
        />
        <aside
          role="dialog"
          aria-label="Navigation menu"
          className="fixed top-0 right-0 bottom-0 z-[70] w-64 border-l bg-background shadow-lg md:hidden flex flex-col"
        >
          <div className="flex h-14 items-center justify-between px-4 border-b shrink-0">
            <span className="font-medium text-foreground">Menu</span>
            <button
              type="button"
              onClick={close}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col p-2 gap-0.5 overflow-auto flex-1">
            {menuItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-2 border-t shrink-0">
            <button
              type="button"
              onClick={() => {
                close();
                signOut({ callbackUrl: "/login" });
              }}
              className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign out
            </button>
          </div>
        </aside>
      </>
    ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md shrink-0"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" />
      </button>
      {mounted && menuContent !== null && createPortal(menuContent, document.body)}
    </>
  );
}
