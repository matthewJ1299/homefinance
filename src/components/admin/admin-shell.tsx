"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "text-sm font-medium px-3 py-2 rounded-md",
        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
    </Link>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">Admin</div>
          <nav className="flex items-center gap-2">
            <NavLink href="/dashboard" label="Back to app" />
            <NavLink href="/admin/houses" label="Houses" />
            <NavLink href="/admin/users" label="Users" />
            <NavLink href="/admin/features" label="Features" />
            <NavLink href="/admin/queries" label="Queries" />
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

