# Goals (intent vs ledger)

> **This describes the pre-redesign goals feature.** Since the UX pass, a goal
> is a **category with a target amount and a target date** — `/goals` is a
> filtered view of Budget showing categories that have one, and assigning to a
> goal is the ordinary assign flow. There is no second way to move money.
>
> Migration `0043_goals_as_categories_pg.sql` added `categories.target_minor`
> and `categories.target_date` and backfilled savings goals into a "Goals"
> group. The `goals` and `goal_contributions` tables stay in place, read-only,
> for one release; the credit-payoff planning below has no replacement yet and
> is the part of this document still worth reading.
>
> Current behaviour: `src/lib/services/finance/goal-categories.ts`,
> `src/components/goals/goal-category-list.tsx`, and the budget model section
> of [design-system.md](./design-system.md).

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
