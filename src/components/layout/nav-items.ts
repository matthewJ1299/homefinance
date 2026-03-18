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
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Mobile bottom bar: 4 icons – Home (dashboard), Calendar, Lists, Summary */
export const bottomNavItemsMobile: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/lists", label: "Lists", icon: ListTodo },
  { href: "/summary", label: "Summary", icon: BarChart3 },
];

/** Hamburger menu: finance pages under Home + Settings */
export const hamburgerMenuItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/splits", label: "Splits", icon: SplitSquareVertical },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Desktop sidebar: all pages in one list */
export const fullNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/lists", label: "Lists", icon: ListTodo },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/splits", label: "Splits", icon: SplitSquareVertical },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/accounts", label: "Accounts", icon: CreditCard },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
