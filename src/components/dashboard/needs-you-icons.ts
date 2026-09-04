import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  Landmark,
  ListChecks,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Rows are built on the server and rendered on the client, and a component
 * reference does not survive that boundary. The item carries a key; this maps
 * it back to an icon where it is actually drawn.
 */
export const NEEDS_YOU_ICONS = {
  alert: AlertTriangle,
  bank: Landmark,
  wallet: Wallet,
  calendar: CalendarDays,
  split: ArrowLeftRight,
  list: ListChecks,
  goal: Target,
} satisfies Record<string, LucideIcon>;

export type NeedsYouIconKey = keyof typeof NEEDS_YOU_ICONS;
