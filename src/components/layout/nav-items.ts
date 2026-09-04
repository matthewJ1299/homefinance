import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  PiggyBank,
  BarChart3,
  Settings,
  SplitSquareVertical,
  CalendarDays,
  ListTodo,
  CreditCard,
  Target,
  Plus,
  GitCompare,
  Sparkles,
  ReceiptText,
  Shield,
} from "lucide-react";
import { NAV_HREF_FEATURE, type FeatureKey } from "@/lib/features/registry";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Mobile bottom bar: Home, Calendar, [center Add], Lists, Budget */
export const bottomNavItemsMobile: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/lists", label: "Lists", icon: ListTodo },
  { href: "/budget", label: "Budget", icon: PiggyBank },
];

/** Desktop sidebar and mobile hamburger: all pages in one list */
export const fullNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/lists", label: "Lists", icon: ListTodo },
  { href: "/expenses", label: "Transactions", icon: Receipt },
  { href: "/recon", label: "Recon", icon: GitCompare },
  { href: "/splits", label: "Shared costs", icon: SplitSquareVertical },
  { href: "/what-i-owe", label: "What I owe", icon: ReceiptText },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/budget-ai-report", label: "Budget AI report", icon: Sparkles },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Desktop grouping. The flat list of sixteen was a wall; these four headings
 * are how people actually think about the app -- what they touch daily, the
 * money, the long view, and the bits you set up once.
 *
 * Hrefs not listed here still render, under "Bigger picture", so adding a page
 * cannot silently drop it from the sidebar.
 */
export const sidebarGroups: Array<{ name: string; items: string[] }> = [
  { name: "Every day", items: ["/dashboard", "/calendar", "/lists"] },
  { name: "Money", items: ["/budget", "/expenses", "/accounts", "/splits", "/what-i-owe"] },
  { name: "Bigger picture", items: ["/mortgage", "/goals", "/summary", "/budget-ai-report"] },
  { name: "Setup", items: ["/recon", "/settings"] },
];

/** Groups `items` by `sidebarGroups`, dropping empty groups. */
export function groupNavItems(items: NavItem[]): Array<{ name: string; items: NavItem[] }> {
  const byHref = new Map(items.map((i) => [i.href, i]));
  const claimed = new Set(sidebarGroups.flatMap((g) => g.items));
  const groups = sidebarGroups.map((g) => ({
    name: g.name,
    items: g.items.map((h) => byHref.get(h)).filter((i): i is NavItem => i != null),
  }));
  const leftovers = items.filter((i) => !claimed.has(i.href));
  if (leftovers.length > 0) {
    const bigger = groups.find((g) => g.name === "Bigger picture");
    if (bigger) bigger.items.push(...leftovers);
  }
  return groups.filter((g) => g.items.length > 0);
}

/** Admin portal link — shown only to super-admins. */
export const adminNavItem: NavItem = { href: "/admin", label: "Admin", icon: Shield };

/** Filter nav items by household entitlements (catalogue-driven). */
export function navItemsForFeatures(
  items: NavItem[],
  features: ReadonlySet<FeatureKey>,
  options?: { includeAdmin?: boolean }
): NavItem[] {
  let out = items.filter((item) => {
    const gate = NAV_HREF_FEATURE.get(item.href);
    return gate == null || features.has(gate);
  });
  if (options?.includeAdmin) {
    out = [...out, adminNavItem];
  }
  return out;
}
