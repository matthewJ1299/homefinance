# Admin-controlled entitlements, password management, and onboarding rebuild

## Context

HomeFinance is moving from a personal app to a product sold to households, with optional
features (AI budget analysis, Recon, What I owe) sold piecemeal. Three things block that:

1. **Feature access is a three-layer AND** — `households.*_feature_allowed` AND
   `users.*_feature_allowed` AND `users.*_enabled` — and the last layer is a toggle the
   *end user* controls in Settings. A customer can switch off something they paid for, and
   an admin looking at `/admin/users` sees the raw user flag, not the effective grant, so the
   admin UI actively misleads. Adding a fourth sellable feature today means a migration, a
   manifest entry, a seed-detection case, two repo methods, a positional boolean threaded
   through the nav, and two admin screens.
2. **There is no password change or reset anywhere in the app.** Admins type a password into
   a form at user-creation and that is the user's password forever. This is both a security
   problem (the admin knows every password, the user cannot rotate) and a support problem.
3. **Onboarding does not onboard.** The wizard configures accounts, "budget month start day",
   and two feature toggles a new user is never allowed to use — then drops them on a dashboard
   of zeros. It never touches categories, income, or a first budget. It also has a bug that
   traps completed users in a re-opening modal.

The outcome we want: a super-admin provisions a household, ticks the features that household
has bought, and hands over credentials. The user signs in, is walked through a plain-language
setup that leaves them with a working budget, and never sees a switch for something they did
not buy.

**Decisions already taken** (confirmed with the user):

| Decision | Choice |
|---|---|
| Gating granularity | **Household only.** One switch per feature per household, admin-set. Per-user feature columns retire. |
| Passwords | **Admin reset + user self-change.** Temp password shown once to the admin, forced change on next sign-in, self-service change in Settings. No email dependency. |
| Onboarding | **Guided but skippable.** Full-page `/welcome`, not a modal; dashboard progress banner until finished. |
| Delivery | **Staged commits on `multi-tenant-admin`**, one PR at the end. |

---

## Stage 0 — Merge `master`

`master` is 4 commits ahead with work this branch needs: the collapsible `DesktopSidebar`
(with the sign-out fix), multiple calendar reminders, and the completed **What I owe** feature.

**Migration number collision.** Both branches used 0027 and 0028 for different files:

| Branch | master |
|---|---|
| `0027_households_pg.sql` | `0027_calendar_event_reminders_pg.sql` |
| `0028_super_admin_and_household_feature_policy_pg.sql` | `0028_users_owed_to_me_enabled_pg.sql` |
| `0029_users_setup_wizard_state_pg.sql` | — |

Filenames differ, so nothing is overwritten on disk, and `MIGRATION_FILES` in
`src/lib/db/migration-manifest.ts` is an explicit ordered list whose own comment says it
"Handles duplicate numeric prefixes" (it already runs 0019 before 0017). The merge is
therefore safe, but three files conflict and must be resolved by hand rather than by taking
either side:

- `src/lib/db/migration-manifest.ts` — keep **all five** entries. Order: master's `0027_calendar_event_reminders`, `0028_users_owed_to_me_enabled`, then this branch's `0027_households`, `0028_super_admin_and_household_feature_policy`, `0029_users_setup_wizard_state`. Households must come after the plain column adds so its backfill sees a settled schema.
- `src/lib/db/migration-seed.ts` — keep both branches' `case` arms.
- `src/app/(app)/layout.tsx`, `src/components/layout/*` — take master's `DesktopSidebar` / `AppShell` / `nav-items` shape; Stage 1 rewrites the feature-flag plumbing through it anyway.

Also delete the stale `what-you-owe` remnants this branch carries — master's completed feature
is `what-i-owe`:
- `src/app/(app)/what-you-owe/` (empty directory)
- `src/components/what-you-owe/` (imported by nothing)

**Verify:** `npm run build && npm run test:unit`, then `npm run db:push` against a scratch DB
restored from a production dump and confirm all five migrations apply in order.

