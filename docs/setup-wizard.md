# Setup wizard (legacy)

**Superseded by [onboarding.md](./onboarding.md).** The modal wizard was removed in Stage 4; use the full-page `/welcome` flow instead.

## Historical (v1 modal)

The old wizard configured accounts, budget month start day, and optional AI/Recon toggles in a dialog mounted from `(app)/layout.tsx`. Schema columns on `users` are reused by the new flow.

Migration: `drizzle/0029_users_setup_wizard_state_pg.sql`.
