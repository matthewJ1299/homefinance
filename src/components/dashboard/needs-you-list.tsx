import { formatRand } from "@/lib/utils/currency";
import type { RowTone } from "./needs-you-row";
import type { NeedsYouIconKey } from "./needs-you-icons";
import type { DashboardTileKey } from "./when-dashboard-tile-enabled";

/** The feature a row belongs to. When one floods the stream, its rows collapse
 *  into a single summary row -- except calendar, which stays individual so a
 *  time-sensitive event is never buried. */
export type NeedsYouGroup =
  | "budget"
  | "goals"
  | "calendar"
  | "splits"
  | "lists"
  | "accounts";

export interface NeedsYouItem {
  key: string;
  priority: number;
  /** A name, not a component: this array crosses the server/client boundary. */
  icon: NeedsYouIconKey;
  tone: RowTone;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  group: NeedsYouGroup;
  /** Which Settings toggle governs this kind, if any. */
  tile?: DashboardTileKey;
}

/**
 * One array, one sort. Every feature competes on the same ordering, which is
 * what keeps calendar and lists first-class rather than second-class citizens
 * behind money. The ordering is the UX.
 *
 * Priority: overspend 10, cash short 15, unassigned 20, event today 30,
 * owed 40, task 50, unchecked account 60, goal behind 70.
 */
export function buildNeedsYou(input: {
  overspentCategories: { categoryId: number; categoryName: string; available: number }[];
  spareCategory?: { categoryName: string; available: number };
  unassigned: number;
  carriedOverspend: number;
  owedToYou: { userName: string; net: number }[];
  todayEvents: { id: number; title: string; time: string; ownerName: string }[];
  openTasks: { count: number; listName: string; addedByName?: string };
  uncheckedAccounts: { name: string; daysSinceCheck: number | null }[];
  goalsBehind: { name: string; shortfall: number }[];
  cashShortfall: number;
}): NeedsYouItem[] {
  const items: NeedsYouItem[] = [];

  for (const c of input.overspentCategories) {
    items.push({
      key: `overspend-${c.categoryId}`,
      priority: 10,
      group: "budget",
      icon: "alert",
      tone: "bad",
      title: `${c.categoryName} is ${formatRand(Math.abs(c.available))} over`,
      detail: input.spareCategory
        ? `Take it from ${input.spareCategory.categoryName}, which has ${formatRand(input.spareCategory.available)} spare.`
        : "Move money from a category with room.",
      actionLabel: "Cover it",
      href: `/budget?cover=${c.categoryId}`,
      tile: "budgetWarning",
    });
  }

  // Real cash can't cover the envelopes. Negative case only, per the design.
  if (input.cashShortfall > 0) {
    items.push({
      key: "cash-short",
      priority: 15,
      group: "budget",
      icon: "bank",
      tone: "bad",
      title: `Your accounts are ${formatRand(input.cashShortfall)} short of this`,
      detail: "Mostly money others owe you. Worth chasing.",
      actionLabel: "Show",
      href: "/accounts",
    });
  }

  if (input.unassigned !== 0) {
    const over = input.unassigned < 0;
    items.push({
      key: "unassigned",
      priority: 20,
      group: "budget",
      icon: "wallet",
      tone: over ? "bad" : "warn",
      title: over
        ? `You've promised ${formatRand(Math.abs(input.unassigned))} more than you have`
        : `${formatRand(input.unassigned)} hasn't got a job`,
      detail:
        input.carriedOverspend > 0
          ? `Includes ${formatRand(input.carriedOverspend)} carried from last month.`
          : "Assign it before the month runs away.",
      actionLabel: "Assign",
      href: "/budget",
    });
  }

  for (const e of input.todayEvents) {
    items.push({
      key: `event-${e.id}`,
      priority: 30,
      group: "calendar",
      icon: "calendar",
      tone: "neutral",
      title: e.time ? `${e.title} at ${e.time}` : e.title,
      detail: `Today · ${e.ownerName}`,
      actionLabel: "Open",
      href: `/calendar?event=${e.id}`,
      tile: "today",
    });
  }

  for (const p of input.owedToYou) {
    if (p.net <= 0) continue;
    items.push({
      key: `owed-${p.userName}`,
      priority: 40,
      group: "splits",
      icon: "split",
      tone: "neutral",
      title: `${p.userName} owes you ${formatRand(p.net)}`,
      detail: "From shared spends this month.",
      actionLabel: "Settle",
      href: "/splits",
      tile: "splitBalance",
    });
  }

  if (input.openTasks.count > 0) {
    items.push({
      key: "tasks",
      priority: 50,
      group: "lists",
      icon: "list",
      tone: "neutral",
      title: `${input.openTasks.count} open on ${input.openTasks.listName}`,
      detail: input.openTasks.addedByName
        ? `${input.openTasks.addedByName} added some today.`
        : "Still to do.",
      actionLabel: "Open",
      href: "/lists",
    });
  }

  for (const a of input.uncheckedAccounts) {
    if (a.daysSinceCheck !== null && a.daysSinceCheck < 30) continue;
    items.push({
      key: `check-${a.name}`,
      priority: 60,
      group: "accounts",
      icon: "bank",
      tone: "neutral",
      title: `${a.name} hasn't been checked`,
      detail: a.daysSinceCheck === null ? "Never checked." : `${a.daysSinceCheck} days ago.`,
      actionLabel: "Check",
      href: "/accounts",
    });
  }

  for (const g of input.goalsBehind) {
    items.push({
      key: `goal-${g.name}`,
      priority: 70,
      group: "goals",
      icon: "goal",
      tone: "warn",
      title: `${g.name} is ${formatRand(g.shortfall)} behind`,
      detail: "Behind the plan this month.",
      actionLabel: "Open",
      href: "/goals",
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
