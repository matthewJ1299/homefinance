# HomeFinance — exact UI and UX changes

Third companion doc. `IMPLEMENTATION_PLAN.md` is the phasing,
`IMPLEMENTATION_CODE.md` is the data and service layer, this is every screen.

Written against the real primitives: `Card`, `Button` (`variant`/`size`),
`AvatarCircle` (hue-hashed from initials, `size` in px), `EmptyState`,
`SectionHeader`, `Progress`, `AllocationBar`, `cn()`, lucide icons, and the
semantic Tailwind tokens in `globals.css`.

---

## Conventions that apply everywhere

**No hex codes in components.** Everything goes through the token classes:
`bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`,
`text-destructive`, and the three added in Phase 13 — `text-success`,
`bg-warning-surface`, `bg-emphasis`. This is what makes dark mode free.

**Money is always `tabular-nums`.** A figure that shifts by a pixel when it
changes reads as unstable. Every amount gets it.

**44px minimum on anything tappable.** Participant avatars, keypad keys, row
actions. The current `h-9` icon buttons in `expense-item.tsx` are 36px and
should go to `h-11 w-11` on mobile.

**One row shape.** Every actionable item in the app — an overspend, an
appointment, a list item, a Recon row — is an icon, a title, a sub-line and one
action. Adding a feature adds a row kind, not a new card design.

**Copy rules.** Second person, present tense, no jargon. Never "allocate",
"unallocated", "to be assigned", "rollover", "reconcile" in user-facing text.
The vocabulary table at the bottom is the whole list.

---

## 1 · Home

### Before

`dashboard/page.tsx` stacks: greeting bar, three counter tiles, split banner,
over-budget tile, events tile, quick-add row, recent transactions, income
section. Eleven numbers between 12px and 24px, no hierarchy, and nothing that
answers "can I spend?".

### After

Hero, one prioritised stream, category remaining, last few, household strip.

### `src/components/dashboard/envelope-hero.tsx` (new)

```tsx
import { cn } from "@/lib/utils";
import { formatRand } from "@/lib/utils/currency";
import { Card } from "@/components/ui/card";

interface EnvelopeHeroProps {
  envelopeLeft: number;
  envelopeTotal: number;
  spent: number;
  daysLeft: number;
  periodLabel: string;        // "25 Aug – 24 Sep"
  owedToYou: number;
  onBreakdown: () => void;
}

export function EnvelopeHero({
  envelopeLeft, envelopeTotal, spent, daysLeft, periodLabel, owedToYou, onBreakdown,
}: EnvelopeHeroProps) {
  const perDay = daysLeft > 0 ? Math.round(envelopeLeft / daysLeft) : envelopeLeft;
  const usedPct = envelopeTotal > 0 ? Math.min(100, (spent / envelopeTotal) * 100) : 0;
  // Where the month itself has got to, so ahead/behind is visible without words.
  const elapsedPct = periodElapsedPct(periodLabel);
  const isNegative = envelopeLeft < 0;

  return (
    <Card className="rounded-2xl border-primary/25 bg-gradient-to-b from-background to-primary/[0.04] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">
          Left in your categories
        </span>
        <button
          type="button"
          onClick={onBreakdown}
          className="text-xs font-semibold text-primary cursor-pointer min-h-11 -my-2 px-1"
        >
          Breakdown
        </button>
      </div>

      <p className={cn(
        "mt-3 text-[2.75rem] leading-none font-semibold tracking-tight tabular-nums",
        isNegative && "text-destructive"
      )}>
        {formatRand(envelopeLeft)}
      </p>

      <p className="mt-3 text-[15px] leading-snug">
        {isNegative
          ? <>You&apos;ve assigned more than you have. <strong>Fix it below.</strong></>
          : <>About <strong>{formatRand(perDay)} a day</strong> for the {daysLeft} days left.</>}
      </p>

      <div className="mt-3 space-y-1.5">
        <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all",
              usedPct > elapsedPct + 10 ? "bg-warning" : "bg-primary")}
            style={{ width: `${usedPct}%` }}
          />
          {/* Today marker. --emphasis so it survives dark mode. */}
          <div
            className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-emphasis"
            style={{ left: `${elapsedPct}%` }}
            aria-hidden
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{formatRand(spent)} spent of {formatRand(envelopeTotal)} set aside</span>
          <span aria-hidden>│ today</span>
        </div>
      </div>

      {owedToYou > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Plus {formatRand(owedToYou)} owed to you — not in an envelope yet.
        </p>
      ) : null}
    </Card>
  );
}
```

Three decisions in that file worth stating:

- **The bar turns amber only when spending is 10+ points ahead of the month.**
  Any tighter and it cries wolf on the day after payday.
- **Owed money is a footnote, never in the hero figure.** Your share of a shared
  shop already left your envelope; adding the debt back would count the same
  rand twice. The breakdown sheet shows the full derivation.
- **A negative hero changes the sentence, not just the colour.** "R -1 200 a
  day" is nonsense, so the per-day line is replaced.

### `src/components/dashboard/needs-you-row.tsx` (new — density 4c)

Your call: compact rows, with 4a's icon and colour treatment.

```tsx
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type RowTone = "bad" | "warn" | "good" | "neutral";

const tone: Record<RowTone, { card: string; icon: string; action: string }> = {
  bad:     { card: "border-destructive/35 bg-destructive/[0.06]", icon: "bg-destructive/15 text-destructive", action: "bg-emphasis text-emphasis-foreground" },
  warn:    { card: "border-warning/40 bg-warning-surface",        icon: "bg-warning/20 text-warning",         action: "bg-card text-warning border border-warning/40" },
  good:    { card: "border-success/35 bg-success-surface",        icon: "bg-success/15 text-success",          action: "bg-card text-foreground border" },
  neutral: { card: "border-border bg-card",                       icon: "bg-primary/12 text-primary",          action: "bg-muted text-foreground border" },
};

interface NeedsYouRowProps {
  icon: LucideIcon;
  title: string;
  detail?: string;          // shown on the first row only
  actionLabel: string;
  href: string;
  rowTone?: RowTone;
}

export function NeedsYouRow({
  icon: Icon, title, detail, actionLabel, href, rowTone = "neutral",
}: NeedsYouRowProps) {
  const t = tone[rowTone];
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border p-3", t.card)}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", t.icon)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <Link
        href={href}
        className={cn(
          "flex h-11 shrink-0 items-center rounded-full px-3.5 text-xs font-semibold",
          "cursor-pointer transition-opacity hover:opacity-90 active:scale-[0.98] touch-manipulation",
          t.action
        )}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
```