---

## Stage 1 — Feature entitlements

### Data model

Replace per-feature boolean columns with a **registry + join table**. A column-per-feature
does not scale to piecemeal selling: each new feature costs a migration, a manifest entry, a
seed-detection case, repo methods, and a positional boolean in the nav. With a registry,
adding a sellable feature is one TypeScript entry.

`drizzle/0030_household_features_pg.sql`:

```sql
-- Per-household feature entitlements (admin-controlled, sold piecemeal).
-- Additive and safe on existing databases.

CREATE TABLE IF NOT EXISTS household_features (
  household_id BIGINT NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  feature_key  TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT false,
  options      JSONB,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (household_id, feature_key)
);
--> statement-breakpoint

-- Backfill: nobody loses access on deploy. Effective access today is the AND of the
-- household flag and ANY member's user flag, so grant where both were true.
INSERT INTO household_features (household_id, feature_key, enabled, options)
SELECT h.id, 'ai_budget_analysis', true,
       jsonb_build_object('tier', CASE WHEN bool_or(u.ai_use_paid) THEN 'paid' ELSE 'free' END)
FROM households h JOIN users u ON u.household_id = h.id
WHERE h.ai_feature_allowed AND u.ai_feature_allowed
GROUP BY h.id
ON CONFLICT (household_id, feature_key) DO NOTHING;
--> statement-breakpoint

INSERT INTO household_features (household_id, feature_key, enabled)
SELECT DISTINCT h.id, 'recon', true
FROM households h JOIN users u ON u.household_id = h.id
WHERE h.recon_feature_allowed AND u.recon_feature_allowed
ON CONFLICT (household_id, feature_key) DO NOTHING;
--> statement-breakpoint

-- What I owe was per-user with no household gate; grant if any member had it on.
INSERT INTO household_features (household_id, feature_key, enabled)
SELECT DISTINCT u.household_id, 'what_i_owe', true
FROM users u WHERE u.owed_to_me_enabled AND u.household_id IS NOT NULL
ON CONFLICT (household_id, feature_key) DO NOTHING;
--> statement-breakpoint

-- Mortgage and Goals ship on for every existing household: no behaviour change today,
-- but they become sellable the moment an admin unticks them.
INSERT INTO household_features (household_id, feature_key, enabled)
SELECT h.id, k, true FROM households h CROSS JOIN (VALUES ('mortgage'), ('goals')) AS t(k)
ON CONFLICT (household_id, feature_key) DO NOTHING;
```

Register in `src/lib/db/migration-manifest.ts` (append) and add to
`src/lib/db/migration-seed.ts`:
`case "0030_household_features_pg.sql": return tableExists(query, "household_features");`

### Feature registry — split client-safe / server-only

**The registry must not import server code.** `nav-items.ts` is imported by `"use client"`
components (`bottom-nav`, `mobile-nav-menu`, `desktop-sidebar`), so a catalogue carrying a
`requiresServerConfig: () => boolean` that reads `process.env` or imports `ai.service` would
drag `openai` and `@google/generative-ai` into the client bundle. Two modules:

- `src/lib/features/registry.ts` — pure data, client-safe. Declares `FEATURE_KEYS`,
  `FeatureDefinition` (`key`, `label`, `description`, `navHrefs`, `routePrefixes`,
  `deniedMessage`, and a `serverConfig: "none" | "ai_keys" | "graph_oauth"` **tag**), the
  `FEATURES` record, `isFeatureKey`, `toFeatureKeys`, and a derived
  `NAV_HREF_FEATURE: ReadonlyMap<string, FeatureKey>` so the nav filter is never hand-maintained.
- `src/lib/features/server-config.ts` — server-only. Resolves the tag:
  `isFeatureServerConfigured(key)` and `isFeatureUsable(key)` (entitled **and** configured).
- `src/lib/features/access.ts` — `getEntitledFeatureKeys()`, `hasFeature`, `requireFeature`,
  `featureDeniedMessage`, `FeatureNotEntitledError`.

