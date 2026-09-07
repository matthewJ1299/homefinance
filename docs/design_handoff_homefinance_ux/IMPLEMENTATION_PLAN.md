# HomeFinance — implementation plan

Branch: `redesign/ux-pass`, from `multi-tenant-admin`
Commits: one per phase.

Derived from the design pass in this project. Ordered so that each phase is
shippable on its own and nothing is built twice. Phases 1–3 are load-bearing:
everything after them reads from what they establish.

Paths are relative to the repo root.

---

## Decisions this plan encodes

| Decision | Value |
|---|---|
| Rollover | Leftover stays in the category; overspend comes off next month |
| Overspend prompt | At the moment it happens, and again at month end |
| Shared spends | Pick who was involved; divide equally among those picked |
| Your budget | Only your share hits your envelope |
| Safe to spend | Unspent in your categories; owed money sits below the line |
| Settling | You choose which category the repayment lands in |
| Cash check | Type the bank's balance; accept the gap as one visible line |
| Budget privacy | Budgets and income private; shared accounts' rows visible to sharers |
| Transactions | Your own rows only — no my/theirs/combined |
| Reporting | Replaces Summary; period runs from when you started |
| Mortgage setup | Deposits + target split in, monthly shares out |
| Mortgage story | Templated, three cases, deterministic |
| Rate change | Total moves, each share recalculates to protect the target |
| Home rows | Compact tiles with colour + icon (option 4c) |
| Uncovered overspend | Deducted from next month's unassigned money |
| Budget month start | Household-level; migrates from the household creator |
| `/income` | Redirects into `/expenses` with the income type filter preset |
| `/summary` | Redirects to `/reports` |
| Goals | Become categories with a target date and monthly amount; `/goals` is a filtered budget view |
| Notifications (beta) | Split added/changed involving you, calendar events, reminders. Nothing else pushes |
| Approval wait | Out of beta scope; copy-only fix for now |
| Failed split | Roll back both sides and say so, as designed in Pass 4 |

---

## Phase 0 — Guardrails first

The design review caught the same class of bug four times: a total that did not
equal the sum of its parts. Build the test before the features.

`src/__tests__/unit/reconcile.test.ts` — for any month and user, assert:
- sum of category `available` === envelope total shown on Home
- sum of category `spent` === sum of that user's expense shares
- `assigned + carriedIn - spent === available` per category
- account ledger balance === sum of its transactions

Run it as a `describe.each` over three fixture households: 1 person, 2 people,
4 people. The 4-person fixture is the one that catches `others[0]`.

Then, in the same phase:

- **Rollover across three months** — assign, underspend, overspend, and assert
  the carry chain. Month 3's figures must not change when month 1 is edited.
- **Participants at 1, 2 and 4** — Σ shares === amount; only your share hits
  your allocation; every other share becomes exactly one debt row.
- **Mortgage share solver** — given deposits, price, term, rate and a target
  split, the solved shares must reach the target within a rand at term end.
- **Unreachable target** — assert it reports unreachable and returns the closest
  reachable split rather than silently clamping.
- **Balance-check adjustment** — accepting a gap makes the ledger equal the
  entered balance exactly, via one visible row.
- **Report totals** — every report figure equals the same sum computed from the
  raw ledger. This is the check that would have caught the arithmetic slips in
  the design review.
- **Recon rule matching** — a rule applies to the merchants it should and not to
  near-misses; a rule is scoped to its owner.

Nothing else lands in the branch until these pass against current behaviour.
The rollover and report assertions will fail today — Phases 2 and 9 are what
make them pass, so mark them `.failing` rather than deleting them.

---

## Phase 1 — Schema

New migrations, continuing the numbered ledger after `0032_household_approval_pg.sql`.
All additive; `npm run db:push` must stay safe to re-run.

**`0033_expense_participants_pg.sql`**
```
expense_participants
  id, expense_id FK, user_id FK, share_minor int, created_at
  unique (expense_id, user_id)
```
Backfill: for every existing split expense, two rows from the current
payer/other-user pair; for every non-split expense, one row for `expenses.user_id`
with `share_minor = amount`. This is what retires `findAllExcept(userId)[0]`.

**`0034_category_rollover_pg.sql`**
```
budget_allocations   + carried_in_minor int not null default 0
categories           + rollover boolean not null default true
```
`carried_in_minor` is written once when a month is opened (Phase 6), never
computed on read — so a closed month cannot change retroactively.

**`0035_account_sharing_pg.sql`**
```
accounts + is_shared boolean not null default false
```
Household-scoped already; `is_shared` decides row visibility.

