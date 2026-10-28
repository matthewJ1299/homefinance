# Handoff: HomeFinance UX redesign

## Overview

HomeFinance is an existing Next.js household-finance PWA for couples and shared
households: budgets, shared expense splits, accounts, mortgage equity, shared
lists and a shared calendar in one app, replacing Splitwise + Google Calendar +
Todoist for the household.

This bundle is the output of a full UX review and redesign of the existing app.
It covers a rewrite of the money model (per-category available, N-person splits),
a new one-sheet Add flow, a re-prioritised Home, Reports replacing Summary, a
mortgage equity story, dark mode tokens, onboarding with invites, and the
in-between states (empty, error, loading).

Target for this work: **beta**. Scope decisions confirmed by the product owner
are in "Confirmed scope" below — read that before planning.

## About the design files

The `.dc.html` files in this bundle are **design references written in HTML**.
They are prototypes showing intended layout, hierarchy and behaviour. They are
**not** production code and must not be copied into the app.

The task is to **recreate these designs inside the existing HomeFinance
codebase** — Next.js App Router, React server/client components, Tailwind with
the project's CSS-variable token classes, and the project's existing primitives
(`AvatarCircle`, `EmptyState`, `SectionHeader`, the sheet/dialog components).
Use those; do not introduce a new component library, and do not hand-write hex
codes where a token class exists.

The three `IMPLEMENTATION_*.md` documents are the authoritative spec. They were
written against the real repository, referencing real file paths, and they
contain diffs. Where a design file and a doc disagree, the docs win.

## Fidelity

**High-fidelity.** Colours, type scale, spacing, copy and interaction states are
final. Recreate the UI faithfully using the codebase's existing token classes and
primitives. Copy strings are final too — see the copy table (UI doc section 12);
17 renames are mandatory and must be applied consistently, including in the AI
report prompt.

The one exception: the desktop two-column layouts (UI doc section 15) are
specified in prose and code, not mocked in every screen. Follow the doc.

## Read these in order

1. `IMPLEMENTATION_PLAN.md` — 15 phases + Phase 12b, migration ledger from
   `0033`, dependencies, risk notes, commit sequence. **Start here.**
2. `IMPLEMENTATION_CODE.md` — real diffs against the repo's services,
   repositories, actions and validators; the three bugs found while reading the
   code; the full migration SQL; tests for Phase 0.
3. `IMPLEMENTATION_UI.md` — every screen: before, after, component-by-component
   specs, the copy table, dark mode, accessibility, and what is deliberately
   left alone.

## Three bugs to fix before anything else

Found while reading the existing code. All three are in CODE doc "Three
findings", and all three land in Phases 0–3:

1. **`budgets` unique constraint omits `user_id`** — budgets are not actually
   per-user, so two household members' budgets collide on upsert. Migration
   `0033_budgets_per_user_pg.sql`. This must go first; once the rows have merged,
   the split is not recoverable per-user.
2. **Two different meanings of "carryover"** in the same codebase — one is
   month-to-month leftover, one is unassigned money. Phase 2 names them
   `carried_in_minor` and `unassigned`.
3. **Split maths** assumes two people and reads `others[0]` in several places.
   Phase 3 replaces it with an `expense_participants` table and a pure
   `participants.ts` share solver (remainder distributed deterministically, so
   shares always sum to the total).

## Confirmed scope (beta)

| Area | Decision |
|---|---|
| Per-category available | Leftovers stay in the category; overspends deduct from next month. The core change (Phase 2) |
| Splits | N people, equal shares by default, explicit `expense_participants` rows |
| Budgets | Private per user; accounts can be shared per account |
| Goals | **Not a separate feature.** A goal is a category with `target_minor` + `target_date`; `/goals` is a filtered budget view. Phase 12b |
| Notifications | Push **only** for: a split added or changed that involves you, calendar events, reminders. Overspend, settle requests and "money landed" are in-app only, on Home's needs-you rows |
| Failed split | Ships as designed: both sides revert or neither, with a named recovery row. Priority item in Phase 15 |
| Approval wait (`/pending-approval`) | **Out of beta scope.** Copy-only: what is happening, roughly how long. The designed waiting UX stays on the shelf |
| Summary | Replaced by Reports; `/summary` redirects to `/reports` |
| Home row density | Density **4c** — compact rows with 4a's icon and colour treatment |
| Tutorial | No guided tour. A `/how-this-works` page plus in-context explanation |

## Screens

Specs for each are in `IMPLEMENTATION_UI.md` at the section given. Each section
has Before / After and per-component detail (sizes, token classes, copy, states).

| # | Screen | Purpose | UI doc |
|---|---|---|---|
| 1 | Home | Answers "can I spend?" — envelope hero, one prioritised needs-you stream, category remaining, last few, household strip | §1 |
| 2 | Add sheet | One sheet: keypad, category carrying what's left, participant avatars, live consequence panel | §2 |
| 3 | Budget | One headline (unassigned), one three-figure line, grouped read-only rows; a sheet for edits; `/new-month` | §3 |
| 4 | Splits | Overall figure, one card per person, recent shared spends; groups become a filter; settle sheet | §4 |
| 5 | Accounts & Transactions | Shared/private switch with the consequence in words; balance-check sheet; my/theirs toggle deleted | §5 |
| 6 | Lists | "Done shopping?" fires once per shop, not once per item | §6 |
| 7 | Calendar | Initials not dots; event cost with "Log it" | §7 |
| 8 | Reports | Replaces Summary; period defaults to since you started | §8 |
| 9 | Mortgage | Share of what's paid for so far; three story templates; setup solves the shares | §9 |
| 10 | Recon | Rule-matched rows grouped under one Accept-all | §10 |
| 11 | Onboarding | Invite is step 1; the joining side designed; payday step | §16 |
| 12 | Desktop | Sidebar left at fixed width, grouped; content in two columns | §15 |

