"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  badge = 0,
}: {
  href: string;
  label: string;
  /** Unread count. Zero renders nothing rather than a "0". */
  badge?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "relative text-sm font-medium px-3 py-2 rounded-md",
        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent"
      )}
    >
      {label}
      {badge > 0 ? (
        <span
          // Announced rather than left as decoration: a bare number next to a
          // link tells a screen reader nothing about what it counts.
          aria-label={`${badge} unread`}
          className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold leading-none text-destructive-foreground tabular-nums"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminShell({
  children,
  unreadFeedback = 0,
}: {
  children: React.ReactNode;
  unreadFeedback?: number;
}) {
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
            <NavLink href="/admin/feedback" label="Feedback" badge={unreadFeedback} />
            <NavLink href="/admin/queries" label="Queries" />
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

