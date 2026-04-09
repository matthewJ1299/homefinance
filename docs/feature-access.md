# Feature access (AI and Recon)

Related: **Settings** (per-user preferences), **AI analysis** ([docs/ai-budget-analysis.md](./ai-budget-analysis.md)), **Recon** ([docs/recon.md](./recon.md)).

## Model

Two layers per feature:

1. **Admin-style gate** (intended for a future admin UI; set in the database today):
   - `users.ai_feature_allowed` — user may use AI analysis APIs and Settings AI toggles at all.
   - `users.recon_feature_allowed` — user may use Recon (Graph OAuth, sync, pending list APIs) and Settings Recon toggle at all.

2. **User preference** (existing):
   - `users.ai_enabled`, `users.recon_enabled` — “I want this on” under **Settings**.

Effective access requires **both** columns true for that feature. Server actions and `/api/recon/*` routes enforce this; `analyzeExpenses` and AI preference actions check `ai_feature_allowed`.

Resolution helpers live in `src/lib/services/feature-access.service.ts` (`resolveAiInteractiveEnabled`, `resolveReconInteractiveEnabled`).

**UI:** If `ai_feature_allowed` is false, **Settings** omits the AI analysis block entirely, and **Budget AI report** is omitted from the desktop sidebar and mobile menu (direct URL still returns the gated report page).

## Migration and defaults

- Schema: `drizzle/0020_users_feature_access_pg.sql` adds both columns (`NOT NULL DEFAULT false`).
- **Existing databases**: `npm run db:push` runs that migration; the SQL then sets **`ai_feature_allowed` and `recon_feature_allowed` to `true` only for `users.id = 1`** (adjust that `UPDATE` in the migration file or run SQL / admin UI later for other users). Everyone else stays `false` until granted.
- **Already applied an older 0020** that updated all users: this file change does not re-run automatically (columns already exist). Use SQL to set flags per user if needed.
- **New users**: application inserts should set the flags explicitly. Seeds (`seed.ts`, `seed-categories.ts`) set both to `true` for dev users.

## Repository

`IUserRepository` exposes `getAiFeatureAllowed` / `setAiFeatureAllowed` and `getReconFeatureAllowed` / `setReconFeatureAllowed` for the future admin UI and one-off SQL alternatives.
