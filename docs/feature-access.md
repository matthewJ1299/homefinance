# Feature access (AI and Recon)

Tenant isolation for finance data is described in [multi-household.md](./multi-household.md).

Related: **Settings** (per-user preferences), **AI analysis** ([docs/ai-budget-analysis.md](./ai-budget-analysis.md)), **Recon** ([docs/recon.md](./recon.md)).

## Model

Three layers per feature, all required:

1. **Household policy** (admin portal `/admin/features`, `/admin/houses`):
   - `households.ai_feature_allowed` / `households.recon_feature_allowed` — the whole household may use the feature.

2. **Per-user allow** (admin portal `/admin/users`, or one-off SQL):
   - `users.ai_feature_allowed` — user may use AI analysis APIs and Settings AI toggles at all.
   - `users.recon_feature_allowed` — user may use Recon (Graph OAuth, sync, pending list APIs) and the Settings Recon toggle at all.

3. **User preference** (existing):
   - `users.ai_enabled`, `users.recon_enabled` — “I want this on” under **Settings**.
   - `users.owed_to_me_enabled` — preference only (no admin allow column). Hides **What I owe** (`/what-i-owe`) from the menu and blocks the page body until enabled. Default false; `drizzle/0028_users_owed_to_me_enabled_pg.sql` sets `true` for `users.id = 1`. Column name is historical.

`UserRepository.getAiFeatureAllowed(userId)` / `getReconFeatureAllowed(userId)` resolve **layers 1 AND 2 together** (join `households` on `users.household_id`), so every call site — pages, actions, `/api/recon/*`, `/api/admin` — gets the combined result with no extra wiring. Effective interactive access additionally requires layer 3 (and, for AI, that the chosen tier's keys are configured).

Resolution helpers live in `src/lib/services/feature-access.service.ts` (`resolveAiInteractiveEnabled`, `resolveReconInteractiveEnabled`).

**UI:** If `ai_feature_allowed` is false, **Settings** omits the AI analysis block entirely, and **Budget AI report** is omitted from the desktop sidebar and mobile menu (direct URL still returns the gated report page).

## Migration and defaults

- Schema: `drizzle/0020_users_feature_access_pg.sql` adds the **user** columns; `drizzle/0028_super_admin_and_household_feature_policy_pg.sql` adds the **household** columns (all `NOT NULL DEFAULT false`).
- **Existing databases**: `npm run db:push` runs both migrations. `0020` sets the user flags `true` for `users.id = 1`; `0028` sets the matching household flags `true` for user 1's household (back-compat so existing access is not lost). Everyone else stays `false` until granted.
- **New users/households**: `0028` defaults household flags to `false`. Super-admin enables the household in `/admin`, then the user in `/admin/users`. Seeds (`seed.ts`, `seed-categories.ts`) set both household and user flags `true` for dev users.

## Repository

`IUserRepository` exposes `getAiFeatureAllowed` / `setAiFeatureAllowed` and `getReconFeatureAllowed` / `setReconFeatureAllowed` (per-user column). `AdminHouseholdRepository.updateFeaturePolicy` sets the household columns. The `get*` methods return `household_flag AND user_flag`.
