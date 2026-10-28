# Design system (HomeFinance)

Tokens live in [src/app/globals.css](../src/app/globals.css). Tailwind 4 maps semantic colors via `@theme inline`.

## Page chrome

- **Title:** `text-xl font-semibold tracking-tight` — use `PageHeader` from `src/components/ui/page-header.tsx`
- **Section label:** `text-sm font-medium text-muted-foreground`
- **Mobile bottom nav clearance:** `pb-24 md:pb-6` on scrollable pages

## Surfaces

- Default card: `rounded-lg border bg-card p-3 text-sm`
- Dashboard tiles may use `rounded-2xl border-border/60 bg-card/90 shadow-sm` — prefer converging on `Card` over time

## Semantic colour tokens

Beyond the shadcn set, the UX pass added three pairs. Use them rather than
hard-coded greens and ambers, because both themes are defined for each.

| Token | Means |
|-------|-------|
| `--success` / `--success-surface` | On track, settled up, saved |
| `--warning` / `--warning-surface` | Needs attention but nothing is broken yet |
| `--emphasis` / `--emphasis-foreground` | The one figure a screen is about |
| `--sheet` / `--sheet-edge` / `--scrim` | Bottom-sheet surface, its top edge, and the backdrop |

Shadows do nothing on the dark background, so a sheet separates from the page
by surface and edge, never by shadow.

## Shared components

| Component | Path | Use for |
|-----------|------|---------|
| `PageHeader` | `components/ui/page-header.tsx` | Page title + optional actions |
| `EmptyState` | `components/ui/empty-state.tsx` | No data messaging |
| `Sheet` | `components/ui/sheet.tsx` | Bottom sheet — the default for anything with more than one field (Add, category, settle, balance check) |
| `Dialog` | `components/ui/dialog.tsx` | Centred modal, for the older forms that have not moved to a sheet |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | Destructive confirms (prefer over `window.confirm`) |
| `SelectField` | `components/ui/select-field.tsx` | Styled native `<select>` |
| `AvatarCircle` | `components/ui/avatar-circle.tsx` | A person, by initials and a name-derived hue |

Both `Sheet` and `Dialog` render a native `<dialog>` through a portal, so they
stay in the DOM when closed. Anything selecting one in a test must use
`dialog[open]` or `getByRole("dialog")`.

## Feedback

- Success/error: **Sonner toasts** (`toast.success` / `toast.error`)
- Avoid inline `message === "saved"` when a toast already fires (see [mutations-ux.md](./mutations-ux.md))

## Dates and money

- Display dates: `formatDisplayDate()` in [src/lib/utils/date.ts](../src/lib/utils/date.ts)
- Display money: `formatRand(cents)` in [src/lib/utils/currency.ts](../src/lib/utils/currency.ts)
- All stored amounts are **integer cents**

## Naming

Two rules the UX pass introduced, both of which came from real bugs:

- **One concept, one word, everywhere.** The same figure was once "Budget" on
  the dashboard, "month balance" in the greeting and "to be allocated" on the
  Budget page — three names for two different meanings.
- **Never name a figure after its calculation.** "Base to assign", "rollover
  adjustment" and "prior month cash overspend" were implementation names that
  leaked into the UI.

| Concept | Word |
|---|---|
| `assigned + carriedIn - spent` | **Left** (in a category) |
| That summed across categories | **Left in your categories** |
| `income - assigned` | **Left to give a job**; at zero, "Every rand has a job" |
| Negative unassigned | **You've promised more than you have** |
| Auto-allocate | **Spread it for me** |
| A category's budget amount | **Assigned** |

## Navigation labels

Route labels are the user's words, not the developer's.

| Route | Label |
|---|---|
| `/dashboard` | **Home** |
| `/expenses` | **Transactions** (income lives here too) |
| `/splits` | **Shared costs** |
| `/recon` | **From your bank** |
| `/reports` | **Reports** (replaced Summary) |
| `/goals` | **Goals** — a filtered view of Budget, not a separate feature |

## The budget model

One line of arithmetic drives most of the UI, and it is worth knowing before
touching any figure on Home or Budget:

```
available = assigned + carriedIn - spent
```

- A **leftover** stays in its own category: `openMonth` writes it into the next
  month's `carried_in_minor` once, at open, and never recomputes it on read --
  so a closed month cannot change retroactively.
- An **overspend** does not carry in-category. It is summed and deducted from
  the next month's unassigned money, so a category never reads as over budget
  before a rand has been spent in it.
- `spent` is **your own share**, not the whole bill. A shared spend puts only
  your share in your envelope; every other share becomes a debt row.

The old `computePriorMonthCashOverspend` / `rolloverAdjustment` model is gone.
The ERD is in [README.md](../README.md); `/how-this-works/rollover` is the same
explanation written for the person using the app.

## Related

- [mutations-ux.md](./mutations-ux.md)
- [database.md](./database.md)
