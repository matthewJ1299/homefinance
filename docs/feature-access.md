# Feature access

Tenant isolation for finance data is described in [multi-household.md](./multi-household.md).

Related: **AI analysis** ([docs/ai-budget-analysis.md](./ai-budget-analysis.md)), **Recon** ([docs/recon.md](./recon.md)), **Admin portal** (`/admin`).

## Model

Feature access is **per household**, not per user. There is no end-user Settings toggle for AI, Recon, or What I owe.

1. **Household entitlement** — rows in `household_features` (one row per feature key), set only by a super-admin in `/admin/houses/[id]`. The catalogue lives in `src/lib/features/registry.ts` (`FEATURE_KEYS` / `FEATURES`).

2. **AI tier** — `households.ai_tier` (`free` | `paid`), admin-set on the household detail screen. Used when checking whether the server has keys for the chosen tier.

3. **Server configuration** — some features also need env vars (AI API keys, Microsoft Graph OAuth). Checked via `isFeatureServerConfigured()` in `src/lib/features/server-config.ts`.

At request time, `UserRepository.getAuthState()` loads enabled feature keys and `ai_tier` into `RequestContext`. Pages, actions, and API routes call `hasFeature(key)` from `src/lib/features/access.ts` (synchronous, no extra DB read).

Interactive helpers in `src/lib/services/feature-access.service.ts`:

- `resolveAiInteractiveEnabled()` — entitled **and** AI keys configured for the household tier.
- `resolveReconInteractiveEnabled()` — entitled (Recon still needs Graph OAuth configured for connect/sync).

**UI:** Nav items are filtered with `navItemsForFeatures()` from the entitled key set. Gated pages render `FeatureUnavailable` when `hasFeature()` is false.

**Super-admins** get no implicit bypass for product features — they see what their household is sold, so support can reproduce customer issues. Access to `/admin` itself uses `requireSuperAdmin()`.

## Admin portal

| Screen | Purpose |
|--------|---------|
| `/admin/houses` | List households with member count, approval status, entitlement chips |
| `/admin/houses/[id]` | Rename, approve/reject pending households, edit catalogue checkboxes + AI tier |
| `/admin/features` | Catalogue view: how many households have each feature; server config status |
| `/admin/users` | Create users, move between households, super-admin flag (no per-user feature columns) |

Mutations go through server actions in `src/lib/actions/admin/*` with zod validation (`src/lib/validators/admin.schema.ts`) and `revalidatePath`. The legacy `/api/admin/*` route handlers were removed.

## Migration and defaults

- `drizzle/0030_household_features_pg.sql` — creates `household_features`, backfills from legacy user/household flags, adds `households.ai_tier`.
- `drizzle/0032_household_approval_pg.sql` — adds `households.approval_status` (`pending` | `active` | `rejected`) for self-registration approval (defaults to `active`).
- Legacy columns on `users` and `households` (`ai_feature_allowed`, `recon_enabled`, etc.) are **deprecated** and no longer read or written by the app. A follow-up migration will drop them after the backfill is proven.

New households created in admin get **mortgage** and **goals** enabled by default via `AdminHouseholdRepository.grantCoreFeatures()`.
