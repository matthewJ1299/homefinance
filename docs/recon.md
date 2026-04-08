# Recon (bank email reconciliation)

Recon pulls **recent mail** from your connected Outlook account using **Microsoft Graph** (REST, not GraphQL), parses bank notification emails, compares them to existing expenses, and lets you **manually** decide each row.

## Related features

- **Expenses**: Accepted rows create expenses through `ExpenseService.create` (same path as manual entry).
- **Splits**: When **Split 50/50** is selected on approval, accepted rows create a split expense through `SplitService.createSplit` (equal split; uses the default split group).
- **Accounts**: Optional **default account** on the Recon page is used when you click **Accept and add** (links the new expense to that account).
- **Categories**: **Vendor category mappings** (`vendor_category_mappings`) learn a merchant key → category from each **Accept and add**; future syncs pre-fill the suggested category.

## Matching rule

- **Possible duplicate**: same signed-in user, **same calendar date** (`txn_date`), **same amount** (minor units) as at least one existing expense.
- **Needs add**: no matching expense for that date+amount.
- Nothing is auto-posted: every row stays **pending** until you choose **Accept as duplicate**, **Accept and add**, or **Ignore**.

## Email parsing

Two templates are implemented in code:

| File | Role |
|------|------|
| `src/lib/services/recon/parsers/parse-type-a.ts` | Sender/subject filters + body regex for amount, date, merchant |
| `src/lib/services/recon/parsers/parse-type-b.ts` | Second bank template |

Edit the `FROM_SUBSTRINGS`, `SUBJECT_SUBSTRINGS`, and body regex patterns to match your bank’s notification emails. **Sync** only ingests messages that pass one of the type matchers and then parse successfully.

## Environment and setup

See the main [README](../README.md) section **Recon and Microsoft Graph (Outlook)** for Azure app registration, redirect URI, and environment variables (`GRAPH_OAUTH_*`, `NEXTAUTH_URL`, optional `RECON_TOKEN_ENCRYPTION_KEY`).

## API routes (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/recon/graph/connect` | Start OAuth (redirect to Microsoft) |
| GET | `/api/recon/graph/callback` | OAuth callback (stores encrypted refresh token) |
| GET | `/api/recon/graph/status` | `{ connected, msAccountEmail }` |
| POST | `/api/recon/graph/disconnect` | Remove stored connection |
| POST | `/api/recon/sync` | Fetch mail + upsert `recon_import_items` (optional body `{ since?: "YYYY-MM-DD", top?: number }`) |
| GET | `/api/recon/items` | List pending items |
| POST | `/api/recon/items/[id]/accept-duplicate` | Mark duplicate resolved (no new expense) |
| POST | `/api/recon/items/[id]/accept-add` | Body `{ categoryId, accountId?, split? }` — create expense (optionally split) |
| POST | `/api/recon/items/[id]/ignore` | Ignore row |

## Database

- **Additive migration** `drizzle/0013_recon_pg.sql`: creates new tables only; does not delete existing app data.
- Apply with `npm run db:push` when deploying.