**Super-admins get no implicit bypass.** A super-admin belongs to a household and sees exactly
what that household is sold, so support can reproduce a customer's view. Admin-portal access
is governed by `requireSuperAdmin()`, which is a separate concern.

The shape of the declaration:

```ts
export const FEATURE_KEYS = [
  "ai_budget_analysis", "recon", "what_i_owe", "mortgage", "goals",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureDefinition {
  key: FeatureKey;
  /** Admin-facing name in /admin. */
  label: string;
  /** Admin-facing explanation of what the household gets. */
  description: string;
  /** Nav entry this feature gates, if any. */
  navHref?: string;
  /** True when the server also needs config (API keys) for this to work. */
  requiresServerConfig?: () => boolean;
  /** Per-household options surfaced in the admin UI. */
  options?: ReadonlyArray<{ key: string; label: string; choices: readonly string[] }>;
}

export const FEATURE_CATALOGUE: Readonly<Record<FeatureKey, FeatureDefinition>> = { ... };
export function isFeatureKey(value: string): value is FeatureKey { ... }
```

**AI tier is relocated, not deleted.** `users.ai_use_paid` becomes
`households.ai_tier TEXT NOT NULL DEFAULT 'free' CHECK (ai_tier IN ('free','paid'))` — a column
rather than JSONB, so `getAuthState` reads it without a JSON extraction and the CHECK gives
real validation. It is admin-set on `/admin/houses/[id]` next to the `ai_budget_analysis`
entitlement. The table still carries `config_json JSONB` for future per-feature config.

### Plumbing entitlements to every gate

`src/lib/auth.ts` already runs `getUserRepository().getAuthState(userId)` on every request
(one indexed PK lookup) to read `householdId` and `isSuperAdmin` from the DB rather than the
30-day JWT. Extend that single query rather than adding new per-gate reads:

```sql
SELECT u.household_id,
       u.is_super_admin,
       u.must_change_password,
       COALESCE(h.ai_tier, 'free') AS ai_tier,
       COALESCE(
         (SELECT array_agg(hf.feature_key)
            FROM household_features hf
           WHERE hf.household_id = u.household_id
             AND hf.enabled
             AND (hf.expires_at IS NULL OR hf.expires_at > NOW())),
         '{}'::text[]
       ) AS feature_keys
  FROM users u
  LEFT JOIN households h ON h.id = u.household_id
 WHERE u.id = ?
```

Three details that matter:

- **`LEFT JOIN`, not `JOIN`.** A pre-0027 user with `household_id IS NULL` must still return a
  row, or `auth.ts` cannot distinguish "user row is gone" from "household is null" and the
  existing fail-closed branch loses its meaning.
- **Catch `42P01` / `42703` and fall back** to the old two-column `SELECT` with an empty
  feature list. If this query throws on a database that has not yet run 0030, `auth.ts`'s
  existing catch deletes `householdId` and *the entire app* fails closed, not just features.
- **Entitlements never enter the JWT.** Add `featureKeys` / `aiTier` to `Session["user"]` in
  `src/types/next-auth.d.ts` only — not to `JWT`, and leave the `jwt`/`session` callbacks in
  `auth.config.ts` untouched. The token lives 30 days; an entitlement revoked by an admin must
  take effect on the next request, which is exactly the reasoning the file already applies to
  `isSuperAdmin`.

Then in `src/lib/db/request-context.ts`, add `features?: ReadonlyMap<FeatureKey, FeatureOptions>`
to `RequestContext` and to `IDENTITY_KEYS`. Entitlements are request-identity data, so they
are safe in the shared React `cache()` holder alongside `householdId` — unlike `pgClient` /
`lastInsertId`, which the file's existing comment correctly keeps out of it.

New helpers in the same file, mirroring `requireHouseholdId()` / `requireSuperAdmin()`:

```ts
export function hasFeature(key: FeatureKey): boolean
export function featureOption(key: FeatureKey, option: string): string | undefined
export function requireFeature(key: FeatureKey): void   // throws "Forbidden"
```

Background jobs have no session. Add
`src/lib/features/run-with-household-features.ts` exporting
`runWithHouseholdFeatures(householdId, fn)` — loads that household's keys via the new repo and
binds them with the existing `runWithRequestContext`, so `hasFeature()` behaves identically
inside a scheduler. `notification-scheduler.service.ts` swaps both of its
`runWithRequestContext({ householdId }, …)` call sites for it. `runWithRequestContext` itself
is unchanged: a job that needs no entitlements keeps using it and correctly gets an empty
(fail-closed) set.

**Rollout order within this stage matters.** Land the schema + backfill first and diff the
resulting `household_features` rows against the old per-user gate matrix on a production
snapshot — that diff is the go/no-go for "nobody loses access". Then plumb entitlements into
the request while **leaving the old gates authoritative**, so behaviour is byte-identical and
the new resolution can be compared against the old. Only then flip the gates, as a separate
commit, so a mistake is attributable.

`src/lib/services/feature-access.service.ts` collapses to one function — feature access is
now a context read, and the only remaining runtime question is whether the server is
configured for the chosen AI tier:

```ts
export function resolveAiInteractiveEnabled(): boolean {
  if (!hasFeature("ai_budget_analysis")) return false;
  const tier = featureOption("ai_budget_analysis", "tier") === "paid" ? "paid" : "free";
  return isAIConfiguredForTier(tier);
}
export function resolveReconInteractiveEnabled(): boolean { return hasFeature("recon"); }
```

### Call-site migration (~30 sites)

Four shapes, each converted the same way throughout:

**RSC page gate** — `src/app/(app)/recon/page.tsx`
```diff
-const [reconFeatureAllowed, reconPrefOn] = await Promise.all([...]);
-if (!reconFeatureAllowed) return <ReconDisabledPlaceholder reason="no_feature_access" />;
-if (!reconPrefOn) return <ReconDisabledPlaceholder reason="preference" />;
+if (!hasFeature("recon")) return <FeatureUnavailable feature="recon" />;
```
`ReconDisabledPlaceholder`'s `"preference"` variant ("enable it under Settings") is now a lie
and is deleted. It and master's `what-i-owe/disabled-placeholder.tsx` are two copies of the
same idea, so both collapse into one `FeatureUnavailable` that reads its copy from the
catalogue — the point of the registry is that the third feature needs no third component.

**403 helper** — `src/lib/api/recon-enabled.ts` is replaced by a feature-agnostic
`src/lib/api/feature-gate.ts` exporting `featureDeniedResponse(key)` — **synchronous, no DB
read**, returning 403 when not entitled and 503 when entitled but the server lacks its config.
The 5 routes using the old helper and the 4 with hand-rolled inline gating (`items/route.ts`,
`graph/status`, `graph/connect`, `graph/callback`) all move onto it.

> `graph/callback` is the one exception: it resolves the user from `userIdFromState`, not from
> the session, so request context is not bound to that user. It must run its check inside
> `runWithHouseholdFeatures(householdId, …)` rather than calling `hasFeature()` directly.

**Server action guard** — `ai.actions.ts`, `budget-ai-report.actions.ts`
```diff
-const [aiFeatureAllowed, aiEnabled] = await Promise.all([...]);
-if (!aiFeatureAllowed) return { success: false, error: "AI analysis is not enabled..." };
-if (!aiEnabled) return { success: false, error: "AI is disabled. Enable it under Settings." };
+if (!hasFeature("ai_budget_analysis")) {
+  return { success: false, error: "AI analysis is not part of your plan." };
+}
```
`getAiUsePaid(userId)` → `featureOption("ai_budget_analysis", "tier")`.