`detail` is only passed to the top-priority row. That was the fix for your
concern about weight — one row explains itself, the rest are a title and a
verb, so six rows fit a phone screen without scrolling.

### `src/components/dashboard/needs-you-list.tsx` (new)

The ordering is the UX. One array, one sort, and every feature competes on the
same terms — which is what keeps calendar and lists first-class rather than
second-class citizens behind money.

```tsx
import { AlertTriangle, Wallet, CalendarDays, ListChecks, ArrowLeftRight, Target, Landmark } from "lucide-react";
import { NeedsYouRow, type RowTone } from "./needs-you-row";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { formatRand } from "@/lib/utils/currency";

export interface NeedsYouItem {
  key: string;
  priority: number;
  icon: typeof AlertTriangle;
  tone: RowTone;
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
}

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
      icon: AlertTriangle,
      tone: "bad",
      title: `${c.categoryName} is ${formatRand(c.available)} over`,
      detail: input.spareCategory
        ? `Take it from ${input.spareCategory.categoryName}, which has ${formatRand(input.spareCategory.available)} spare.`
        : "Move money from a category with room.",
      actionLabel: "Cover it",
      href: `/budget?cover=${c.categoryId}`,
    });
  }

  // Real cash can't cover the envelopes. Negative case only, per the design.
  if (input.cashShortfall > 0) {
    items.push({
      key: "cash-short",
      priority: 15,
      icon: Landmark,
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
      icon: Wallet,
      tone: over ? "bad" : "warn",
      title: over
        ? `You've promised ${formatRand(input.unassigned)} more than you have`
        : `${formatRand(input.unassigned)} hasn't got a job`,
      detail: input.carriedOverspend > 0
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
      icon: CalendarDays,
      tone: "neutral",
      title: `${e.title} at ${e.time}`,
      detail: `Today · ${e.ownerName}`,
      actionLabel: "Open",
      href: `/calendar?event=${e.id}`,
    });
  }

  for (const p of input.owedToYou) {
    if (p.net <= 0) continue;
    items.push({
      key: `owed-${p.userName}`,
      priority: 40,
      icon: ArrowLeftRight,
      tone: "neutral",
      title: `${p.userName} owes you ${formatRand(p.net)}`,
      detail: "From shared spends this month.",
      actionLabel: "Settle",
      href: "/splits",
    });
  }

  if (input.openTasks.count > 0) {
    items.push({
      key: "tasks",
      priority: 50,
      icon: ListChecks,
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
      icon: Landmark,
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
      icon: Target,
      tone: "warn",
      title: `${g.name} is ${formatRand(g.shortfall)} behind`,
      detail: "Behind the plan this month.",
      actionLabel: "Open",
      href: "/goals",
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}

export function NeedsYouList({ items }: { items: NeedsYouItem[] }) {
  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <SectionHeader title="Needs you" />
        <EmptyState
          title="Nothing needs you today"
          message="Everything's assigned, nothing's over, and the house is quiet."
        />
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <SectionHeader title="Needs you" />
      <div className="space-y-1.5">
        {items.slice(0, 6).map((item, i) => (
          <NeedsYouRow
            key={item.key}
            icon={item.icon}
            title={item.title}
            detail={i === 0 ? item.detail : undefined}
            actionLabel={item.actionLabel}
            href={item.href}
            rowTone={item.tone}
          />
        ))}
        {items.length > 6 ? (
          <p className="pt-1 text-center text-xs text-muted-foreground">
            +{items.length - 6} more
          </p>
        ) : null}
      </div>
    </section>
  );
}
```

`slice(0, 6)` is deliberate. A stream that can grow without limit becomes a
feed you scroll past; six is the number that fits above the fold on a 390px
screen with the hero in place.

### `src/components/dashboard/category-remaining.tsx` (new)

```tsx
export function CategoryRemaining({
  categories, showCount = 5,
}: {
  categories: { categoryId: number; categoryName: string; available: number; assigned: number; carriedIn: number; spent: number; rollover: boolean; groupName: string }[];
  showCount?: number;
}) {
  // Most useful first: what's over, then what's tight, then the rest.
  const ordered = [...categories].sort((a, b) => {
    if (a.available < 0 !== b.available < 0) return a.available < 0 ? -1 : 1;
    const capA = a.assigned + a.carriedIn, capB = b.assigned + b.carriedIn;
    return (capA ? a.available / capA : 1) - (capB ? b.available / capB : 1);
  });

  return (
    <section className="space-y-2.5">
      <SectionHeader
        title="What's left, by category"
        action={<Link href="/budget" className="text-xs font-semibold text-primary">All {categories.length}</Link>}
      />
      <Card className="rounded-2xl px-3.5 py-1.5">
        {ordered.slice(0, showCount).map((c) => {
          const cap = c.assigned + c.carriedIn;
          const isOver = c.available < 0;
          const isSaving = c.groupName === "Saving up" || (c.carriedIn > 0 && c.spent === 0);
          return (
            <div key={c.categoryId} className="space-y-1.5 border-b border-border/50 py-3 last:border-0">
              <div className="flex items-baseline justify-between gap-2.5">
                <div className="min-w-0">
                  <span className="text-sm font-medium">{c.categoryName}</span>
                  {c.carriedIn > 0 ? (
                    <span className="block text-[11px] text-muted-foreground">
                      {formatRand(c.carriedIn)} carried over
                    </span>
                  ) : null}
                </div>
                <span className={cn("shrink-0 text-sm font-semibold tabular-nums",
                  isOver ? "text-destructive" : "text-primary")}>
                  {isOver
                    ? `${formatRand(c.available)} over`
                    : `${formatRand(c.available)} ${isSaving ? "saved" : "left"}`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", isOver ? "bg-destructive" : "bg-primary")}
                  style={{ width: `${cap > 0 ? Math.min(100, (c.spent / cap) * 100) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
```

"saved" instead of "left" for sinking funds is a one-word change that makes
rollover legible. R3 600 *left* in Car service sounds like budget you failed to
spend; R3 600 *saved* is the thing you're pleased about.

### `src/components/dashboard/breakdown-sheet.tsx` (new)

Five rows, the third emphasised because it's the hero figure, and the fourth
below a rule because it isn't spendable yet.

```tsx
const rows = [
  { label: "Set aside this month", note: `${formatRand(totalAssigned)} assigned, plus ${formatRand(totalCarriedIn)} carried over`, value: envelopeTotal, emphasis: false },
  { label: "Spent so far",         note: "Your share only, on shared spends",   value: -spent,        emphasis: false },
  { label: "Left in your categories", note: "The figure on Home",               value: envelopeLeft,  emphasis: true },
  { label: "Owed to you",          note: owedDetail,                            value: owedToYou,     emphasis: false, dim: true },
  { label: "Not assigned yet",     note: "Money with no job",                   value: unassigned,    emphasis: false, dim: true },
];
```

Closing paragraph, verbatim — it's the sentence that resolves the double-count
question a careful user will ask:

> Money owed to you sits below the line on purpose. It's yours, but it isn't in
> an envelope yet — when {name} settles, you choose which category it lands in.

### Deleted from Home

| File | Why |
|---|---|
| `home-stats-strip.tsx` | "7 tasks, 2 events" is a quantity you can't act on |
| `budget-warning-tile.tsx` | becomes a `bad` row |
| `split-balance-banner.tsx` | becomes a `neutral` row |
| `today-calendar-tile.tsx` | becomes `neutral` rows, one per event |
| `dashboard-income-section.tsx` | income moves to Transactions and the Add sheet |

`when-dashboard-tile-enabled.tsx` **stays** and now gates row kinds, so every
existing Settings toggle keeps working with no schema change.

### `src/components/layout/nav-items.ts`

```diff
 export const bottomNavItemsMobile: NavItem[] = [
   { href: "/dashboard", label: "Home",     icon: LayoutDashboard },
   { href: "/calendar",  label: "Calendar", icon: CalendarDays },
   { href: "/lists",     label: "Lists",    icon: ListChecks },
   { href: "/budget",    label: "Budget",   icon: Wallet },
 ];
```

**Unchanged** — you were right that Calendar and Lists belong here. The sidebar
groups instead:

```ts
export const sidebarGroups = [
  { name: "Every day",      items: ["/dashboard", "/calendar", "/lists"] },
  { name: "Money",          items: ["/budget", "/expenses", "/accounts", "/splits", "/what-i-owe"] },
  { name: "Bigger picture", items: ["/mortgage", "/goals", "/reports", "/budget-ai-report"] },
  { name: "Setup",          items: ["/recon", "/settings"] },
];
```

### `src/components/layout/bottom-nav.tsx`

The centre button opens the sheet instead of routing, with long-press falling
back to the hub.

```diff
-          <Link href="/add" className={cn(...)} aria-label="Create new">
+          <button
+            type="button"
+            onClick={() => setAddOpen(true)}
+            onContextMenu={(e) => { e.preventDefault(); router.push("/add"); }}
+            className={cn(
+              "flex flex-col items-center justify-center -mt-5 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl text-xl font-medium",
+              "cursor-pointer transition-transform duration-200 hover:opacity-95 active:scale-95 touch-manipulation"
+            )}
+            aria-label="Add a spend"
+          >
             <span className="leading-none">+</span>
             <span className="text-[10px] font-medium mt-0.5 leading-none">Add</span>
-          </Link>
+          </button>
```

Label stays "Add" — it handles income too, so "Spend" would be wrong.

---

## 2 · The Add sheet

### Before

Two steps. Amount on the dashboard, then a dialog with category pills, note,
date, account select, split checkbox, three split-mode radios and exact-share
inputs. Six screens of chrome for one number and one word.

### After

One sheet. Keypad up, category carrying what's left, avatars for who's in, and
the budget consequence stated before you commit.

Full component in `IMPLEMENTATION_CODE.md` Phase 4. The UI specifics:

### Layout, top to bottom

| Element | Spec |
|---|---|
| Grabber | `h-1 w-10 rounded-full bg-border mx-auto` |
| Title row | "Add" + Spend/Income segmented pills |
| Amount | `text-5xl font-semibold tabular-nums`, centred, `text-muted-foreground` at zero |
| Category | wrapping pills, each `{name} · {available} left/over` |
| Who's in | 42px avatars in a row, you always lit and non-tappable |
| Share bars | only when 2+ people; per-person amount + draggable bar |
| Consequence | tinted card, `min-h-[50px]` so it never reflows |
| Chips | Today · account · + Note |
| Keypad | 3×4 grid, `h-12 rounded-xl` |
| Save | `h-13`, states the share |

### The category pill

```tsx
<button
  type="button"
  onClick={() => setCategoryId(c.id)}
  className={cn(
    "flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium cursor-pointer",
    isSelected  ? "border-primary bg-primary text-primary-foreground"
    : isOver    ? "border-destructive/50 bg-destructive/[0.08] text-destructive"
                : "border-border bg-muted text-foreground"
  )}
>
  <span>{c.name}</span>
  <span className="text-[11px] tabular-nums opacity-75">
    {c.available < 0 ? `${short(c.available)} over` : `${short(c.available)} left`}
  </span>
</button>
```

Showing remaining on the pill is the cheapest possible integration of budget
into spending, and it's the one you liked. Order: most-used first, then
overspent, then the rest.

### The participant avatar

```tsx
<button
  type="button"
  onClick={() => togglePerson(m.id)}
  disabled={m.id === me.id}
  className="flex w-14 flex-col items-center gap-1 cursor-pointer disabled:cursor-default"
  aria-pressed={isPicked}
>
  <span className={cn(
    "flex h-11 w-11 items-center justify-center rounded-full border-2 text-[15px] font-semibold transition-colors",
    isPicked ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
  )}>
    {initials(m.name)}
  </span>
  <span className={cn("text-[11px]", isPicked ? "font-semibold text-foreground" : "text-muted-foreground")}>
    {m.id === me.id ? "You" : m.name.split(" ")[0]}
  </span>
</button>
```

Note this deliberately does **not** use `AvatarCircle`. That component
hue-hashes its own colours, which fights the selected/unselected state the
control depends on. `AvatarCircle` stays for display contexts — transaction
rows, list items, the calendar grid.

### The consequence panel

The only element that makes this sheet worth building. It recomputes on every
keystroke and every avatar tap:

- No category → "Pick a category / Each pill shows what's left in it."
- No amount → "Type an amount / {Category} has {x} left this month."
- Fits → success tint, "Your R450 comes off Groceries / Groceries will have R870
  left. Sydney owes you R450."
- Doesn't fit → destructive tint, "…It goes R870 over. Fuel has R700 spare."

`min-h-[50px]` matters: without it the keypad jumps as the text length changes.

### Save button copy

```tsx
{!canSave ? "Save spend"
  : pickedIds.length > 1 ? `Save · your share ${formatRand(myShare)}`
  : `Save ${formatRand(amountMinor)}`}
```

### One toast, not three

```ts
toast.success(
  `Saved ${formatRand(myShare)} to ${categoryName}. ` +
  (isOverspent ? `It's now ${formatRand(available)} over.` : `${formatRand(available)} left.`),
  { action: { label: "Undo", onClick: () => deleteExpense(id) } }
);
```

Replaces the current three (saved · remaining · over-budget warning).

### `src/app/(app)/add/page.tsx`

Keeps task and event only. `add-hub-client.tsx` loses its expense card and its
quick-add type dropdown; long-press on the centre button is how you reach it.

---

## 3 · Budget

### Before

Donut, four-stat grid, spending-by-category bars, then a card per category —
each with an inline input, a Save button, an expand toggle and sometimes a Move
money button. The same figures stated four times, eleven inputs on screen.

### After

One headline, one three-figure line, one grouped list of read-only rows.

### `src/components/budget/budget-overview.tsx`

```diff
-      <BudgetDonutChart ... />
-      <div className="grid gap-3">
-        <div>Total income ...</div>
-        <div>Total expenses ...</div>
-        <div>Balance ...</div>
-        <div>Allocated ...</div>
-      </div>
-      <UnallocatedBanner toBeAllocated={overview.toBeAllocated} />
+      <UnassignedHeadline
+        unassigned={overview.unassigned}
+        carriedOverspend={overview.carriedOverspend}
+        overspentTotal={overview.overspentTotal}
+        onSpread={handleAutoAllocate}
+        onCover={handleCoverAll}
+      />
+      <div className="flex justify-between px-1 text-[13px] text-muted-foreground tabular-nums">
+        <span>{formatRand(overview.totalIncome)} in</span>
+        <span>{formatRand(overview.totalAssigned)} assigned</span>
+        <span>{formatRand(overview.totalExpenses)} spent</span>
+      </div>
```

Deleted: `budget-donut-chart.tsx`, `budget-category-summary-tile.tsx`
(**grep first** — imported from more than the budget page),
`unallocated-banner.tsx`.

### `src/components/budget/unassigned-headline.tsx` (new)

```tsx
const isOver = unassigned < 0;
const isDone = unassigned === 0;

if (isDone) return (
  <Card className="rounded-2xl border-success/35 bg-success-surface p-4">
    <p className="text-sm font-semibold text-success">Every rand has a job</p>
    <p className="mt-1 text-sm text-muted-foreground">
      Nothing left to assign this month. {overspentTotal > 0
        ? `${formatRand(overspentTotal)} is over in a category or two — worth a look below.`
        : "Nothing over, either."}
    </p>
  </Card>
);

return (
  <Card className={cn("rounded-2xl p-[18px]",
    isOver ? "border-destructive/40 bg-destructive/[0.06]" : "border-warning/40 bg-warning-surface")}>
    <p className={cn("text-[13px] font-semibold", isOver ? "text-destructive" : "text-warning")}>
      {isOver ? "You've promised more than you have" : "Not given a job yet"}
    </p>
    <p className="mt-3 text-4xl leading-none font-semibold tracking-tight tabular-nums">
      {formatRand(Math.abs(unassigned))}
    </p>
    <p className="mt-3 text-sm leading-snug">
      {isOver
        ? "Take it back off a category, or the month starts behind."
        : "Money with nothing to do. Put it somewhere, or it just drifts."}
    </p>
    {carriedOverspend > 0 ? (
      <p className="mt-1.5 text-xs text-muted-foreground">
        Includes {formatRand(carriedOverspend)} that came off last month&apos;s overspend.
      </p>
    ) : null}
    <div className="mt-3.5 flex flex-wrap gap-2">
      <Button onClick={onSpread} className="h-10 rounded-full bg-emphasis px-4 text-emphasis-foreground">
        Spread it for me
      </Button>
      {overspentTotal > 0 ? (
        <Button variant="outline" onClick={onCover} className="h-10 rounded-full px-4">
          Cover the {formatRand(overspentTotal)} over
        </Button>
      ) : null}
    </div>
  </Card>
);
```

"Not given a job yet" replaces "R1 800,00 still needs a job", and the
over-assigned case gets its own words instead of the current "Over allocated".

### `src/components/budget/budget-category-row.tsx` (new — replaces the card)

Read-only. Tapping opens the sheet.

```tsx
<button
  type="button"
  onClick={() => onOpen(c.categoryId)}
  className="w-full space-y-1.5 border-b border-border/50 py-3.5 text-left last:border-0 cursor-pointer"
>
  <div className="flex items-baseline justify-between gap-2.5">
    <div className="min-w-0">
      <span className="text-[15px] font-medium">{c.categoryName}</span>
      <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
        {c.carriedIn > 0
          ? `${formatRand(c.assigned)} a month · ${formatRand(c.carriedIn)} carried over`
          : `${formatRand(c.spent)} of ${formatRand(c.assigned)}`}
      </span>
    </div>
    <div className="shrink-0 text-right">
      <span className={cn("block text-base font-semibold tabular-nums",
        c.available < 0 ? "text-destructive" : "text-primary")}>
        {formatRand(Math.abs(c.available))}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {c.available < 0 ? "over" : isSaving ? "saved" : "left"}
      </span>
    </div>
  </div>
  <Progress
    value={cap > 0 ? Math.min(100, (c.spent / cap) * 100) : 0}
    className={cn("h-1.5", c.available < 0 && "[&>div]:bg-destructive")}
  />
</button>
```

Grouped under `groupName` with `text-[11px] font-semibold uppercase
tracking-[0.1em] text-muted-foreground` headings — Bills, Day to day, Saving
up. The drag order you already support gets headings, so the eye finds the
flexible categories without reading every row.

### `src/components/budget/budget-category-sheet.tsx` (new)

Everything the eleven inline inputs used to do, in one deliberate place:

- Available figure, large, tinted by sign, with the carry-in derivation under it
  ("R3 200 carried over from before, plus R400 this month")
- Amount field + Save, plus quick chips: `+R100`, `+R500`,
  `Match last month (R5 600)`, `Empty it out`
- Rollover explainer, only when `rollover` is true and the category is a sinking
  fund: "Anything unspent stays here next month. At R400 a month you'll have
  R4 800 by November." — the projection is what makes the rule click
- This month's transactions in the category
- "Move money in from another category" → the transfer flow

### `src/app/(app)/new-month/page.tsx` (new)

Fires once after the budget-month start day passes. **Not a question** — no "is
it a new month?" prompt. A receipt for something that already happened, with
Skip applying the defaults anyway.

```
New month                                    Skip
─────────────────────────────────────────────────
August is done
Two categories went over, so R600 comes off
September unless you cover it.

┌─ Went over · R600 ──────────────── (destructive)
│  Groceries                              R420
│  Eating out                             R180
│  [Cover from Household]  [Take off September]
└─────────────────────────────────────────────────

┌─ Carrying over · R5 850 ─────────────── (success)
│  Car service                          R3 600
│  Household                            R1 240
│  Fuel                                   R700
│  Transport                              R310
└─────────────────────────────────────────────────

┌─ September starts with ──────────────────────────
│  R30 200 already assigned
│  Same amounts as August. Change any any time.
└─────────────────────────────────────────────────
        [ Start September ]
```

Gate in the app shell, per `IMPLEMENTATION_CODE.md` Phase 6.

---

## 4 · Splits

### Before

Group summary chips first, then a group picker, then per-user owes, then
history. Two-person assumptions throughout.

### After

Overall figure, one card per person, recent shared spends. Groups become a
filter, because most households only ever use one.

```tsx
{balances.map((b) => (
  <div key={b.userId} className="flex items-center gap-3 rounded-xl border bg-card p-3.5">
    <AvatarCircle name={b.userName} size={38} />
    <div className="min-w-0 flex-1">
      <p className="text-[15px] font-semibold">{b.userName}</p>
      <p className={cn("text-[13px] font-medium",
        b.net > 0 ? "text-success" : b.net < 0 ? "text-destructive" : "text-muted-foreground")}>
        {b.net > 0 ? `Owes you ${formatRand(b.net)}`
          : b.net < 0 ? `You owe ${formatRand(-b.net)}`
          : "Settled up"}
      </p>
      <p className="text-xs text-muted-foreground">
        {b.net === 0 && b.lastSettledDate
          ? `Last settled ${format(parseISO(b.lastSettledDate), "d MMM")}`
          : `${b.itemCount} shared spend${b.itemCount === 1 ? "" : "s"}`}
      </p>
    </div>
    <Button
      variant={b.net !== 0 ? "default" : "outline"}
      onClick={() => (b.net !== 0 ? openSettle(b) : openHistory(b))}
      className="h-11 shrink-0 rounded-full px-3.5 text-[13px]"
    >
      {b.net !== 0 ? "Settle" : "History"}
    </Button>
  </div>
))}
```

Every shared-spend row states the share, not the total: "You paid · you, Sydney
· R900 / your R450". Page title becomes **Shared costs** — "Splits" is app
jargon.

### `src/components/splits/settle-sheet.tsx` (new)

Asks the one question it has to. Targets ordered most-negative first, so the
repayment defaults to repairing the thing that was bothering you:

> Groceries is R870 over, so it's suggested first. Putting the R1 240 there
> clears the overspend and leaves R370 in the category.

Button: `Settle into {category}`.

---

## 5 · Accounts and Transactions

### `account-create-fields.tsx`

```tsx
<div className="rounded-xl border border-primary/35 bg-primary/[0.06] p-3.5">
  <div className="flex items-center gap-2.5">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">Share with the house</p>
      <p className="text-xs text-muted-foreground">
        {otherMembers.map((m) => m.name).join(", ")}
      </p>
    </div>
    <Switch checked={isShared} onCheckedChange={setIsShared} />
  </div>
  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
    {isShared
      ? `${theyPronoun} see this balance and every transaction on it. ${TheyPronoun} won't see your budget, and ${theyPronoun} still assign ${theirPronoun} own money to ${theirPronoun} own categories.`
      : "Only you can see this account."}
  </p>
</div>
```

Stating the consequence at the moment of the decision is the whole design. A
privacy switch whose effect you have to guess gets left alone.

### `balance-check-sheet.tsx` (new)

Three figures, then two buttons:

```
HomeFinance thinks                          R4 350
Your bank says                              R4 100
─────────────────────────────────────────────────
Difference                                    R250   (destructive)

Probably a spend you haven't logged. You can go and
find it, or accept the difference — we'll record it
as one R250 line called Unaccounted so the number
stays honest.

[ Accept the R250 difference ]
[ Let me look for it first ]
```

"Accept" is primary. Forgiving by default, exact if you want it, and never a
silent correction.

### Transactions

- **My/theirs/combined toggle deleted.** Own rows plus shared-account rows.
  A `Adjustment` / `Split` / `Split ×3` chip carries the context the toggle used
  to.
- `/income` → `redirect("/expenses?type=income")`. Income types: Salary, Bonus,
  Interest, Gift, Other.
- Day-grouped with a per-day total.
- Every amount is the viewer's share: "Your half of R900 · −R450,00".

---

## 6 · Lists

The seam you liked, and the only one that survived your admin-weight objection —
because it fires **once per shop**, not once per item.

### `src/components/shared-lists/list-detail.tsx`

```tsx
{tickedCount > 0 ? (
  <Card className="rounded-2xl border-primary/35 bg-primary/[0.06] p-3.5">
    <p className="text-sm font-semibold">Done shopping?</p>
    <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
      Log what you spent and we&apos;ll clear the {tickedCount} ticked item
      {tickedCount === 1 ? "" : "s"}.
      {category ? ` ${category.name} has ${formatRand(category.available)} left.` : ""}
    </p>
    <Button onClick={openLogSheet} className="mt-2.5 h-11 w-full rounded-xl">
      Log the shop
    </Button>
  </Card>
) : null}
```

Opens `AddSheet` with `categoryId` from `shared_lists.category_id`,
`pickedIds` from the list's members, and `clearItemIds` from the ticked set.
One tap, then an amount, then done.

List items get `AvatarCircle size={24}` for who added them, and quantity stays
inline ("Dog food ×2") with the note underneath.

---

## 7 · Calendar

- **Initials, not dots.** `AvatarCircle size={17}` per attendee in the day cell,
  which answers "whose" at a glance.
- **Person filter** — Everyone / Matt / Sydney — as the primary filter, category
  colours secondary.
- **Day view under the grid**, not a separate screen.
- **`expected_cost_minor`** renders as `Expected R850 · Health` with a `Log it`
  action; `logged_expense_id` stops it firing twice.

Existing narrow-screen month swipe is right; unchanged.

---

## 8 · Reports

Replaces Summary. Period defaults to **since you started** (earliest
transaction), per your call.

Bar per month, income and spend paired:

```tsx
<div className="flex h-[132px] items-end justify-between gap-1">
  {months.map((m) => (
    <div key={m.month} className={cn("flex flex-1 flex-col items-center gap-1.5", m.isPartial && "opacity-45")}>
      <div className="flex h-[120px] items-end gap-0.5">
        <div className="w-[7px] rounded-t-sm bg-success" style={{ height: `${(m.incomeMinor / max) * 120}px` }} />
        <div className="w-[7px] rounded-t-sm bg-primary" style={{ height: `${(m.spentMinor / max) * 120}px` }} />
      </div>
      <span className="text-[9px] font-semibold text-muted-foreground">{m.label}</span>
    </div>
  ))}
</div>
```

The current month is dimmed — comparing a part-month against full ones is the
most common way a chart like this misleads.

Four reports: in and out per month, where it went, budget accuracy (assigned vs
actual), mortgage interest vs equity. Plus a "Worth doing" observation card:
"Fuel and Household have spare room nearly every month."

---

## 9 · Mortgage

### `mortgage-summary-card.tsx` → her view

Headline is **share of what's paid for so far**, not share of the whole house —
86% reads as true and moving, where 44% of a barely-started bond reads as
stalled.

```
You own                                    Breakdown
86%   of what's paid for so far
R888 360 of R1 038 000

[███████████████░░░░░░░░░░░░░░░░░░░░░]
● Your deposit                        R780 000
● Paid off since                      R258 000
● Still owed                        R1 842 000
─────────────────────────────────────────────────
Your deposit puts you well ahead early. As Matt's
larger payments add up you'll level out at
half each by March 2044.
```

Then four rows: your share this month, Matt's share, of yours interest ("the
bank's cut"), into the house ("buys your share"). Amortisation, rate periods
and extra payments stay behind **More details**.

### Setup, for any household

Asks total payment, deposits per person, target split. Solves the shares. Shows
the result before saving, and reports an unreachable target rather than clamping.

### `mortgage-story.ts` — three templates

`equal-no-deposit`, `equal-with-deposit`, `unequal-to-target`. Picked
deterministically from deposits and shares. Templated, not AI: an explanation of
someone's home equity that varies between reads, can't be tested, and might
invent a number is the wrong tool for that screen.

The closing line is the one that does the work:

> If you'd both paid half and half, Sydney would end up owning 62% because of
> the deposit. The uneven split is what makes it fair.

---

## 10 · Recon

- **Rule-matched group, one Accept-all.** Six rows that match a rule get one
  button, not six.
- **"Need a decision"** heading over the rest, so the unmatched ones are the only
  thing asking for attention.
- **Split avatars on the row**, per your ask, before accepting.
- **"Do this every time"** checkbox on the row you're already accepting —
  `Checkers → Groceries, split with Sydney`. This is the feature that makes
  Recon beat manual entry on effort rather than matching it.
- **Caught-up state shows the payoff:** "31 transactions came in this month. 27
  sorted themselves out from your rules — you only had to look at 4."
- **Amber border only for genuinely unknown merchants** (Dis-Chem could be
  Health, Household or Groceries). Guessed and matched rows read calm.
- **Own mailbox only, stated on screen.**

---

## 11 · Dark mode

Six tokens added to both blocks in `globals.css`:

| Variable | Light | Dark |
|---|---|---|
| `--success` | `#047857` | `#34d399` |
| `--success-foreground` | `#f8fbff` | `#0f1520` |
| `--success-surface` | `#e7f7f0` | `#12251f` |
| `--warning` | `#92400e` | `#fbbf24` |
| `--warning-surface` | `#fffaf0` | `#241f14` |
| `--emphasis` | `#0f1520` | `#e8edf5` |

Four things that are not a colour swap:

1. **`#ef4444` on `#161b27` reads brown and fails contrast.** Destructive text
   needs `#f87171` on dark; tint backgrounds go 6% → 9%.
2. **`#5b8def` takes dark text, not white.** Your token already pairs it with
   `#0f1520`; white on that blue is under 3:1. Weight goes up a step because the
   button reads lighter than in light mode.
3. **`--emphasis` inverts.** The near-black "Cover it" button is invisible on
   dark, so it becomes near-white with dark text. This is why it's a token and
   not a hard-coded hex in five components.
4. **Sheets need a lighter surface, not a shadow.** Shadows do nothing on
   `#0f1117`. The sheet sits at card level with a 1px `#262f42` top edge, and the
   scrim goes to 55% black.

Also: hero gradient flips direction (lift *toward* `#1b2436`, because a
darker-than-background card reads as a hole), and the today marker on the pace
bar becomes `--emphasis`.

Land this **before** Phases 4–12 are signed off, or every screen gets touched
twice.

---

## 12 · Copy — the whole vocabulary change

| Currently says | Should say |
|---|---|
| To be allocated | Left to give a job |
| Unallocated income | Not given a job yet |
| Auto-allocate | Spread it for me |
| R1 800,00 still needs a job | Not given a job yet · R1 800 |
| Over allocated | You've promised more than you have |
| Rollover from prior overspending | Came off last month's overspend |
| Allocated | Assigned |
| Remaining | Left |
| Month balance | Left in your categories |
| Budget (dashboard tile) | *deleted — it meant four different things* |
| Split this expense | Who's in on this |
| Splits (page title) | Shared costs |
| Summary | Reports |
| Recon | From your bank |
| Analyze spending | *stays — it's honest* |
| What you still owe (mortgage) | *stays — it's already plain* |
| Accounts are created by an administrator | Someone will approve your house shortly |

Two naming rules that caused real bugs in the current build:

- **One concept, one word, everywhere.** "Budget R6 480" on the dashboard tile
  was income-minus-expenses; the greeting called the same figure "month
  balance"; the Budget page called a *different* figure "to be allocated". Three
  names, two meanings, one number.
- **Never name a figure after the calculation.** "Base to assign", "rollover
  adjustment" and "prior month cash overspend" are all in the current
  `BudgetOverviewResult`. They're implementation names that leaked into the UI.

---

## 13 · Accessibility and mobile

| Item | Change |
|---|---|
| `expense-item.tsx` edit/delete | `h-9 w-9` → `h-11 w-11` on mobile |
| Category pills | `min-h-11`, not just padding |
| Keypad keys | `h-12`, `touch-manipulation` |
| Participant avatars | `h-11 w-11`, `aria-pressed` |
| Pace bar | needs `role="img"` + `aria-label` with the figures — it's the only place ahead/behind is communicated, and colour alone won't do |
| Sheets | focus trap, `Esc` to close, scrim click to dismiss |
| Amount keypad | hidden `<input inputMode="decimal">` behind it for screen readers and hardware keyboards |
| Toasts | `aria-live="polite"`; Undo must be reachable by keyboard |
| Row tone | never colour alone — every `bad` row also says "over" in words |

---

## 15 · Desktop

Designed in Pass 1, missing from the sections above.

### Before

`app-shell.tsx` puts the sidebar on the **right** at 20% width, and the content
column is capped at `max-w-4xl`. On a 1440px screen that leaves a wide empty
gutter between a narrow single-column stack and the nav. Every screen is the
mobile layout with whitespace around it.

### After

Sidebar left at a fixed width, grouped; content in two columns.

```diff
-      <div className="flex">
-        <main className="flex-1 px-6 py-4">
-          <div className="mx-auto max-w-4xl">{children}</div>
-        </main>
-        <aside className="hidden w-1/5 border-l md:block">
-          <SidebarNav />
-        </aside>
-      </div>
+      <div className="flex min-h-[calc(100vh-3.5rem)]">
+        <aside className="hidden w-58 shrink-0 border-r bg-background/95 px-2.5 py-3.5 md:block">
+          <SidebarNav />
+        </aside>
+        <main className="min-w-0 flex-1 px-6 py-5">{children}</main>
+      </div>
```

Left, because every desktop app the household already uses puts navigation
there, and because the eye starts at the top-left of the content — a right
sidebar makes the primary column begin at an arbitrary offset.

### Home, two columns

```tsx
<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
  <div className="flex min-w-0 flex-[1.35] flex-col gap-4">
    <EnvelopeHero {...hero} layout="wide" />
    <NeedsYouList items={needsYou} />
    <RecentTransactions rows={recent} />
  </div>
  <div className="flex min-w-0 flex-1 flex-col gap-4">
    <CategoryRemaining categories={categories} showCount={8} />
    <HouseholdStrip events={todayEvents} tasks={openTasks} />
  </div>
</div>
```

`layout="wide"` puts the figure and the pace bar side by side instead of
stacked, so the hero reads as a band rather than a tall block:

```tsx
<div className={cn(layout === "wide" && "flex items-center justify-between gap-6")}>
  <div className="min-w-0">{/* label, figure, per-day line */}</div>
  {layout === "wide" ? (
    <div className="w-[300px] shrink-0 space-y-2">{/* pace bar + owed line */}</div>
  ) : null}
</div>
```

`showCount={8}` on desktop rather than 5 — the column exists, so use it.

### `src/components/layout/sidebar-nav.tsx`

```tsx
{sidebarGroups.map((group) => (
  <div key={group.name} className="flex flex-col gap-0.5">
    <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
      {group.name}
    </p>
    {group.items.map(({ href, label, icon: Icon }) => {
      const isActive = pathname === href || pathname.startsWith(href + "/");
      return (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors cursor-pointer",
            isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{label}</span>
        </Link>
      );
    })}
  </div>
))}
```

Fourteen flat routes become four groups. The mobile hamburger reads the same
`sidebarGroups` array, so the two can't drift.

### `src/components/layout/header.tsx`

```diff
-      <span className="text-base font-semibold">Home</span>
+      <div className="flex min-w-0 items-center gap-2.5">
+        <span className="text-[15px] font-semibold">HomeFinance</span>
+        <span className="truncate text-[13px] text-muted-foreground">{householdName}</span>
+      </div>
```

and on the right, the budget period spelled out:

```tsx
<span className="hidden text-[13px] text-muted-foreground tabular-nums sm:inline">
  {periodLabel}   {/* "25 Aug – 24 Sep" */}
</span>
```

The header currently says "Home" on every route, which is both wrong and a
wasted slot. The period earns it: the start day is configurable, so "August"
alone is ambiguous when payday isn't the 1st — and two people disagreeing about
which month a spend fell in is one of the bugs the household-level setting fixes.

---

## 16 · Getting set up

Designed in Pass 2 and 3. Your five-step flow is sound; what it was missing is
the other person.

### `src/components/onboarding/onboarding-flow.tsx`

```diff
 const STEPS = [
+  "household",   // new — name it, invite people
   "accounts",
   "payday",
   "income",
   "categories",
   "budget",
 ] as const;
```

Six steps, so the progress bar goes from five segments to six. The resumable
state logic you already have needs nothing beyond the new key.

### `src/components/onboarding/steps/onboarding-household-step.tsx` (new)

```
Set up                                  Skip for now
─────────────────────────────────────────────────────
[■][ ][ ][ ][ ][ ]

Who's in the house?
Most of this app is better with someone else in it —
shared costs, the calendar, lists. You can add people
later, but now is easier.

House name
┌─────────────────────────────────────────────────┐
│ Jordaan house                                   │
└─────────────────────────────────────────────────┘

Invite someone
┌─ (S) sydney@example.com ─────────────────── ✕ ──┐
│      Invited · waiting for her to join          │
└─────────────────────────────────────────────────┘
┌ + Add another person ───────────────────────────┐
└─────────────────────────────────────────────────┘
[ Share a join link instead ]

┌─────────────────────────────────────────────────┐
│ What they'll see: the calendar, lists, shared   │
│ costs, the mortgage, shared account balances    │
│ and household totals.                           │
│ Not: your budget or what you earn.              │
└─────────────────────────────────────────────────┘

        [ Next · when you get paid ]
```

That privacy paragraph is the most important copy in the flow. Someone being
asked to put their financial life into an app their partner installed needs the
boundary stated before they agree, not buried in Settings afterwards.

### `onboarding-payday-step.tsx`

```diff
-        <p>This sets your budget month.</p>
+        <p className="text-sm text-muted-foreground">
+          This sets the budget month for the whole house, so you&apos;re both
+          always looking at the same one.
+        </p>
```

Household-level, per Phase 14. Where members previously disagreed,
`budget_month_notice_pending` shows a one-time banner naming the day now in use.

### The joining side

Undesigned until now, and the more delicate of the two. The person accepting an
invite arrives to a house that already has a budget month, shared accounts and
possibly a mortgage plan. Their first run is not the inviter's:

```
You've joined Jordaan house
Matt set this up. Here's what's already shared with you.

┌─ Already here ──────────────────────────────────┐
│ Budget month     25th to the 24th               │
│ Shared accounts  House account · R12 840        │
│ Mortgage         Your share R8 988 a month      │
│ Lists            Shopping, House jobs           │
└─────────────────────────────────────────────────┘

Your own budget is private, and empty. Let's set it
up — about two minutes.

        [ Set up my budget ]
        [ Look around first ]
```

Then steps 2–6 of the normal flow, skipping household setup.

### `src/app/(app)/how-this-works/page.tsx` (new)

Two concepts genuinely need explaining, and only one of them is the mortgage.

**Envelope rollover:**

```
How this works                                    ←
─────────────────────────────────────────────────────
Money with a job

1  Everything you earn gets assigned to a category
   Rent, groceries, fuel, saving for the car service.
   When nothing's left unassigned, every rand has a job.

2  Whatever you don't spend stays where it is
   R400 a month into Car service, untouched, means
   R4 800 sitting there by November. No maths, and no
   separate savings account to remember.

3  Whatever you overspend comes off next month
   Groceries went R420 over? Either move it from a
   category with room, or September starts R420 lighter.

4  That's the whole system
   No envelopes to lick, no spreadsheet. The number on
   Home is just what's left across all your categories.
```

Reachable from Settings, from the new-month screen, and from the first-run
explanation on Budget. It never expires and is never permanently dismissed —
people come back to this in month four, when a sinking fund finally pays out.

**Mortgage equity:** the three templates in section 9.

### Tutorial approach

Per your answer, **no guided tour.** Two things instead:

1. This screen, always reachable.
2. Short help text in place, on the screen where the concept first bites — the
   rollover explainer inside the category sheet, the privacy line under the
   sharing switch, the "not in an envelope yet" line on the breakdown sheet.

A tour gets dismissed on first launch and teaches nothing about envelope
budgeting, which is a thing you learn by doing one month of it.

---

## 17 · Still not designed

Honest list. None of these are features — they're the states between features,
which is usually what makes software feel unfinished.

| State | What's needed | Why it matters |
|---|---|---|
| Waiting for approval | `/pending-approval` lands on a near-empty screen. Needs what's happening, roughly how long, and what to do if it stalls | It's the first screen a new user sees, and it currently reads as broken |
| Empty states | Every list, category list, report and the Recon inbox. `EmptyState` already takes `title`/`message`/`action` | "No data" tells someone nothing, and a first-run app is *all* empty states |
| Offline | A queued-spend indicator. The PWA, optimistic writes and offline indicator all exist; what an unsent spend looks like is undecided | Someone logs a shop while standing in the shop, where signal is worst |
| Failed optimistic write | Rollback design, especially for a split — it touches two people's balances, so it must roll back both or neither | A half-reverted split is a wrong number in someone else's app |
| Money notifications | Push exists for calendar. Overspend, settle request and money landing are all candidates, all easy to overdo | Overdo it and people disable notifications entirely, losing the calendar ones too |
| Goals | Never got a pass. Currently two long text-heavy cards | It was on the original list and lost to the money loop |
| Settings | Never designed. A flat list that will keep growing | Account sharing, budget month, dashboard tiles and the Recon connection all live here now |
| Login / register | Untouched | Fine as-is, but it's the front door if you market this |
| Budget AI report | Untouched, and **its prompt states the old rollover rule** | Flagged in CODE Phase 2 — it will confidently explain behaviour that no longer exists |

### Confirmed for beta

- **Goals** merge into the envelope model — a category with a target date and a
  monthly amount. `/goals` is a filtered budget view; see PLAN Phase 12b.
- **Notifications**: push only for splits involving you, calendar events and
  reminders. Overspend and settle requests stay in-app on the needs-you rows.
- **Failed split**: the Pass 4 recovery design ships as-is — both sides revert or
  neither.
- **Approval wait** is out of beta scope; copy-only.

The first five are Phase 15. Goals and Settings deserve a pass of their own once
the money loop is real — both are places where the row shape and the grouped-nav
thinking apply directly.

---

## 18 · What's deliberately unchanged

Worth stating so nobody "fixes" these later:

- **Bottom nav is still Home, Calendar, Lists, Budget.** You were right; burying
  calendar and lists would recreate the three-apps problem you built this to
  escape.
- **Budgets stay per-person.** Not a house budget. Once accounts can be shared,
  a joint budget is a different product decision.
- **`resolveEffectiveAllocations`** — the "same amounts as August" convenience —
  stays exactly as it is. Different mechanism from leftover rollover.
- **Optimistic writes and the offline indicator** stay. Only the failure-state
  design is new.
- **`month-navigator.tsx`, `collapsible-section.tsx`, `AvatarCircle`,
  `EmptyState`, `SectionHeader`, `Progress`, `AllocationBar`** — all reused
  as-is. This is a re-composition, not a new component kit.
- **The admin portal and household approval flow** are untouched apart from the
  waiting-screen copy.