**`0036_income_types_pg.sql`**
```
income + income_type text not null default 'salary'
         check (income_type in ('salary','bonus','interest','gift','other'))
```
Backfill from the existing salary/other flag.

Rollback for each migration in this phase: every change is additive, so
`DROP TABLE` / `DROP COLUMN` is sufficient and loses only derived data. The two
exceptions are noted at `0041`.

**`0037_mortgage_plan_pg.sql`**
```
mortgage_deposits    id, mortgage_id, user_id, amount_minor
mortgage_targets     id, mortgage_id, user_id, target_share_bp int   -- basis points
```
`mortgage_user_configs` keeps the derived monthly share; these two hold the
inputs so it can be recalculated when the rate changes.

**`0038_recon_rules_pg.sql`**
```
recon_rules
  id, household_id, owner_user_id, match_kind, match_value,
  category_id, participant_user_ids int[], times_used int, created_at
```
Owner-scoped: rules are personal, like the mailbox.

---

## Phase 2 — Per-category available (the core change)

`src/lib/services/budget.service.ts`

- Delete `computePriorMonthCashOverspend` and `rolloverAdjustment`.
- Add to the per-category result: `carriedIn`, `available = assigned + carriedIn - spent`.
- `getOverview` returns:
  - `envelopeTotal` = Σ(assigned + carriedIn)
  - `envelopeLeft` = Σ available  ← the Home hero figure
  - `unassigned` = income − Σ assigned  ← the Budget headline
  - `overspentTotal` = Σ(−available) where available < 0
- New `openMonth(month, userId)`: computes `carried_in_minor` per category from
  the prior month's `available`, pre-fills fixed categories, applies recurring
  templates. Idempotent — safe to call twice.
  - **Positive available** carries into the same category.
  - **Negative available** does not carry into the category. It is summed and
    deducted from the new month's unassigned money, so the category starts clean
    at its assigned amount and the shortfall is visible once, at the top, where
    it can be assigned against. Carrying it in-category would mean a category
    could read as over budget before a single rand was spent in the new month.
  - When the user chooses "cover it" at month end instead, the transfer happens
    first and `openMonth` then sees nothing negative to deduct.
- New `coverOverspend(fromCategoryId, toCategoryId, amount, month, userId)` —
  reuses the existing budget-transfer path.

Update `docs/design-system.md` and the budget section of `README.md` in the same
commit; the old rollover behaviour is documented there.

**Callers to touch:** `src/app/(app)/budget/page.tsx`,
`src/app/(app)/dashboard/page.tsx`, `src/lib/services/summary.service.ts`,
`src/components/budget-ai/*` (the AI prompt states the old model).

---

## Phase 3 — Participants (the N-person fix)

- `src/lib/services/expense.service.ts` — accept `participants: {userId, shareMinor}[]`.
  Validate Σ shares === amount. Your own share is what hits your allocation;
  every other participant's share becomes a debt row.
- `src/lib/services/split.service.ts` — replace pairwise assumptions with
  per-participant balances. `getStatementSinceLastSettlement` becomes
  `getBalances(userId)` returning one row per other member, plus a per-person
  statement call.
- `src/lib/actions/expense.actions.ts`, `src/lib/actions/split.actions.ts` —
  remove `findAllExcept(userId)[0]` (5 sites).
- `src/app/(app)/what-i-owe/page.tsx` — drop `others[0]`; render a person picker
  when the household has 3+ members.
- `settleUp(userId, otherUserId, amount, targetCategoryId)` — the repayment
  lands in the chosen category.

Remove `otherUserName` from the props of `dashboard/page.tsx`,
`budget/page.tsx`, `add/page.tsx`; pass the member list instead.

---

## Phase 4 — The Add sheet

- New `src/components/add/add-sheet.tsx` — replaces
  `src/components/expenses/quick-add-form.tsx` as the entry surface. Keep that
  file's server actions and optimistic-write logic; change only the UI.
- Keypad, category pills carrying `available`, participant avatars (you
  pre-selected and alone), live consequence panel, chips for date/account/note.
- Nudge control for uneven splits — replaces the exact-amount inputs and the
  balance-to-zero helper in the old dialog.
- Income tab with the five types.
- `src/app/(app)/add/page.tsx` becomes a long-press menu for task/event only;
  the centre bar button opens the sheet directly.
- One toast with Undo, replacing the current three.

---

## Phase 5 — Home

- `src/components/dashboard/needs-you-list.tsx` — one row type, compact tiles
  (4c). Sources: overspent categories, unassigned money, per-person balances,
  today's events, list items, unchecked accounts, goals behind plan.
  Priority sort; the top item renders expanded.