**Nav** — `navItemsForUserPreferences(items, reconEnabled, aiFeatureAllowed, owedToMeEnabled)`
grows a positional boolean per feature. Replace with a catalogue-driven filter:
```ts
export function navItemsForFeatures(items: NavItem[], features: ReadonlySet<FeatureKey>): NavItem[] {
  return items.filter((item) => {
    const gate = FEATURE_KEYS.find((k) => FEATURE_CATALOGUE[k].navHref === item.href);
    return gate == null || features.has(gate);
  });
}
```
Adding a sellable feature then needs no nav change at all. Threading updates
`app-shell.tsx`, `header.tsx`, `mobile-nav-menu.tsx`, `bottom-nav.tsx`, `desktop-sidebar.tsx`
to pass one `features` set instead of N booleans.

`src/app/(app)/layout.tsx` loses 6 of its 8 parallel user-repo reads — they are all in
request context now.

### Deprecated columns

`db:push` is additive-only and runs against production on deploy, so **do not drop columns in
this change.** Migration 0030 only reads them for backfill. Leave
`users.ai_feature_allowed`, `users.recon_feature_allowed`, `users.ai_enabled`,
`users.recon_enabled`, `users.owed_to_me_enabled`, `users.ai_use_paid` and
`households.ai_feature_allowed` / `households.recon_feature_allowed` in place, remove all
application reads and writes, and note them in `docs/database.md` as retired with a follow-up
`0031_drop_legacy_feature_flags_pg.sql` to run one release later once the backfill is proven.

Delete the now-dead repo methods from `IUserRepository` / `UserRepository`:
`get/setAiFeatureAllowed`, `get/setReconFeatureAllowed`, `get/setAiEnabled`,
`get/setReconEnabled`, `get/setAiUsePaid`, `get/setOwedToMeEnabled`.

### Files touched

`drizzle/0030_household_features_pg.sql`, `src/lib/db/migration-manifest.ts`,
`src/lib/db/migration-seed.ts`, `src/lib/features/catalogue.ts` (new),
`src/lib/repositories/interfaces/household-feature.repository.ts` (new),
`src/lib/repositories/sql/household-feature.repository.ts` (new),
`src/lib/repositories/index.ts` (factory), `src/lib/auth.ts`,
`src/lib/db/request-context.ts`, `src/lib/services/feature-access.service.ts`,
`src/lib/api/recon-enabled.ts`, `src/components/layout/nav-items.ts` + 5 layout components,
`src/components/ui/feature-unavailable.tsx` (new), all recon routes, both AI action files,
`src/app/(app)/{layout,settings,recon,budget-ai-report,dashboard,summary}/page.tsx`,
`src/lib/db/seed.ts`, `src/lib/db/seed-categories.ts`,
`src/lib/db/bootstrap-household-defaults.ts`.

---

## Stage 2 — Admin portal

### Remove the end-user surface

Delete `src/components/settings/ai-settings.tsx`,
`src/components/settings/recon-settings.tsx`,
`src/components/settings/what-i-owe-settings.tsx` and the four toggle actions in
`user-preferences.actions.ts` (`updateReconEnabledAction`, `updateAiEnabledAction`,
`updateAiUsePaidAction`, `updateOwedToMeEnabledAction`) with their result types.
Settings keeps only genuine per-user preferences (budget month start day, push, dashboard
tiles, export) plus the new Profile section from Stage 3.

### Rebuild the portal

Bring admin up to the standards the rest of the codebase already follows.

**`/admin/houses`** — list with member count and an at-a-glance entitlement summary;
create-house form. **`/admin/houses/[id]`** (new) — the household detail screen: rename,
members table, **feature entitlements rendered from `FEATURE_CATALOGUE`** (checkbox per
feature plus its options, e.g. the AI free/paid select), and a danger zone.

**`/admin/users`** — search by name/email, filter by household, create user, move user between
households, reset password (Stage 3), toggle super-admin, deactivate. The per-user AI/Recon
columns are **removed** — entitlement is a household concept now.

