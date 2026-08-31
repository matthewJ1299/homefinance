# Design system (HomeFinance)

Tokens live in [src/app/globals.css](../src/app/globals.css). Tailwind 4 maps semantic colors via `@theme inline`.

## Page chrome

- **Title:** `text-xl font-semibold tracking-tight` — use `PageHeader` from `src/components/ui/page-header.tsx`
- **Section label:** `text-sm font-medium text-muted-foreground`
- **Mobile bottom nav clearance:** `pb-24 md:pb-6` on scrollable pages

## Surfaces

- Default card: `rounded-lg border bg-card p-3 text-sm`
- Dashboard tiles may use `rounded-2xl border-border/60 bg-card/90 shadow-sm` — prefer converging on `Card` over time

## Shared components

| Component | Path | Use for |
|-----------|------|---------|
| `PageHeader` | `components/ui/page-header.tsx` | Page title + optional actions |
| `EmptyState` | `components/ui/empty-state.tsx` | No data messaging |
| `ConfirmDialog` | `components/ui/confirm-dialog.tsx` | Destructive confirms (prefer over `window.confirm`) |
| `SelectField` | `components/ui/select-field.tsx` | Styled native `<select>` |

## Feedback

- Success/error: **Sonner toasts** (`toast.success` / `toast.error`)
- Avoid inline `message === "saved"` when a toast already fires (see [mutations-ux.md](./mutations-ux.md))

## Dates and money

- Display dates: `formatDisplayDate()` in [src/lib/utils/date.ts](../src/lib/utils/date.ts)
- Display money: `formatRand(cents)` in [src/lib/utils/currency.ts](../src/lib/utils/currency.ts)
- All stored amounts are **integer cents**

## Navigation labels

- Dashboard route `/dashboard` is labeled **Home** in mobile bottom nav and desktop sidebar

## Related

- [mutations-ux.md](./mutations-ux.md)
- [database.md](./database.md)