## Interactions and behaviour

- **Add sheet consequence panel** recomputes on every keystroke and states what
  the spend does to the category. `min-h-[50px]` is required or the keypad jumps
  as the text length changes. One toast on save, not three.
- **Home needs-you list** is a single array with a single sort; every feature
  competes on the same ordering. The ordering *is* the UX — see UI §1.
- **Bottom nav centre button** opens the Add sheet instead of routing; long-press
  falls back to the old `/add` hub.
- **`/new-month`** fires once after the budget-month start day passes. It is not
  a question — no "is it a new month?" prompt. Skipping still calls `openMonth`.
- **Balance check** offers two explicit buttons rather than silently correcting.
- **Settle sheet** orders targets most-negative first.
- Empty, loading and error states use the existing `EmptyState` primitive on
  every list, category list, report and calendar month (Phase 15).

## State and data

The money arithmetic lives in pure functions so it can be tested without a DB:
`src/lib/services/finance/accounts.ts` (per-category available),
`finance/participants.ts` (share solving), `finance/mortgage-plan.ts` (solver),
`report.service.ts` (pure arithmetic over the ledger).

Phase 0 writes the tests **first**: `budget-arithmetic`, `participants`,
`mortgage-solver` unit tests, plus `reconcile` and `rollover` integration tests
on the existing harness. The design review caught the same class of bug four
times — a total that did not equal the sum of its parts — so these guardrails go
in before the rewrite.

Migrations `0033`–`0042` (plus `0040b` for goals) are all additive and listed
with full SQL in CODE Phase 1. Register each in
`src/lib/db/migration-manifest.ts`. **Phase 2 is the phase that can silently
corrupt history** — see the PLAN risk notes before running it.

## Design tokens

No hex codes in components. Everything goes through the token classes; these six
variables are added to **both** blocks in `src/app/globals.css` (Phase 13):

| Variable | Light | Dark |
|---|---|---|
| `--success` | `#047857` | `#34d399` |
| `--success-foreground` | `#f8fbff` | `#0f1520` |
| `--success-surface` | `#e7f7f0` | `#12251f` |
| `--warning` | `#92400e` | `#fbbf24` |
| `--warning-surface` | `#fffaf0` | `#241f14` |
| `--emphasis` | `#0f1520` | `#e8edf5` |

Do Phase 13 **before** Phases 4–12 are called done, or every screen gets touched
twice.

Dark mode is not a colour swap. Four things need real decisions (UI §11):

1. `#ef4444` on `#161b27` reads brown and fails contrast — destructive text
   becomes `#f87171` on dark; tint backgrounds go 6% → 9%.
2. `#5b8def` takes dark text (`#0f1520`), not white — white on that blue is
   under 3:1. Button weight goes up one step.
3. `--emphasis` inverts — the near-black "Cover it" button is invisible on dark.
4. Sheets need a lighter surface, not a shadow: card-level surface with a 1px
   `#262f42` top edge, scrim at 55% black.

Also: the hero gradient flips direction (lift *toward* `#1b2436`, because a
card darker than the background reads as a hole), and the today marker on the
pace bar becomes `--emphasis`.

Accessibility and mobile requirements are in UI §13. Hit targets never below
44px.

## Assets

None new. All iconography and avatars come from the existing app; the design
files use the project's own primitives and no external imagery. Any picture-like
element in the prototypes is a placeholder.

## Deliberately unchanged

UI §18 lists what must **not** be "fixed" later. Read it — several of the
untouched areas are untouched on purpose.

## Files in this bundle

Spec (authoritative):

- `IMPLEMENTATION_PLAN.md`
- `IMPLEMENTATION_CODE.md`
- `IMPLEMENTATION_UI.md`

Design references (HTML prototypes — open in a browser):

- `HomeFinance Full Flow.dc.html` — every screen as four filmstrips plus the
  six-step money loop. **Best starting point for orientation.**
- `HomeFinance Design Pass.dc.html` — Home, Budget, Add, Splits, Accounts, shell
- `HomeFinance Design Pass 2.dc.html` — Lists, Calendar, Transactions, mortgage
  story, setup with invites
- `HomeFinance Design Pass 3.dc.html` — Home row densities (4c is the pick),
  Reports, mortgage setup templates, per-account sharing
- `HomeFinance Design Pass 4.dc.html` — Goals, empty states, Settings,
  notifications, failed-split recovery, approval wait, login
- `HomeFinance Dark Mode.dc.html` — dark mode treatment
- `HomeFinance Current UI.dc.html` — the app as it is today, for comparison
- `HomeFinance Spend Flow Prototype.dc.html` — interactive Add-flow prototype
- `support.js` — runtime required by the `.dc.html` files; keep it beside them

Screenshots (`screenshots/`) — flat captures of the design files, scrolled
through at reduced zoom, for reference without opening the HTML. Numbered by
scroll position within each file:

- `0N-full-flow.png` — the four filmstrips and the money loop
- `0N-pass1.png` … `0N-pass4.png` — the four design passes
- `0N-dark-mode.png`, `0N-current-ui.png`

The HTML files are the reference of record; the screenshots are a convenience
and are lower fidelity than the live files.

## Suggested order of work

1. Phases 0–3 as one reviewable PR: tests, migrations, per-category available,
   participants. This is the foundation and the risky part.
2. Phase 13 (tokens) before any screen work is signed off.
3. Phases 4–6: Add sheet, Home, Budget — the daily loop.
4. Phases 7–12 + 12b in any order; they are independent.
5. Phases 14–15: onboarding, then the unglamorous states.

The PLAN doc's "Commit sequence" and "Sequencing notes" sections have the detail.