**`/admin/features`** — keep the route but make it earn its place: a catalogue view listing
each feature with how many households have it enabled, and whether the server is configured
for it (`requiresServerConfig()`). That is the screen a seller actually wants.

**`/admin/queries`** — unchanged.

### Standards fixes applied throughout admin

| Problem | Fix |
|---|---|
| No `revalidatePath` in any admin action | Add to all, matching the per-domain convention (`/admin/houses`, `/admin/users`, …) |
| Actions `throw` on validation failure, losing form input | Convert to the codebase result union `{success:true}\|{success:false;error:string}` + `useActionState`, with toasts |
| No input validation | `src/lib/validators/admin.schema.ts` with zod `safeParse` (email format, password min length, household name) |
| Auth preamble duplicated 9× | `requireSuperAdminSession()` helper in `src/lib/actions/admin/admin-auth.ts` |
| Provisioning not transactional | Wrap `createHouseholdWithOwnerUser` and `bootstrapHouseholdDefaults` in the existing `withTransaction` from `src/lib/db/postgres-client.ts` |
| `AdminFeaturePolicyService` is dead code | Delete; replace with `AdminFeaturePolicyService` actually wired to `household_features` and called by the actions |
| `/api/admin/*` duplicates the actions and has no consumer | Delete the 5 route handlers; the UI uses server actions |
| Raw `<table>`, `<select>`, `<input type=checkbox>` | Add `src/components/ui/checkbox.tsx` and `src/components/ui/data-table.tsx` to the UI kit; use `SelectField` for selects |
| No error boundary under `/admin` | Add `src/app/admin/error.tsx` and `loading.tsx` |
| No way in or out | "Back to app" in `AdminShell`; an **Admin** nav entry in the app sidebar/menu when `session.user.isSuperAdmin` |
| Admin-created users had features off by default | Entitlements are per-household now; `AdminUserRepository.createUser` stops writing feature columns |

---

## Stage 3 — Password management

