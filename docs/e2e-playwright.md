# Playwright E2E (`multi-tenant-admin` and beyond)

Headed Chromium suite that walks registration, admin, onboarding, feature gates, tenant isolation, and core screens. Complements the manual checklist in [test-plan-multi-tenant-admin.md](./test-plan-multi-tenant-admin.md).

## Prerequisites

1. Postgres reachable via `DATABASE_URL` in `.env.local` (a wedged or missing DB will make Next hang or exit during instrumentation).
2. Seeded demo household: `npm run db:push` then `npm run db:seed`
3. A healthy Postgres matching `DATABASE_URL` in `.env.local` (this repo’s local URL uses port **5433**). If that port refuses connections, start your Postgres container/service first — Next will fail or hang during DB init.

   The dev database is deliberately **not** in `docker-compose.yml` (that file does not publish 5432, so a
   Coolify host can run several stacks). Start it by hand:

   ```bash
   docker run -d --name homefinance-db \
     -e POSTGRES_USER=homefinance -e POSTGRES_PASSWORD=homefinance -e POSTGRES_DB=homefinance \
     -p 5433:5432 -v homefinance_pgdata:/var/lib/postgresql/data postgres:16-alpine
   ```
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

## Watching one flow instead of the suite

The suite registers households, resets passwords and signs in and out
constantly, because that is what it is testing. None of it is interesting to
watch. The demo run is the opposite: **one sign-in as the seeded user, one
browser, the whole app in order**, pausing between screens so each one can be
read.

```bash
npm run test:e2e:demo
```

Its assertions are real, so it fails on a broken screen rather than scrolling
past it — it is a smoke test you can watch, not a screen recording.

```bash
# Slower or faster (default 350ms per action, 1.5s between screens)
E2E_SLOW_MO=800 E2E_DEMO_PAUSE=3000 npm run test:e2e:demo
```

PowerShell sets those differently:

```
$env:E2E_SLOW_MO="800"; $env:E2E_DEMO_PAUSE="3000"; npm run test:e2e:demo
```

## Seeing the phone layout

The app is mobile-first — the Add sheet, the bottom bar and the centre button
only exist below the desktop breakpoint — so the desktop run never shows half
of what was designed.

```bash
# The demo flow on a Pixel 5: 393x851, touch events, mobile bottom bar
npm run test:e2e:demo:mobile

# The whole suite on a phone
E2E_DEVICE=mobile npm run test:e2e
```

```
# PowerShell, whole suite on a phone
$env:E2E_DEVICE="mobile"; npm run test:e2e
```

Device emulation is a real one: Android Chrome user agent, five touch points,
and mouse events translated to touch, so anything gated on hover behaves as it
does on a phone. Reload-time device checks re-run because the emulation is set
before the page loads.

## What is covered

| Spec | Focus |
|------|--------|
| `01`–`04` | Auth, register/approve/reject, passwords, full `/welcome` |
| `05`–`07` | Admin, feature gates off/on, tenant isolation |
| `08` | Core screen smoke (routes load) |
| `09`–`11` | Settings, gated feature shells, theme |
| `12` | **Add sheet** spend + consequence panel, search, **add income**, `/income` redirect |
| `13` | **Create account**, **Transfer Money** between accounts |
| `14` | **Split evenly / by share / exact amounts**, the refusal when shares don't add up, Sydney **Settle into a category** |
| `15` | **Mortgage extra payment** (behind More details), rate changes, **goal as a dated category** |
| `16` | **Budget** headline + category sheet, **Reports** tabs, Home hero and breakdown |
| `17` | **List item** + create list in Settings, **calendar event** |
| `18` | **What I owe** / **Owed to me** after a split |
| `19` | `/new-month`, **balance check**, **log the shop**, bank-inbox rules, how-this-works |

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
