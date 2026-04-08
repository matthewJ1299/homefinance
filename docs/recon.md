# Recon (bank email reconciliation)

Recon pulls **recent mail** from your connected Outlook account using **Microsoft Graph** (REST, not GraphQL), parses bank notification emails, compares them to existing expenses, and lets you **manually** decide each row.

## Feature toggle (Settings)

Recon is **off by default** per user (`users.recon_enabled`). Under **Settings**, enable **Bank email reconciliation (Recon)** before the **Recon** nav item and full UI appear. This is independent of push notifications or other settings. If the toggle is off, `/api/recon/graph/connect` and the OAuth callback redirect to **Settings**; mutating APIs return **403**. **POST `/api/recon/graph/disconnect`** can still be called to clear stored Graph tokens without the toggle (e.g. after disabling the feature).

## Related features

- **Expenses**: Accepted rows create expenses through `ExpenseService.create` (same path as manual entry).
- **Splits**: When **Split 50/50** is selected on approval, accepted rows create a split expense through `SplitService.createSplit` (equal split; uses the default split group).
- **Accounts**: Optional **default account** on the Recon page is used when you click **Accept and add** (links the new expense to that account).
- **Categories**: **Vendor category mappings** (`vendor_category_mappings`) learn a merchant key → category from each **Accept and add**; future syncs pre-fill the suggested category.

## Pending list UX

On **Pending items**, the **Description** cell is clickable: it opens the **Fetched mail detail** dialog (loads the message from Microsoft Graph). The dialog repeats the list **Description** line at the top, then shows from, subject, received time, and full body.

Each row has a **Mark** control with three options: **—** (no bulk action), **Ignore**, or **Accept**. Use **Process marked** to apply: ignores run first; **Accept** on a possible-duplicate row calls **accept duplicate**; **Accept** on a needs-add row calls **accept add** (category and split 50/50 apply). Rows marked **Accept** that still need a category but have none selected are **skipped**; a toast explains how many were left so you can categorize and run again. **Clear marks** resets all Mark dropdowns. Per-row **Accept as duplicate**, **Accept and add**, and **Ignore** still work as shortcuts.

Possible duplicates show a line such as “N possible matches” under status; expense details are not loaded in the UI (no match preview modal).

## Fetched emails (after sync)

The collapsible **Fetched emails** list (returned with debug data from sync) supports:

- **Bank sender addresses only (type A & B)**: When enabled, only rows whose **From** address contains a substring from `RECON_TYPE_A_FROM_SUBSTRINGS` or `RECON_TYPE_B_FROM_SUBSTRINGS` in `parse-type-a.ts` / `parse-type-b.ts` are shown. This filters by sender only (not subject); it helps focus on the same addresses the parsers use for “from”.
- **Outcome**: **All**, **Imported** (pending add or duplicate), **Parse failed**, or **Not bank**. Pagination and counts apply to the filtered list; the section title shows `shown of total` when any filter is active.

## Matching rule

- **Possible duplicate**: same signed-in user, **same calendar date** (`txn_date`), **same amount** (minor units) as at least one existing expense.
- **Needs add**: no matching expense for that date+amount.
- Nothing is auto-posted: every row stays **pending** until you choose **Accept as duplicate**, **Accept and add**, or **Ignore**.

## Email parsing

Two templates are implemented in code:

| File | Role |
|------|------|
| `src/lib/services/recon/parsers/parse-type-a.ts` | Sender/subject filters + body regex for amount, date, merchant (`RECON_TYPE_A_FROM_SUBSTRINGS` exported for UI filters) |
| `src/lib/services/recon/parsers/parse-type-b.ts` | Second bank template (`RECON_TYPE_B_FROM_SUBSTRINGS` exported for UI filters) |

Edit the `FROM_SUBSTRINGS`, `SUBJECT_SUBSTRINGS`, and body regex patterns to match your bank’s notification emails. **Sync** only ingests messages that pass one of the type matchers and then parse successfully.

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
| GET | `/api/recon/items` | When Recon off: `{ reconEnabled: false, items: [] }`. When on: `{ reconEnabled: true, items }` |
| POST | `/api/recon/items/[id]/accept-duplicate` | Mark duplicate resolved (no new expense) |
| POST | `/api/recon/items/[id]/accept-add` | Body `{ categoryId, accountId?, split? }` — create expense (optionally split) |
| POST | `/api/recon/items/[id]/ignore` | Ignore row |

## Database

- **Additive migration** `drizzle/0013_recon_pg.sql`: creates new tables only; does not delete existing app data.
- Apply with `npm run db:push` when deploying.
