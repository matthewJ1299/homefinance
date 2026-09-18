# Recon (bank email reconciliation)

Recon pulls **recent mail** from your connected Outlook account using **Microsoft Graph** (REST, not GraphQL), parses bank notification emails, compares them to existing expenses, and lets you **manually** decide each row.

## Feature access

Recon is a **household entitlement** set by a super-admin in `/admin/houses/[id]` (`household_features.recon`). There is no end-user Settings toggle. Without the entitlement, `/recon` shows a placeholder and mutating APIs return **403**. Server-side Microsoft Graph OAuth env vars must also be configured — see [feature access](./feature-access.md).

The **Outlook connection and mailbox sync** UI lives in `ReconGraphPanel` (`src/components/recon/recon-graph-panel.tsx`), mounted from `recon-page-client.tsx`.

## Related features

- **Expenses / income**: For **needs add** rows you choose **Posting** — **Expense** (default) creates a line through `ExpenseService.create` (same path as manual entry), or **Income** creates a line through `IncomeService.create` (salary vs other income). **Possible duplicate** rows are always resolved as expenses (duplicate accept / new expense); income posting is only offered for **needs add**.
- **Splits**: When **Split 50/50** is selected on approval, accepted rows create a split expense through `SplitService.createSplit` (equal split; uses the default split group).
- **Accounts**: Optional **default account** on the Recon page is used when you click **Accept and add** (links the new expense to that account).
- **Categories**: **Vendor category mappings** (`vendor_category_mappings`) learn a merchant key → category from each **Accept and add**; future syncs pre-fill the suggested category.
- **Merchant rules**: **"Do this every time"** (or the repeat toggle on the file-it sheet) writes a personal `recon_rules` row for that merchant. Later pending rows that match can be accepted in one go. Tap a rule under **Your rules** to change match, category, or who splits. See [Merchant rules](#merchant-rules).

## Need a decision

Unmatched pending rows (and every inflow) sit under **Need a decision**.

- Each amount is labelled **Out** (expense) or **In** (income). Colour is extra.
- A tap opens **Fetched mail detail** — the same dialog as the Description cell on the pending table, loading the Graph message body.
- **File it** on that dialog opens the Add sheet. Out defaults to the Spend tab; In defaults to Income. You can still switch tabs if the parser guessed wrong.
- **"Do this every time"** remains on Spend only. Merchant rules never auto-place inflows.

Stored `recon_import_items.amount` is signed: positive (including every row written before this) is Out; negative is In. Filing uses the absolute value. Duplicate matching against expenses uses the absolute value and is skipped for inflows — a deposit of R5 000 is not a duplicate of a spend of R5 000 that day.

## Pending list UX

On **Pending items**, the **Description** cell is clickable: it opens the **Fetched mail detail** dialog (loads the message from Microsoft Graph). The dialog repeats the list **Description** line at the top, then shows from, subject, received time, and full body.

Each row has a **Mark** column with a radio group: **None** (no bulk action for that row), **Ignore**, or **Accept**. Rows marked **Ignore** or **Accept** are visually muted. For **needs add** rows, **Posting** chooses **Expense** or **Income**; **Expense** requires a **Category** and can use **Split 50/50**; **Income** hides category/split and offers **Salary** vs **Other income**. **Amount** defaults to the parsed bank notification amount (ZAR); you can edit it before **Process marked** so the posted row uses that value (minor units sent to the API). **Note** defaults to `Recon` / `Recon: {vendor}` and is stored on the created expense or as the income description. Use **Process marked** to apply: ignores run first; **Accept** on a possible-duplicate row calls **accept duplicate**; **Accept** on a needs-add row calls **accept add** with the chosen posting kind. After a successful bulk run, a **summary** dialog lists the **date range** of processed txn dates, **counts** (accepted vs ignored, with new expenses vs new income vs duplicate), **per-category totals** for newly added **expenses**, **new income** total when applicable, and **separate bank-amount totals** for accepted (duplicates + new adds + income) vs ignored. If any **Split 50/50** rows were newly added in the run, a toast also shows the **total value of split purchases added**. Rows marked **Accept** as **Expense** with no category are **skipped**; rows with an invalid or non-positive amount are **skipped**; the summary and toasts explain how many. **Clear marks** sets every row back to **None**.

Ignored items are **persisted** (`recon_import_items.status = 'ignored'`) and **will not reappear** in Pending items on future mailbox syncs, even if the same email is fetched again.

Possible duplicates list the **existing expense row(s)** that matched (same calendar day and amount): **category**, **amount**, **note**, and **date** appear in a block directly under the pending recon row. If those expenses were deleted since sync, a short message explains that the link is stale.

## Fetched emails (after sync)

The collapsible **Fetched emails** list (returned with debug data from sync) supports:

- **Bank sender addresses only (type A & B)**: When enabled, only rows whose **From** address contains a substring from `RECON_TYPE_A_FROM_SUBSTRINGS` or `RECON_TYPE_B_FROM_SUBSTRINGS` in `parse-type-a.ts` / `parse-type-b.ts` are shown. This filters by sender only (not subject); it helps focus on the same addresses the parsers use for “from”.
- **Outcome**: **All**, **Imported** (pending add or duplicate), **Parse failed**, or **Not bank**. Pagination and counts apply to the filtered list; the section title shows `shown of total` when any filter is active.

## Merchant rules

Rules are **personal** (`owner_user_id`), not household-shared: only your mailbox is read, and only your rules apply to it.

- **Write:** from a needs-add accept, **"Do this every time"** / the repeat toggle calls `createReconRule`. The unique key is `(household_id, owner_user_id, match_kind, match_value)` — saving again from accept updates category and participants rather than inserting a duplicate. Accept always writes `merchant_exact` using the normalised merchant key.
- **Edit:** tap a row under **Your rules**. The sheet is match kind (exact / contains), merchant text, category, and who splits. Contains is how you generalise a branch-coded name. The owner is always in the split; everyone else is a toggle. Save is an `UPDATE` of that row. Pointing it at a merchant you already have a rule for is an error, not a merge.
- **Remove:** from the same sheet, after confirm. Already-filed spends stay.
- **Match:** `merchant_exact` or `merchant_contains`. A contains needle shorter than two characters after normalisation is rejected. A rule with no category is left for a person to decide. Overlaps: most-used rule wins, then exact beats contains, then longer needle.
- **Apply:** **Accept all** on the matched group runs each row through `ReconService.acceptAdd` with an even split across the rule's `participant_user_ids` (not "everyone in the house"). `times_used` increments after the batch.
- **Actions:** `createReconRule`, `updateReconRule`, `deleteReconRule`, `acceptAllRuleMatched` in `src/lib/actions/recon-rule.actions.ts` (not REST). Domain rules live in `ReconRuleService`. They return `{ success: false }` rather than throwing.

## Matching rule

- **Possible duplicate**: same signed-in user, **same calendar date** (`txn_date`), **same amount** (minor units, compared as an absolute value) as at least one existing expense. Inflows are never flagged as expense duplicates.
- **Needs add**: no matching expense for that date+amount, or the row is an inflow.
- Nothing is auto-posted: every row stays **pending** until you choose **Accept as duplicate**, **Accept and add**, or **Ignore**.

## Email parsing

Two templates are implemented in code:

| File | Role |
|------|------|
| `src/lib/services/recon/parsers/parse-type-a.ts` | Sender/subject filters + body regex for amount, date, merchant (`RECON_TYPE_A_FROM_SUBSTRINGS` exported for UI filters) |
| `src/lib/services/recon/parsers/parse-type-b.ts` | Second bank template (`RECON_TYPE_B_FROM_SUBSTRINGS` exported for UI filters) |

Edit the `FROM_SUBSTRINGS`, `SUBJECT_SUBSTRINGS`, and body regex patterns to match your bank’s notification emails. **Sync** only ingests messages that pass one of the type matchers and then parse successfully.

Amounts are stored **signed**. The figure’s magnitude comes from the rand text. Direction: a minus on the amount line is treated as **Out** (ABSA `Amount : -R…` is a debit); otherwise words such as deposit / credited / salary / payment received mark **In**. Unsigned purchases stay **Out**, which is also how every historical row was written. Re-sync rewrites pending amounts, so an old deposit that was stored unsigned becomes In after the next fetch.

Shared helper `parse-helpers.ts` **`parseDateToYyyyMmDd`** resolves yearless **DDMon** strings (e.g. `8Apr 15:52`) by scanning **all** such tokens in the combined subject/body and taking the first where the day is 1–31 and the letters are a known month. That skips accidental matches on amounts like **`.00 paid`** before the real bank timestamp.

## Environment and setup

See the main [README](../README.md) section **Recon and Microsoft Graph (Outlook)** for Azure app registration, redirect URI, and environment variables (`GRAPH_OAUTH_*`, `NEXTAUTH_URL`, optional `RECON_TOKEN_ENCRYPTION_KEY`).

## API routes (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/recon/graph/connect` | Start OAuth (redirect to Microsoft) |
| GET | `/api/recon/graph/callback` | OAuth callback (stores encrypted refresh token) |
| GET | `/api/recon/graph/status` | When Recon is off: `{ reconEnabled: false, connected: false, msAccountEmail: null, lastSyncedAt: null }`. When on: `{ reconEnabled: true, connected, msAccountEmail, lastSyncedAt }` |
| POST | `/api/recon/graph/disconnect` | Remove stored connection |
| POST | `/api/recon/sync` | Fetch mail + upsert `recon_import_items` (optional body `{ since?: "YYYY-MM-DD", top?: number, skip?: number }`; `skip` is Graph `$skip` for paging older messages) |
| GET | `/api/recon/items` | When Recon off: `{ reconEnabled: false, items: [] }`. When on: each item includes `matchedExpenses` (category, amount, note, date for each id in `matchedExpenseIds`) when present |
| POST | `/api/recon/items/[id]/accept-duplicate` | Mark duplicate resolved (no new expense) |
| POST | `/api/recon/items/[id]/accept-add` | Body: optional `entryKind` (`expense` default, or `income`); `categoryId` required for expense; `accountId` optional; `split` not allowed for income; optional `note`, `amount` (minor units); for income optional `incomeType` (`salary` or `ad_hoc`, default `ad_hoc`). Creates an expense (optionally split) or income via `IncomeService.create`. Response includes `expenseId` and/or `incomeId` as applicable. |
| POST | `/api/recon/items/[id]/ignore` | Ignore row |

## Database

- **Additive migration** `drizzle/0013_recon_pg.sql`: creates new tables only; does not delete existing app data.
- **`drizzle/0039_recon_rules_pg.sql`**: personal merchant rules (`recon_rules`). Unique on `(household_id, owner_user_id, match_kind, match_value)`.
- Apply with `npm run db:push` when deploying.
