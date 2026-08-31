# Setup wizard

The setup wizard is an **in-app onboarding flow** that helps a user configure common essentials without blocking normal navigation.

## Where it appears

- **Soft prompt (new/incomplete users)**: when a user’s setup has not been completed, the app can open the wizard automatically after sign-in.
- **Manual run (existing users)**: go to **Settings** and click **Run setup wizard**.

## What it configures (v1)

- **Accounts**: create one or more accounts and choose a primary account (used as the default when adding income/expenses).
- **Budget basics**: select the budget month start day (1–28).
- **Optional features**:
  - **Recon**: enable/disable the per-user Recon toggle.
  - **AI analysis**: enable/disable AI and choose free vs paid tier.

## Persistence (cross-device)

Wizard progress is stored per user on `users`:

- `users.setup_wizard_status`: `not_started` | `in_progress` | `dismissed` | `completed`
- `users.setup_wizard_dismissed_at` (optional)
- `users.setup_wizard_completed_at` (optional)

Schema migration: `drizzle/0029_users_setup_wizard_state_pg.sql` (applied via `npm run db:push`).

## Feature-access interaction (AI and Recon)

The wizard does **not** bypass feature access policy:

- **AI** requires the admin-style allow flag (`users.ai_feature_allowed` / household policy) *and* the per-user Settings toggle.
- **Recon** requires the admin-style allow flag (`users.recon_feature_allowed` / household policy) *and* the per-user Settings toggle.

See [feature access](./feature-access.md) for the policy and migration defaults.