- `src/components/dashboard/envelope-hero.tsx` — `envelopeLeft`, per-day figure,
  pace bar, breakdown sheet (owed money below the line).
- `src/components/dashboard/category-remaining-list.tsx`.
- Delete `home-stats-strip.tsx`, `budget-warning-tile.tsx`,
  `split-balance-banner.tsx`, `today-calendar-tile.tsx`,
  `dashboard-income-section.tsx` — all become row types.
- Keep `when-dashboard-tile-enabled.tsx` and the Settings toggles; they now
  govern row types.
- Header shows the budget month as a date range.

---

## Phase 6 — Budget, category sheet, month end

- `budget-overview.tsx` — remove the donut and the four-stat grid. Keep one
  headline (unassigned) and a three-figure line.
- Delete `budget-donut-chart.tsx`, `budget-category-summary-tile.tsx`
  (drops the `recharts` dependency from this route).
- `budget-category-card.tsx` → read-only row; new
  `budget-category-sheet.tsx` holds the amount keypad, quick-add chips,
  rollover explainer and that category's transactions.
- Group rows by kind — reuse the existing drag order within groups.
- New `src/app/(app)/new-month/page.tsx` + `month-open-card.tsx`: fires once on
  first load after the budget-month start day passes. Overspend with
  cover-or-carry, carryover list, "September starts with", one confirm.
  Replaces "Populate this month" in Settings.

---

## Phase 7 — Splits and settling

- `splits-page-client.tsx` → balance per person first, groups as a filter.
- `settle-sheet.tsx` — category picker defaulting to the most overspent.
- `/what-i-owe` keeps the printable statement; add the mortgage-story link.

---

## Phase 8 — Accounts

- `account-create-fields.tsx` — shared/private switch with the consequence text.
- `accounts-manage.tsx` — chip per account; credit shows limit and available.
- New `balance-check-sheet.tsx` — enter the bank's balance, show the gap, accept
  it as one `Unaccounted` category transaction (create that category on first
  use, flagged so reports can separate it).
- Transactions page: drop the my/theirs/combined toggle; show own rows plus rows
  on shared accounts.
- Merge `/income` into it with a type filter. `/income` becomes a redirect to
  `/expenses?type=income` so existing links, the nav item and any PWA shortcuts
  keep working; the add-income path is the Add sheet's Income tab.
- Home shows a cash-behind-envelopes row only when the shortfall is negative.

---

## Phase 9 — Reports

- `src/app/(app)/reports/page.tsx`; `/summary` redirects to it. Retire
  `monthly-snapshot.tsx`.
- `src/lib/services/report.service.ts`: monthly in/out series, category totals
  for a period, assigned-vs-actual per category, mortgage interest vs equity.
- Period defaults to since-you-started (earliest transaction). Current partial
  month rendered dimmed and labelled.
- Bars only. Tabs: Overview, Categories, Budget accuracy, The house.
- No household aggregate — reports are per-user.

---

## Phase 10 — Mortgage

- `mortgage-setup-form.tsx` — house price, total monthly payment, term, rate,
  deposits per person, target-split slider. Solve for each person's monthly
  share; show the result live.
- `src/lib/services/mortgage.service.ts`:
  - `solveShares({price, payment, term, rate, deposits, targets})`
  - unreachable-target result → closest reachable split + the two levers
  - on a rate change, recompute shares to hold the target (per the decision)
- `mortgage-story.ts` — three templates, selected from deposits and payment split:
  1. equal payments, no deposits
  2. equal payments, one deposit → names the drift, offers the fix
  3. unequal payments to a target → explains the declining percentage
- `mortgage-summary-card.tsx` → the "what I own" view: share of what's paid for
  so far, the three-part equity bar, this month's interest vs equity. Keep
  amortisation, rate periods and extra payments behind More details.
- New `src/app/(app)/how-this-works/[topic]/page.tsx` for rollover and equity.

---

## Phase 11 — Recon

- `recon-page-client.tsx`: rule-matched rows grouped under one Accept-all;
  unmatched rows under "Need a decision", each showing merchant, amount, date,
  guessed category and participants.
- Row sheet: category pills, participant avatars, consequence panel, and a
  "Do this every time" checkbox that writes a `recon_rules` row.
- Rules management screen; caught-up state states how many rows self-sorted.
- Accepting a row goes through the same expense service path as the Add sheet,
  so participants and rollover behave identically.

---

## Phase 12 — Lists and Calendar

- `list-detail.tsx` — "Done shopping?" card once anything is ticked; opens the
  Add sheet prefilled with the list's category tag and the list's members, and
  clears the ticked items on save.
