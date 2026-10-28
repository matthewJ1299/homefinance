# Admin portal

Related: [feature-access](./feature-access.md), [passwords](./passwords.md), [multi-household](./multi-household.md).

## Model

Super-admins (`users.is_super_admin`) manage households and users at `/admin/*`. Product feature access is **household-only** via `household_features` — there are no per-user AI/Recon columns in the admin UI.

## Screens

| Route | Purpose |
|-------|---------|
| `/admin/houses` | List households with member count, approval status, entitlement chips |
| `/admin/houses/[id]` | Rename, approve/reject pending registrations, edit catalogue checkboxes + `ai_tier` |
| `/admin/features` | Catalogue view with household counts and server config hints |
| `/admin/users` | Create house+owner, add users, move household, super-admin flag, reset password |

## Mutations

Server actions in `src/lib/actions/admin/*`:

- `requireSuperAdminSession()` guard
- Zod validation (`src/lib/validators/admin.schema.ts`)
- `{ success, error }` results; form wrappers return `void` for Next.js `<form action>`
- `revalidatePath` on houses/users/features after changes
- Provisioning uses `withTransaction` + `AdminUserProvisioningService` (bootstrap defaults + `grantCoreFeatures`)

Legacy `/api/admin/*` route handlers were removed.

## Registration approval

Self-registration creates a household with `approval_status = pending`. Super-admins approve or reject from `/admin/houses/[id]`. Non–super-admin users with a non-active household are redirected to `/pending-approval`.

## Defaults

Admin-created households are `active` immediately. `grantCoreFeatures()` enables **mortgage** and **goals**; paid features (AI, Recon, What I owe) are off until ticked on the household detail screen.