`drizzle/0031_user_password_management_pg.sql`:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
```
Plus manifest + seed-detection entries.

**Service** — `src/lib/services/password.service.ts`, a class per convention:
- `changeOwnPassword(userId, currentPassword, newPassword)` — verifies current with `bcrypt.compare`, hashes at cost 10 (matching `AdminUserProvisioningService`), clears `must_change_password`, stamps `password_changed_at`.
- `adminResetPassword(userId)` — generates a temp password with `crypto.randomBytes`, sets `must_change_password = true`, returns the plaintext **once** to the caller.

**Validator** — `src/lib/validators/password.schema.ts`: min 10 chars, confirm-match refinement.
Applied to admin user creation too, which currently accepts any non-empty string.

**Forced change** — `/change-password` under `(auth)`. `src/app/(app)/layout.tsx` and
`src/app/admin/layout.tsx` redirect there when `must_change_password` is set; the page itself
and the sign-out route are exempt so there is no redirect loop.

**Self-service** — a new **Profile** section at the top of Settings: display name, email
(read-only), and Change password. Uses the standard optimistic-toast pattern.

**Admin** — a "Reset password" action on `/admin/users` opening a `ConfirmDialog`, then
showing the generated temp password once in a dialog with a copy button and an explicit
"this will not be shown again" warning. Admin user-creation switches to generating a temp
password by default rather than the admin inventing one.

---

## Stage 4 — Onboarding

### What is wrong today

- Opening the wizard from Settings writes `in_progress` unconditionally
  (`setup-wizard-dialog.tsx:54-61`) and manual closes never persist a status, so a
  **completed user who reopens it is downgraded to `in_progress` and the modal then
  auto-opens on every page load forever.**
- Step 4 of 5 ("Optional features") renders nothing but two "ask an administrator" cards for
  every newly provisioned user. After Stage 1 it has no reason to exist at all.
- Welcome and Done are content-free, so a 5-step wizard has 2 substantive steps.
- It configures **budget month start day** but not categories, income, or a budget — the
  three things that decide whether the dashboard shows anything.
- It is a modal mounted in `(app)/layout.tsx`, so it can open over `/calendar` or `/lists/3`.
- `bootstrapHouseholdDefaults` seeds fixed categories with real amounts (Utilities R120,
  Insurance R58, Savings R150). `BudgetService.resolveEffectiveAllocations` turns those into
  **real allocations on first visit to `/budget`**, so a new user sees R328 committed to
  numbers nobody chose.

### The new flow: `/welcome`

A full page under `(app)`, resumable, skippable, with plain language throughout. The mental
model taught is *money in → money out → what's left*, and the jargon is removed:

| Step | Heading (user-facing) | What it does | Reuses |
|---|---|---|---|
| 1 | "Where does your money sit?" | Add one or more accounts. Primary is set automatically when there is only one. | `AccountCreateFields`, `validateAccountCreateDraft`, `POST /api/accounts` |
| 2 | "When do you get paid?" | Day-of-month picker framed as payday, which *is* the budget month start day. | `updateBudgetMonthStartDayAction` |
| 3 | "What comes in each month?" | Amount + payday; offers to make it recurring. | `IncomeQuickAdd` pattern, `addIncome`, `createRecurringIncome` |
| 4 | "What do you spend on?" | Checklist of the 14 seeded categories, common ones pre-ticked; unticked are deactivated. "Same amount every month?" reveals an amount field — never the words *fixed* / *variable*. | `updateCategory` (`isActive`, `costType`, `defaultAmount`) |
| 5 | "Give every rand a job" | Runs `autoAllocate` and shows the result as an editable starting point, with the `UnallocatedBanner` copy. | `BudgetService.autoAllocate`, `BudgetCategoryCard` |

Jargon replacements: *budget month start day* → "when you get paid"; *allocation* → "give
every rand a job" (already the app's own best copy, in `unallocated-banner.tsx`);
*fixed / variable* → "same every month" / "changes each month"; *cost type*, *split group*,
*ledger* never appear.

### Mechanics

- **Resumable.** `users.setup_wizard_status` gains a step marker so a user who leaves at
  step 3 returns to step 3. Reuse the existing `setup_wizard_*` columns; add
  `setup_wizard_step TEXT` in the Stage 3 migration.
- **Status bug fixed.** Write `in_progress` only on genuine first entry, never downgrade
  `completed`, and persist an explicit status on skip.
- **Not a modal.** `SetupWizardHost` is removed from `(app)/layout.tsx`. First sign-in with
  status `not_started` redirects to `/welcome`; everything else reaches it from the banner or
  Settings.
- **Progress banner.** A dismissible `SetupProgressBanner` on the dashboard while status is
  `in_progress` / `dismissed`, showing steps remaining with a Continue link. Replaces the
  ambush modal.
- **Better empty states.** `EmptyState` currently takes only `message`. Extend it with
  optional `title` and `action` and use it for genuine first-run states — the dashboard today
  renders a full grid of zeros with no explanation of what to do next.
- **Fix the seeded amounts.** `bootstrapHouseholdDefaults` sets `defaultAmount` to `null` for
  all seeded categories so nothing is silently pre-allocated; step 4 is where real amounts get
  set. (Dev seeds keep their amounts.)

### Product improvements to the surrounding features

- **Dashboard:** wire or delete the 5 dead tile toggles in `dashboard-tiles-settings.tsx`
  (`accounts`, `goalsSummary`, `creditSummary`, `goalAlerts`, `populateMonth`) and the 3
  orphaned tile components they refer to. A settings screen offering toggles that do nothing
  is worse than no toggle.
- **Budget:** explain fixed vs variable at the point of use with a one-line hint on
  `BudgetCategoryCard`, in the same `text-xs text-muted-foreground` pattern the settings page
  already uses.
- **Categories:** the seeded "Splits" and "Mortgage" categories are plumbing, not user
  choices — hide them from step 4's checklist.

---

## Stage 5 — Cross-cutting cleanup

- **Settings is a 13-section monolith** that eagerly loads every collapsed section, including
  an N+1 over shared lists (`settings/page.tsx:46-50`, one query per list). Group into
  Profile / Preferences / Household data / Data & export, and load each collapsed section's
  data on expand. Add `findItemCountsByListIds` to `ISharedListItemRepository` for the
  aggregate.
- Same N+1 on the dashboard: `countOpenListTasks` runs one query per list. Use the new
  aggregate.
- Delete `src/components/what-you-owe/` and `src/app/(app)/what-you-owe/` (Stage 0).
- `/income` is a real page reachable only from a dashboard "View more" link — add it to the
  nav under the money group, or fold it into `/expenses`.
- `recon-page-client.tsx` is 1,612 lines, ~4× the next largest component. Not in scope to
  rewrite, but split out the item list and the connect/status panel while we are touching its
  gating.

---

## Stage 6 — Docs and tests

**Docs** (following the established shape: title, Related links, `## Model`,
`## Migration and defaults`, `## Repository`):
- Rewrite `docs/feature-access.md` for the single-layer household model and the catalogue.
- New `docs/admin-portal.md` and `docs/passwords.md`.
- Rewrite `docs/setup-wizard.md` as `docs/onboarding.md`.
- Update `docs/database.md` (migrations 0030/0031, retired columns), `docs/multi-household.md`,
  `README.md` (Admin portal, Setup wizard, ERD `household_features`), `CHANGELOG.md`.

