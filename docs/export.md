# Exports

Two downloads live under **Settings › Data and export**. Both are plain `GET` route handlers that do `auth()` → `setRequestContextFromSession` → service, respond with `Content-Disposition: attachment`, and write nothing.

| | Transactions CSV | Household export (JSON) |
| --- | --- | --- |
| Route | `GET /api/export/transactions` | `GET /api/export/household` |
| Service | `TransactionExportService` | `HouseholdExportService` |
| Scope | The signed-in user's own expenses and income, all time | The **whole household**, last **3 budget months** |
| Built for | Excel | An LLM (paste or upload to Claude and ask about spending) |

## Household export

### Why it looks the way it does

The consumer is a language model, not another program, so the file is optimised for legibility rather than size: every id has its name beside it, every amount is given as cents **and** rands **and** a formatted string, the budget-month windows are spelled out, and `meta.notes` explains the conventions in prose. One file, no companion schema needed.

### Window

"Last 3 months" means the current **budget month** and the two before it, resolved from the household's `budget_month_start_day` through `budgetMonthStartDayForUser` / `getDefaultBudgetMonthForUser`. The pure period logic is in `src/lib/services/household-export/periods.ts`:

- `lastBudgetMonthKeys(currentMonth, 3)` → `["2025-09", "2025-10", "2025-11"]`
- `budgetMonthWindows(keys, startDay)` → one `{ key, label, start, end }` per month
- `spanOfWindows(windows)` → the single contiguous `{ start, end }` the repositories are queried with

Each table is read **once** over the span and rows are assigned to a budget month while shaping (`budgetMonthKeyFromIsoDate`), so the export never filters by raw date prefix and never relies on the `month` column stored on a row.

### Dates on rows that have none

Ledger rows (`account_transactions`) and transfers only have `created_at`. The repository method `findInPeriodForHousehold` gives a ledger row an **effective date**: the linked expense or income's `date` when there is one, otherwise `created_at` read in `Africa/Johannesburg`. Transfers are dated by their creation day in app time. Both appear as `date` in the file, with `createdAt` kept alongside.

### Shape

Top level: `meta`, `members`, `categories`, `accounts`, `monthlySummary`, `expenses`, `income`, `transfers`, `settlements`, `ledger`.

- `meta` — `format`, `version`, `generatedAt`, `currency: "ZAR"`, `timeZone`, `household`, `exportedBy`, `budgetMonthStartDay`, `budgetMonths` (oldest first, with `label`, `start`, `end`), `range`, `notes` (prose conventions), `counts`.
- Money is always `{ minorUnits, rands, display }` (`fromMinorUnits` / `formatRand`).
- `expenses[]` — `date`, `budgetMonth`, `amount`, `category { id, name, group, semanticKey }`, `note`, `account`, `enteredBy`, `paidBy` (null when the same as `enteredBy`), `isSplit`, `participants[] { user, share }` from `expense_participants`, `splitGroupId`, `splitExpenseGroupId`, `createdAt`.
- `income[]` — `type` (`salary` / `ad_hoc`, the settlement flag) and `kind` (the user-facing taxonomy), `description`, `account`, `receivedBy`.
- `transfers[]` — `from`, `to`, `amount`, `note`.
- `settlements[]` — `payer`, `recipient`, `amount`, linked `expenseId` / `incomeId`.
- `ledger[]` — one signed row per account movement with `account`, `transactionType` and `source { type, id }`.
- `monthlySummary[]` — per budget month: totals, net, counts and `spendingByCategory` sorted largest first. Derived from the arrays in the same file; a convenience for the reader.

Shaping is pure (`src/lib/services/household-export/shape.ts`) and unit-tested in `src/tests/household-export.test.ts` along with the period logic and a service test with fake repositories.

### Scope and privacy

The export is **household-wide**: it includes every member's expenses and income, all household accounts (private ones included, labelled with `owner` and `isShared`), and every ledger row and transfer on them. That is deliberate, since the point is to analyse the household's spending as a whole, but it is wider than what the Transactions screen shows a non-owner. Any signed-in household member can download it.

### Repository additions

All read-only, all `requireHouseholdId()`-scoped, added for this export:

- `IAccountRepository.findAllInHousehold()`
- `IAccountTransactionRepository.findInPeriodForHousehold(period)` → rows with `effectiveDate`
- `ITransferRepository.findInPeriodForHousehold(period)`
- `ISplitSettlementRepository.findInPeriodForHousehold(period)`

Expenses and income reuse `findByMonth(month, undefined, undefined, period)`, which is household-wide when no `userId` is passed.
