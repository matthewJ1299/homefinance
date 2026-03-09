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
} from "lucide-react";

export const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/splits", label: "Splits", icon: SplitSquareVertical },
  { href: "/budget", label: "Budget", icon: PiggyBank },
  { href: "/mortgage", label: "Mortgage", icon: Wallet },
  { href: "/summary", label: "Summary", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];