**Tests.** The suite is strong on finance maths and empty everywhere else. Add, matching the
existing `describe`/`it` + `vi.mock("@/lib/repositories")` style:
- `src/lib/features/catalogue.test.ts` — every `navHref` resolves to a real nav item; keys unique.
- `src/lib/db/request-context.test.ts` — `hasFeature` / `requireFeature` against a context bound by `runWithRequestContext`; fails closed when context is empty.
- `src/lib/services/password.service.test.ts` — wrong current password rejected; hash changes; `must_change_password` cleared.
- **Tenant isolation integration test** (`src/__tests__/integration/`) — the highest-value gap today: assert a repository bound to household A returns no rows belonging to household B, and that a missing household context throws rather than returning everything.

---

## Verification

Run between every stage — the Docker production build runs `test:unit` before `next build`,
so a red suite fails the deploy:

```bash
npm run test:unit
npm run build
```

End-to-end on a scratch database:

```bash
npm run db:reset && npm run db:push && npm run db:seed:users
npm run dev
```

1. **Migrations** — `db:push` against a restored production dump; confirm 0030 backfills
   `household_features` so every household that had AI or Recon still has it, and that a
   second `db:push` is a no-op.
2. **Entitlements** — as super-admin create a house with no features: the new user sees no
   Recon / Budget AI report / What I owe nav entries, no AI or Recon sections in Settings, and
   `GET /api/recon/items` returns 403. Enable Recon in `/admin/houses/[id]`, sign the user out
   and in, confirm it appears. Direct-URL `/recon` and `/budget-ai-report` while disabled must
   show `FeatureUnavailable`, not a crash.
3. **Admin** — create a house + owner; confirm the list refreshes without a manual reload
   (the `revalidatePath` fix), a duplicate email shows a toast with the form still filled, and
   a failed provisioning leaves no orphan household (transaction).
4. **Passwords** — admin resets a password, temp shown once; that user is forced to
   `/change-password` on next sign-in and cannot navigate away; after changing, Settings >
   Profile > Change password works and rejects a wrong current password.
5. **Onboarding** — new user lands on `/welcome`, completes all five steps, and arrives at a
   dashboard with an account, income, active categories, and an allocated budget. Then: skip
   at step 3, confirm the dashboard banner appears and Continue resumes at step 3. Finally,
   re-run from Settings as a completed user, close it, reload — **the wizard must not
   re-open** (the status-regression bug).
6. **Desktop sign-out** — present via master's `DesktopSidebar` at ≥768px.