- Add `category_id` to shared lists (migration `0039`).
- Lists overview: member initials, per-item author.
- Calendar: initials instead of dots, person filter, day view under the grid.
- Events carry an optional `expected_cost_minor` + `category_id` (migration
  `0040`); "Log it" opens the Add sheet prefilled.

---

## Phase 12b — Goals become dated categories

Confirmed: goals are not a separate feature. A goal is a category with
`target_minor`, `target_date` and the derived monthly amount, so the envelope
model does the arithmetic and money in a goal is money assigned like any other.

- Migration `0040b`: add `target_minor`, `target_date` to categories; backfill
  existing `goals` rows into categories in a `Goals` group, then leave the
  `goals` table read-only for one release before dropping it.
- `/goals` becomes a filtered view of the budget: categories with a
  `target_date`, showing saved / target, the monthly amount needed, and whether
  this month's assignment covers it.
- Assigning to a goal is the normal assign flow — no second way to move money.
- `goalsBehind` on Home is computed from the same figures (assigned this month
  < monthly amount needed), not from a separate table.
- Depends on Phase 2 (carryover) and Phase 6 (budget UI). Nothing else does.

---

## Phase 13 — Dark mode and tokens

`src/app/globals.css` — add to both blocks:
`--success`, `--success-foreground`, `--success-surface`, `--warning`,
`--warning-surface`, `--emphasis`. Values are in the Dark Mode document.
Then replace the ad-hoc greens and the hard-coded `#0f1520` emphasis buttons
with the tokens, and verify the four tinted card treatments in both themes.

---

## Phase 14 — Onboarding

- Invite becomes step 1 of `/welcome`; `onboarding-flow.tsx` gains an invite step
  and the step list grows to six.
- Budget month start day moves from `users` to `households` (migration `0041`).
  Backfill takes the household creator's day — deterministic, and in a household
  that has been running a while the creator is the one whose months the shared
  figures were already framed by. Members' existing values are left in place but
  unread for one release, so the migration is reversible; drop the column in a
  later release once nothing reads it.
  Where members disagreed, show a one-time notice naming the day now in use.
- Each step states what is private as it collects it.
- Joining flow for the invitee: they arrive to an existing household.

---

## Phase 15 — The unglamorous states

- `/pending-approval` — **deferred past beta.** Copy-only for now: what is
  happening and roughly how long. The designed waiting UX stays on the shelf.
- Empty states for every list, category list, report and the Recon inbox.
- Offline: what a queued write looks like before it sends.
- Failed optimistic write on a split — it touches two people's balances.
- Notifications, beta scope decided: **push** for a split added or changed that
  involves you, calendar events, and reminders. Overspend, settle requests and
  "money landed" stay in-app only — they appear on Home's needs-you rows, not on
  the lock screen.
- Failed split rollback as designed: both sides revert or neither, with a named
  recovery row. Confirmed as the priority in this list.

---

---

## Risk notes

- **Phase 2 is the one that can silently corrupt history.** `carried_in_minor` is
  written once when a month opens; if `openMonth` is not idempotent, running it
  twice doubles the carry. The reconciliation test is the guard — run it after
  every `openMonth` change.
- **Phase 3 changes what a number means.** Existing split expenses will start
  contributing half as much to the payer's category, so historical category
  totals move. Expected, worth stating in the release note, and the backfill
  must be checked against a copy of production before it runs anywhere real.
- **Phase 4 replaces the most-used surface in the app.** Keep
  `quick-add-form.tsx`'s server actions untouched so a revert is a UI revert.
- **Phase 6 deletes components other routes may import.** Grep before deleting;
  `budget-category-summary-tile.tsx` is referenced from more than the budget page.
- **Phase 10's solver can produce impossible plans.** A target split that a given
  payment and term cannot reach must be reported, not clamped — otherwise the
  app tells someone they are on track for something arithmetically unreachable.
  This is the failure mode with real consequences for a couple.
- **Phase 14 moves a setting between tables.** Two people looking at different
  budget months is the bug being fixed; a half-applied migration recreates it.

---

## Sequencing notes

- Phases 0–3 are the foundation and should land together as one reviewable PR
  before any UI work.
- Phases 4–6 are the visible redesign; they are independently shippable.
- Phases 7–12 can be parallelised across people once 0–3 are in.
- Phase 13 should land before any of 4–12 are considered done, or every screen
  gets touched twice.
- Keep `docs/` updated in the same commit as each behavioural change. Several
  docs currently describe the old rollover and the two-person split model.
