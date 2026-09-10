# Goals

A goal is a **category with a target amount and a target date**. `/goals` is a
filtered view of Budget showing the categories that have one, and assigning to a
goal is the ordinary assign flow — there is exactly one way to move money.

Migration `0043_goals_as_categories_pg.sql` added `categories.target_minor` and
`categories.target_date` and backfilled savings goals into a "Goals" group.

Current behaviour lives in
[`src/lib/services/finance/goal-categories.ts`](../src/lib/services/finance/goal-categories.ts),
[`src/components/goals/goal-category-list.tsx`](../src/components/goals/goal-category-list.tsx),
and the budget model section of [design-system.md](./design-system.md).

## The retired model

The pre-redesign feature stored goals in their own `goals` and
`goal_contributions` tables, with savings and credit-payoff variants, five
services and ten API routes. None of it was reachable from the UI after the
redesign, so it was removed: the routes, the services, and the components that
called them.

The **tables remain** — migrations here are additive, and a household that
had legacy rows keeps them. Nothing reads them.

The credit-payoff planning that model carried has **no replacement**. Its pure
maths survives in `src/lib/services/finance/credit.ts`, `goals.ts` and
`projections.ts`, exercised by the test suite and imported by nothing else, so a
debt-payoff view can be built on it rather than from scratch. The `goals` feature
description in the registry no longer claims debt payoff.

## How it worked (historical)

## Purpose

Goals answer **what you intend** to do (save toward a target or pay down a card) without turning those movements into **expenses**. The ledger (`account_transactions`) remains the source of truth for balances; `goal_contributions` links ledger rows to a goal.

## Savings goals

- **Actual (solid UI):** Progress comes from net contributions minus withdrawals recorded against the goal, tied to real transfers into the linked account.
- **Monthly tracking:** Compared to your **monthly target** for the selected budget month.
- **Projection (dashed / faded UI):** Completion months are **computed on request** from remaining amount and a monthly pace. Nothing is stored as a projection.

## Credit goals

- **Actual:** Debt is derived from the **live balance** of the linked credit account. Payments and manual interest entries create real ledger transactions and linked `goal_contributions` rows.
- **Strategies (projection only):** The Goals page compares **Avalanche**, **Snowball**, and **Target date** using live math:
  - Avalanche and Snowball each use the **monthly payment you enter** (defaults to your plan / monthly target). With **one** linked card, both strategies often match at the same payment; the UI still lets you enter **different** payments to compare two payoff speeds side by side.
  - **Target date** takes a `yyyy-MM` month and estimates the **minimum monthly payment** needed to finish by then (if possible).
- Projections are **never persisted**; use `POST /api/goals/[id]/projection-scenario` for what-if scenarios. The credit projection UI includes a **months slider** (`horizonMonths`): it computes the **minimum payment** to clear the card within that many months and shows **deltas vs your plan** and **vs one month faster** (live math in `buildHorizonSliderScenario`).

## Activity list

Every activity row must reference a real `account_transaction_id` from the ledger. The UI shows the transaction id and optional counterparty hint when the movement is a **transfer**.

## APIs

| Endpoint | Role |
|----------|------|
| `GET /api/goals` | List goals |
| `GET /api/goals/[id]/detail?month=&limit=&offset=` | Goal shell: typed `actual`, `projected`, paginated `activity` |
| `POST /api/goals/[id]/projection-scenario` | Live savings or credit scenario (no storage) |
| `GET /api/goals/[id]/progress` | Existing progress payload (unchanged) |
| `POST .../contribute`, `withdraw`, `pay`, `interest` | Create ledger + contribution bridge |
| `PATCH /api/goals/[id]` | Edit goal fields |

## Related

- **Dashboard** goal tiles: [`goals-summary-tile`](../src/components/dashboard/goals-summary-tile.tsx), credit summary (uses summary API).
- **Budget month:** The Goals page month navigator follows the same `month` query param and budget-month rules as Budget.
