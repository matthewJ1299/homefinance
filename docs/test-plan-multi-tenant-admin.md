# Manual test plan — `multi-tenant-admin` (vs `master`)

Interactive checklist (tickable beside chat): open the Cursor canvas  
`multi-tenant-admin-test-plan.canvas.tsx` in this workspace’s canvases folder.

**Automated:** headed Playwright suite — `npm run test:e2e` (see [e2e-playwright.md](./e2e-playwright.md)). Specs `12`–`18` exercise real money mutations (transactions, splits, accounts, mortgage extra, goals, summary, lists, calendar, What I owe). Prefer that for regression; use this checklist for judgment calls (theme, Graph OAuth, live AI).

**Do not** treat the full CHANGELOG as one QA session. Ship blockers are **P0**. Core screen smoke is **P1**. Theme/jobs are **P2**.

Default seed: `matt@homefinance.local` / `ChangeMe123!` (Matt = super-admin), Sydney in the same household. Override via `SEED_*` env.

Suggested order: Prep → Auth → Admin → Onboarding → Feature gates → Isolation → Core smoke → Settings → Theme → Jobs.

---

## 0. Prep / environment (P0)

- [ ] `npm run db:push` applies migrations `0027`–`0032` without errors
- [ ] `npm run db:seed` completes; Matt + Sydney can sign in
- [ ] `npm run dev` boots with `DATABASE_URL` set
- [ ] Second browser/profile ready (isolation + registration)

---

## 1. Auth, registration, passwords (P0)

Walkthrough:

1. `/login` as Matt → app loads
2. Login links to `/register`
3. Incognito `/register` → pending household → `/pending-approval`
4. Pending user cannot open `/dashboard`
5. Admin approve → user enters app → `/welcome`
6. Admin reject path leaves household blocked
7. Admin reset password → forced `/change-password` → flag cleared
8. Settings → Profile → change password (bad current fails)
9. Non–super-admin cannot use `/admin`
10. Sign out/in keeps `householdId`; Home loads

Checklist:

- [ ] Login works for seeded Matt
- [ ] Login page links to `/register`
- [ ] Self-register → pending → `/pending-approval`
- [ ] Pending user blocked from app routes
- [ ] After approve, user can enter app
- [ ] Reject leaves household inactive/blocked
- [ ] Admin reset → `/change-password` gate works
- [ ] Voluntary password change works
- [ ] Non–super-admin blocked from `/admin`
- [ ] Re-login keeps household context

---

## 2. Onboarding `/welcome` (P0)

Walkthrough: five steps (accounts → payday → income → categories → budget auto-allocate). Skip → Home banner. Resume mid-flow. Settings can reopen guide.

- [ ] `not_started` forced to `/welcome`
- [ ] Step 1 accounts + primary
- [ ] Step 2 payday persists
- [ ] Step 3 income
- [ ] Step 4 categories; Splits/Mortgage plumbing cats hidden
- [ ] Step 5 auto-allocate
- [ ] Skip → banner → resume
- [ ] Complete clears banner; Settings reopen works
- [ ] Mid-flow resume lands on saved step

---

## 3. Admin portal (P0)

Screens: `/admin/houses`, `/admin/houses/[id]`, `/admin/users`, `/admin/features`, `/admin/queries`.

- [ ] Admin link only for super-admin
- [ ] Houses list: counts, approval, entitlement chips
- [ ] House detail: rename, approve/reject, features, `ai_tier`
- [ ] Admin-created house is `active`; core features = mortgage + goals
- [ ] Users: create, add, move, super-admin, reset password
- [ ] Features catalogue + server config hints
- [ ] Queries page read-only
- [ ] Mutations revalidate lists

---

## 4. Household feature gating (P0)

Catalogue keys: `ai_budget_analysis`, `recon`, `what_i_owe`, `mortgage`, `goals`. No end-user Settings toggles.

- [ ] AI off → nav + page blocked
- [ ] Recon off → nav + page blocked
- [ ] What I owe off → nav + page blocked
- [ ] Mortgage/Goals off → nav + page blocked
- [ ] Re-enable restores access
- [ ] Settings has no AI/Recon/What I owe toggles
- [ ] Super-admin does not bypass product entitlements
- [ ] Seeded household shows all five gated nav items

---

## 5. Tenant isolation (P0)

- [ ] Second household + user provisioned
- [ ] Household A cannot see B’s expenses/lists/categories/calendar
- [ ] Household B cannot see A’s seeded data
- [ ] Categories are per-household
- [ ] Optional: `tenant-isolation.integration.test.ts` passes

---

## 6. Core finance smoke (P1)

Prove `householdId` wiring did not break money screens (as Matt).

- [ ] Home: tiles, income, recent transactions
- [ ] Add expense (+ optional split)
- [ ] Transactions search/filters/edit
- [ ] Income CRUD
- [ ] Budget allocate respects budget month
- [ ] Accounts + primary + ledger
- [ ] Splits + settlement
- [ ] Lists items/notes/reorder
- [ ] Calendar event create
- [ ] Summary loads
- [ ] Mortgage (if entitled)
- [ ] Goals (if entitled)
- [ ] What I owe both views (if entitled)
- [ ] Recon smoke (if entitled + Graph)
- [ ] Budget AI report smoke (if entitled + keys)

---

## 7. Settings restructure (P1)

- [ ] Profile / Preferences / Household / Data & export sections
- [ ] Profile + password form
- [ ] Dashboard tiles prefs (v2)
- [ ] Lists subsection lazy-loads items
- [ ] Open setup guide from Settings
- [ ] Push section still usable

---

## 8. Theme / layout (P2)

- [ ] Light theme cool surfaces + blue accents
- [ ] Dark theme tinted navy
- [ ] Desktop left sidebar (Home label)
- [ ] Mobile bottom bar + hamburger
- [ ] No Dialog SSR hydration errors

---

## 9. Background jobs (P2, optional)

- [ ] Per-event reminder fires for a household
- [ ] Daily calendar cron binds household context
- [ ] No cross-household push bleed

---

## Related docs

- [multi-household.md](./multi-household.md)
- [admin-portal.md](./admin-portal.md)
- [onboarding.md](./onboarding.md)
- [passwords.md](./passwords.md)
- [feature-access.md](./feature-access.md)
