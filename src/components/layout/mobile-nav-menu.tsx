"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={close}
            aria-hidden
          />
          <aside
            className="fixed top-0 right-0 bottom-0 z-50 w-64 border-l bg-background shadow-lg md:hidden flex flex-col"
            aria-modal
            aria-label="Navigation menu"
          >
            <div className="flex h-14 items-center justify-between px-4 border-b">
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
            <nav className="flex flex-col p-2 gap-0.5 overflow-auto">
              {navItems.map(({ href, label, icon: Icon }) => {
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
          </aside>
        </>
      )}
    </>
  );
}
