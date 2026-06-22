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
} from "lucide-react";

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
  { href: "/splits", label: "Splits", icon: SplitSquareVertical },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/budget-ai-report", label: "Budget AI report", icon: Sparkles },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Sidebar / hamburger: hide Recon and Budget AI report when those features are unavailable for the user. */
export function navItemsForUserPreferences(
  items: NavItem[],
  reconEnabled: boolean,
  aiFeatureAllowed: boolean
): NavItem[] {
  let out = items;
  if (!reconEnabled) out = out.filter((i) => i.href !== "/recon");
  if (!aiFeatureAllowed) out = out.filter((i) => i.href !== "/budget-ai-report");
  return out;
}
