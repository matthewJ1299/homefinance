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
  CircleDollarSign,
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
  { href: "/income", label: "Income", icon: CircleDollarSign },
  { href: "/recon", label: "Recon", icon: GitCompare },
  { href: "/splits", label: "Splits", icon: SplitSquareVertical },
  { href: "/what-i-owe", label: "What I owe", icon: ReceiptText },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/budget-ai-report", label: "Budget AI report", icon: Sparkles },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
