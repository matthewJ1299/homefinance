# Playwright E2E (`multi-tenant-admin` and beyond)

Headed Chromium suite that walks registration, admin, onboarding, feature gates, tenant isolation, and core screens. Complements the manual checklist in [test-plan-multi-tenant-admin.md](./test-plan-multi-tenant-admin.md).

## Prerequisites

1. Postgres reachable via `DATABASE_URL` in `.env.local` (a wedged or missing DB will make Next hang or exit during instrumentation).
2. Seeded demo household: `npm run db:push` then `npm run db:seed`
3. A healthy Postgres matching `DATABASE_URL` in `.env.local` (this repo’s local URL uses port **5433**). If that port refuses connections, start your Postgres container/service first — Next will fail or hang during DB init.
4. Playwright starts its **own** app on **`http://127.0.0.1:3100`** by default (avoids a wedged `:3000`). Do not point it at a dead listener.

Default users (override with `SEED_*`):

- `matt@homefinance.local` / `ChangeMe123!` (super-admin)
- `sydney@homefinance.local` / `ChangeMe123!`

## Run (headed — you watch the browser)

```bash
npm run test:e2e
```

Defaults:

- **Headed** Chromium (not headless)
- `slowMo: 200` so actions are visible
- `workers: 1` so steps run in order on one window

Useful variants:

```bash
# Faster local (still headed)
# PowerShell:
$env:E2E_SLOW_MO="0"; npm run test:e2e

# Headless (CI / quiet)
$env:E2E_HEADLESS="1"; npm run test:e2e

# Playwright inspector (step through)
npm run test:e2e:debug

# Interactive UI mode
npm run test:e2e:ui

# One file
npx playwright test --config=e2e/playwright.config.ts e2e/specs/01-auth.spec.ts

# HTML report after a run
npm run test:e2e:report
```

## What is covered

| Spec | Focus |
|------|--------|
| `01`–`04` | Auth, register/approve/reject, passwords, full `/welcome` |
| `05`–`07` | Admin, feature gates off/on, tenant isolation |
| `08` | Core screen smoke (routes load) |
| `09`–`11` | Settings, gated feature shells, theme |
| `12` | **Add expense** (Transactions + Add hub), search, **add income** |
| `13` | **Create account**, **Transfer Money** between accounts |
| `14` | **Equal split expense** + Sydney **Settle** |
| `15` | **Mortgage extra payment**, rate-changes UI, **create savings goal** |
| `16` | **Budget** auto-allocate (when enabled), **Summary** after mutations |
| `17` | **List item** + create list in Settings, **calendar event** |
| `18` | **What I owe** / **Owed to me** after a split |

Finance helpers live in `e2e/helpers/finance.ts`.

## What is intentionally not deep-automated

- **Microsoft Graph OAuth** (Recon connect/sync) — needs live Azure app + mailbox
- **Live LLM calls** (Budget AI generate/apply) — needs API keys and is non-deterministic
- **Push notification delivery** — device/OS dependent

Those stay in the manual plan. Recon / Budget AI report pages are still opened as shells in `10-gated-features`.

## Design notes

- Prefer role/label selectors; `data-testid="feature-unavailable"` only where gating must be unambiguous
- Unique emails per run (`E2E_RUN_ID` / timestamp) so registration tests do not collide
- Do not point this suite at production; it creates households and toggles entitlements on the seeded house

## Alternatives

- **Cypress** — fine, but Playwright is stronger for multi-context (two users) and headed debugging
- **Only P0 specs in CI** — use `npx playwright test e2e/specs/0{1,2,3,4,5,6,7}-*` with `E2E_HEADLESS=1` if the full suite is too slow on the pipeline
