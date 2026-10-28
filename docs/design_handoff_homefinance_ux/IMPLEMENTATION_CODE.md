# HomeFinance — exact code changes

Companion to `IMPLEMENTATION_PLAN.md`. Real signatures from
`multi-tenant-admin`. Diffs are `-`/`+` against the file as it stands.

---

## Three findings from reading the code

**1. `budgets` unique constraint omits `user_id` — budgets are not actually per-user.**

`src/lib/repositories/sql/budget.repository.ts:56`

```sql
ON CONFLICT (household_id, category_id, month) DO UPDATE SET allocated_amount = excluded.allocated_amount
```

`user_id` is written but not part of the conflict target. In a two-person
household, Sydney saving R5 000 to Groceries **overwrites your row** — last
write wins, and `getAllocationsForMonth` then filters by `user_id` so one of you
sees zero. Everything in the design rests on "budgets are private", so this is a
correctness bug, not a nicety. **Migration `0033` must fix it before anything
else in Phase 1.**

**2. There are two different meanings of "carry over" and they must not be conflated.**

`BudgetService.resolveEffectiveAllocations` walks back up to `CARRY_OVER_MONTHS = 12`
and reuses the last **assigned amount** as this month's assigned amount. That is a
template convenience ("same amounts as August") and it should stay.

What the design adds is carrying the **leftover** (`available`) into the next
month. Different number, different column. Keeping `resolveEffectiveAllocations`
and adding `carried_in_minor` separately is deliberate — do not try to make one
mechanism serve both.

**3. `calculateBudgetOverviewArithmetic` is already a pure function.**

`src/lib/services/finance/accounts.ts:33`. All the new arithmetic goes here, not
in the service, so Phase 0's tests need no database.

---

## Phase 0 — Tests

### `src/__tests__/unit/budget-arithmetic.test.ts` (new)

Pure, no DB. Tests the function Phase 2 rewrites.

```ts
import { describe, it, expect } from "vitest";
import { calculateBudgetOverviewArithmetic } from "@/lib/services/finance/accounts";

const cats = [
  { id: 1, name: "Groceries", groupName: "Day to day", costType: "variable" as const, rollover: true },
  { id: 2, name: "Rent", groupName: "Bills", costType: "fixed" as const, rollover: true },
  { id: 3, name: "Car service", groupName: "Saving up", costType: "variable" as const, rollover: true },
];

function build(over: Partial<Parameters<typeof calculateBudgetOverviewArithmetic>[0]> = {}) {
  return calculateBudgetOverviewArithmetic({
    totalIncome: 3_200_000,
    totalExpenses: 1_798_000,
    categories: cats,
    allocationMap: new Map([[1, 500_000], [2, 1_200_000], [3, 40_000]]),
    carriedInMap: new Map([[3, 320_000]]),
    expenses: [
      { userId: 1, categoryId: 1, amount: 542_000 },
      { userId: 1, categoryId: 2, amount: 1_200_000 },
    ],
    spentByCategory: { 1: 542_000, 2: 1_200_000 },
    ...over,
  });
}

describe("budget arithmetic", () => {
  it("available = assigned + carriedIn - spent, per category", () => {
    const r = build();
    const by = new Map(r.categoryRows.map((c) => [c.categoryId, c]));
    expect(by.get(1)!.available).toBe(-42_000);        // 500000 + 0 - 542000
    expect(by.get(2)!.available).toBe(0);
    expect(by.get(3)!.available).toBe(360_000);        // 40000 + 320000 - 0
  });

  it("envelopeLeft is the sum of every category's available", () => {
    const r = build();
    const summed = r.categoryRows.reduce((s, c) => s + c.available, 0);
    expect(r.envelopeLeft).toBe(summed);
    expect(r.envelopeLeft).toBe(318_000);
  });

  it("envelopeTotal is assigned plus carried in", () => {
    const r = build();
    expect(r.envelopeTotal).toBe(500_000 + 1_200_000 + 40_000 + 320_000);
  });

  it("unassigned is income minus assigned, and ignores carry-in", () => {
    const r = build();
    expect(r.unassigned).toBe(3_200_000 - 1_740_000);
    expect(r.unassigned).toBe(1_460_000);
  });

  it("overspentTotal is the positive sum of negative availables", () => {
    const r = build();
    expect(r.overspentTotal).toBe(42_000);
  });

  it("a category with no allocation and no spend is inert", () => {
    const r = build({ allocationMap: new Map(), carriedInMap: new Map(), spentByCategory: {}, expenses: [] });
    expect(r.envelopeLeft).toBe(0);
    expect(r.overspentTotal).toBe(0);
  });
});
```

### `src/__tests__/unit/participants.test.ts` (new)

```ts
import { describe, it, expect } from "vitest";
import { divideEqually, validateParticipantShares } from "@/lib/services/finance/participants";

describe("dividing a bill", () => {
  it.each([
    [90_000, [1], { 1: 90_000 }],
    [90_000, [1, 2], { 1: 45_000, 2: 45_000 }],
    [90_000, [1, 2, 3], { 1: 30_000, 2: 30_000, 3: 30_000 }],
    [90_000, [1, 2, 3, 4], { 1: 22_500, 2: 22_500, 3: 22_500, 4: 22_500 }],
  ])("divides %i among %j", (amount, ids, expected) => {
    expect(divideEqually(amount, ids as number[])).toEqual(expected);
  });

  it("never loses a cent to rounding", () => {
    for (const amount of [1, 7, 100, 101, 999, 84_231]) {
      for (const n of [1, 2, 3, 4, 5, 7]) {
        const ids = Array.from({ length: n }, (_, i) => i + 1);
        const shares = divideEqually(amount, ids);
        const sum = Object.values(shares).reduce((s, v) => s + v, 0);
        expect(sum).toBe(amount);
      }
    }
  });

  it("gives the remainder to the earliest participants, deterministically", () => {
    expect(divideEqually(100, [1, 2, 3])).toEqual({ 1: 34, 2: 33, 3: 33 });
    expect(divideEqually(100, [1, 2, 3])).toEqual(divideEqually(100, [1, 2, 3]));
  });

  it("rejects shares that do not sum to the amount", () => {
    expect(validateParticipantShares(90_000, [
      { userId: 1, shareMinor: 45_000 },
      { userId: 2, shareMinor: 44_999 },
    ])).toEqual({ ok: false, error: "Shares add up to R 899,99, not R 900,00" });
  });

  it("rejects a participant list without the payer", () => {
    expect(validateParticipantShares(1_000, [{ userId: 2, shareMinor: 1_000 }], 1))
      .toEqual({ ok: false, error: "The payer must be one of the participants" });
  });

  it("rejects duplicate participants", () => {
    expect(validateParticipantShares(1_000, [
      { userId: 1, shareMinor: 500 },
      { userId: 1, shareMinor: 500 },
    ], 1).ok).toBe(false);
  });
});
```

### `src/__tests__/unit/mortgage-solver.test.ts` (new)

```ts
import { describe, it, expect } from "vitest";
import { solveShares } from "@/lib/services/finance/mortgage-plan";

const base = {
  price: 3_000_000_00,
  paymentMinor: 21_400_00,
  termMonths: 240,
  annualRateBp: 1_100,
  deposits: [{ userId: 2, amountMinor: 780_000_00 }],
  targets: [{ userId: 1, shareBp: 5_000 }, { userId: 2, shareBp: 5_000 }],
};

describe("mortgage share solver", () => {
  it("gives the non-depositor the larger share", () => {
    const r = solveShares(base);
    expect(r.reachable).toBe(true);
    const matt = r.shares.find((s) => s.userId === 1)!;
    const syd = r.shares.find((s) => s.userId === 2)!;
    expect(matt.monthlyMinor).toBeGreaterThan(syd.monthlyMinor);
  });

  it("the shares sum to the total payment exactly", () => {
    const r = solveShares(base);
    expect(r.shares.reduce((s, x) => s + x.monthlyMinor, 0)).toBe(base.paymentMinor);
  });

  it("lands on the target split within a rand at term end", () => {
    const r = solveShares(base);
    for (const s of r.shares) {
      const target = base.targets.find((t) => t.userId === s.userId)!.shareBp;
      expect(Math.abs(s.projectedShareBp - target)).toBeLessThanOrEqual(1);
    }
  });

  it("equal payments and no deposits means equal shares", () => {
    const r = solveShares({ ...base, deposits: [] });
    const [a, b] = r.shares;
    expect(Math.abs(a.monthlyMinor - b.monthlyMinor)).toBeLessThanOrEqual(1);
  });

  it("reports an unreachable target instead of clamping", () => {
    const r = solveShares({
      ...base,
      targets: [{ userId: 1, shareBp: 9_900 }, { userId: 2, shareBp: 100 }],
    });
    expect(r.reachable).toBe(false);
    expect(r.closest).toBeDefined();
    expect(r.shares.reduce((s, x) => s + x.monthlyMinor, 0)).toBe(base.paymentMinor);
    expect(r.blockers.length).toBeGreaterThan(0);
  });

  it("holds the target when the rate changes", () => {
    const before = solveShares(base);
    const after = solveShares({ ...base, annualRateBp: 1_250 });
    for (const s of after.shares) {
      const target = base.targets.find((t) => t.userId === s.userId)!.shareBp;
      expect(Math.abs(s.projectedShareBp - target)).toBeLessThanOrEqual(1);
    }
    expect(after.shares).not.toEqual(before.shares);
  });
});
```

### `src/__tests__/integration/reconcile.integration.test.ts` (new)

Follows the existing integration harness in
`src/__tests__/integration/helpers`. This is the one that catches the class of
bug the design review kept finding.

```ts
import { describe, it, expect, beforeAll } from "vitest";
import { withHouseholdFixture } from "./helpers/fixture";
import { BudgetService } from "@/lib/services/budget.service";
import { ExpenseService } from "@/lib/services/expense.service";
import { getAccountRepository, getAccountTransactionRepository } from "@/lib/repositories";

describe.each([
  ["one person", 1],
  ["two people", 2],
  ["four people", 4],
])("reconciliation — %s", (_label, memberCount) => {
  it("envelope total equals the sum of category availables", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month }) => {
      const overview = await new BudgetService().getOverview(month, users[0].id);
      const summed = overview.categories.reduce((s, c) => s + c.available, 0);
      expect(overview.envelopeLeft).toBe(summed);
    });
  });

  it("category spent equals the sum of that user's own shares", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month }) => {
      const me = users[0].id;
      const overview = await new BudgetService().getOverview(month, me);
      const { expenses } = await new ExpenseService().getByMonth(month, me);
      for (const row of overview.categories) {
        const fromLedger = expenses
          .filter((e) => e.categoryId === row.categoryId)
          .reduce((s, e) => s + e.myShare, 0);
        expect(row.spent).toBe(fromLedger);
      }
    });
  });

  it("assigned + carriedIn - spent === available for every category", async () => {
    await withHouseholdFixture({ memberCount }, async ({ users, month }) => {
      const overview = await new BudgetService().getOverview(month, users[0].id);
      for (const c of overview.categories) {
        expect(c.assigned + c.carriedIn - c.spent).toBe(c.available);
      }
    });
  });

  it("each account balance equals the sum of its transactions", async () => {
    await withHouseholdFixture({ memberCount }, async () => {
      const accounts = await getAccountRepository().findAll();
      const txRepo = getAccountTransactionRepository();
      for (const a of accounts) {
        const txs = await txRepo.findByAccountId(a.id);
        expect(a.balance).toBe(txs.reduce((s, t) => s + t.amount, 0));
      }
    });
  });

  it("one member's allocation never overwrites another's", async () => {
    if (memberCount < 2) return;
    await withHouseholdFixture({ memberCount }, async ({ users, month, categories }) => {
      const svc = new BudgetService();
      const cat = categories[0].id;
      await svc.setAllocation(cat, month, 500_000, users[0].id);
      await svc.setAllocation(cat, month, 250_000, users[1].id);
      const a = await svc.getOverview(month, users[0].id);
      const b = await svc.getOverview(month, users[1].id);
      expect(a.categories.find((c) => c.categoryId === cat)!.assigned).toBe(500_000);
      expect(b.categories.find((c) => c.categoryId === cat)!.assigned).toBe(250_000);
    });
  });
});
```

### `src/__tests__/integration/rollover.integration.test.ts` (new)

```ts
describe("rollover across three months", () => {
  it("carries a leftover into the same category", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories.find((c) => c.name === "Car service")!.id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      const m2 = await svc.budget.getOverview(months[1], me);
      expect(m2.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(40_000);
      await svc.budget.openMonth(months[2], me);
      const m3 = await svc.budget.getOverview(months[2], me);
      expect(m3.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(80_000);
    });
  });

  it("an overspend does not carry into the category, it reduces unassigned", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories.find((c) => c.name === "Groceries")!.id;
      await svc.budget.setAllocation(cat, months[0], 500_000, me);
      await svc.expense.create(me, { categoryId: cat, amount: 542_000, date: `${months[0]}-15` });
      await svc.budget.openMonth(months[1], me);
      const m2 = await svc.budget.getOverview(months[1], me);
      expect(m2.categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(0);
      expect(m2.carriedOverspend).toBe(42_000);
      expect(m2.unassigned).toBe(m2.totalIncome - m2.totalAssigned - 42_000);
    });
  });

  it("covering the overspend first means nothing is deducted", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const groceries = categories.find((c) => c.name === "Groceries")!.id;
      const fuel = categories.find((c) => c.name === "Fuel")!.id;
      await svc.budget.setAllocation(groceries, months[0], 500_000, me);
      await svc.budget.setAllocation(fuel, months[0], 250_000, me);
      await svc.expense.create(me, { categoryId: groceries, amount: 542_000, date: `${months[0]}-15` });
      await svc.budget.coverOverspend({ fromCategoryId: fuel, toCategoryId: groceries, month: months[0], amount: 42_000, userId: me });
      await svc.budget.openMonth(months[1], me);
      expect((await svc.budget.getOverview(months[1], me)).carriedOverspend).toBe(0);
    });
  });

  it("openMonth is idempotent", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories[0].id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      await svc.budget.openMonth(months[1], me);
      await svc.budget.openMonth(months[1], me);
      expect((await svc.budget.getOverview(months[1], me)).categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(40_000);
    });
  });

  it("editing month 1 does not change month 3", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories[0].id;
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      await svc.budget.openMonth(months[2], me);
      const before = await svc.budget.getOverview(months[2], me);
      await svc.budget.setAllocation(cat, months[0], 999_000, me);
      const after = await svc.budget.getOverview(months[2], me);
      expect(after.categories.find((c) => c.categoryId === cat)!.carriedIn)
        .toBe(before.categories.find((c) => c.categoryId === cat)!.carriedIn);
    });
  });

  it("rollover: false resets the category each month", async () => {
    await withHouseholdFixture({ memberCount: 1 }, async ({ users, months, categories, svc }) => {
      const me = users[0].id;
      const cat = categories[0].id;
      await svc.category.update(cat, { rollover: false });
      await svc.budget.setAllocation(cat, months[0], 40_000, me);
      await svc.budget.openMonth(months[1], me);
      expect((await svc.budget.getOverview(months[1], me)).categories.find((c) => c.categoryId === cat)!.carriedIn).toBe(0);
    });
  });
});
```

Mark the rollover and report suites `it.fails(...)` until Phases 2 and 9 land, so
the branch stays green while showing intent.

---

## Phase 1 — Migrations

### `migrations/0033_budgets_per_user_pg.sql` (new — the bug fix)

```sql
-- budgets.user_id was written but absent from the unique constraint, so one
-- household member's allocation overwrote another's. Rebuild the constraint.

-- 1. Collapse any rows that have already collided: keep the newest per
--    (household, category, month, user) and drop true duplicates.
DELETE FROM budgets b USING budgets newer
WHERE b.household_id = newer.household_id
  AND b.category_id  = newer.category_id
  AND b.month        = newer.month
  AND b.user_id      = newer.user_id
  AND b.id < newer.id;

ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_household_id_category_id_month_key;
DROP INDEX IF EXISTS budgets_household_id_category_id_month_key;

ALTER TABLE budgets
  ADD CONSTRAINT budgets_household_category_month_user_key
  UNIQUE (household_id, category_id, month, user_id);

CREATE INDEX IF NOT EXISTS budgets_user_month_idx ON budgets (household_id, user_id, month);
```

> Rollback: drop the new constraint, recreate the old one. Data written between
> the two is not recoverable per-user, which is why this goes first.

### `migrations/0034_expense_participants_pg.sql` (new)

```sql
CREATE TABLE IF NOT EXISTS expense_participants (
  id            SERIAL PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  expense_id    INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_minor   INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS expense_participants_expense_idx ON expense_participants (expense_id);
CREATE INDEX IF NOT EXISTS expense_participants_user_idx ON expense_participants (household_id, user_id);

-- Backfill 1: split expenses. The payer's share is the total minus every
-- existing allocation; each allocation becomes a participant row.
INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
SELECT e.household_id, e.id, sa.user_id, sa.amount
FROM expenses e
JOIN split_allocations sa ON sa.expense_id = e.id
ON CONFLICT (expense_id, user_id) DO NOTHING;

INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
SELECT e.household_id, e.id, COALESCE(e.paid_by_user_id, e.user_id),
       e.amount - COALESCE((SELECT SUM(sa.amount) FROM split_allocations sa WHERE sa.expense_id = e.id), 0)
FROM expenses e
WHERE EXISTS (SELECT 1 FROM split_allocations sa WHERE sa.expense_id = e.id)
ON CONFLICT (expense_id, user_id) DO NOTHING;

-- Backfill 2: solo expenses get one row for the full amount.
INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
SELECT e.household_id, e.id, e.user_id, e.amount
FROM expenses e
WHERE NOT EXISTS (SELECT 1 FROM split_allocations sa WHERE sa.expense_id = e.id)
ON CONFLICT (expense_id, user_id) DO NOTHING;
```

> `split_allocations` stays as the debt ledger. `expense_participants` is who was
> involved and for how much. Do not drop the former — `calculateSplitBalance`
> and the settlement history read it.
>
> Verify before moving on:
> ```sql
> SELECT COUNT(*) FROM expenses e
> WHERE (SELECT COALESCE(SUM(share_minor),0) FROM expense_participants p WHERE p.expense_id = e.id) <> e.amount;
> ```
> Must return 0.

### `migrations/0035_category_rollover_pg.sql` (new)

```sql
ALTER TABLE budgets     ADD COLUMN IF NOT EXISTS carried_in_minor INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories  ADD COLUMN IF NOT EXISTS rollover BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS budget_month_opens (
  id            SERIAL PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month         TEXT NOT NULL,
  overspend_carried_minor INTEGER NOT NULL DEFAULT 0,
  opened_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id, month)
);
```

`budget_month_opens` is what makes `openMonth` idempotent and gives the
"New month" screen something to be dismissed against.

### `migrations/0036_account_sharing_pg.sql` (new)

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS accounts_shared_idx ON accounts (household_id, is_shared);
```

### `migrations/0037_income_types_pg.sql` (new)

```sql
ALTER TABLE income ADD COLUMN IF NOT EXISTS income_type TEXT;

UPDATE income SET income_type = CASE
  WHEN type = 'salary' THEN 'salary'
  ELSE 'other'
END WHERE income_type IS NULL;

ALTER TABLE income ALTER COLUMN income_type SET DEFAULT 'salary';
ALTER TABLE income ALTER COLUMN income_type SET NOT NULL;
ALTER TABLE income ADD CONSTRAINT income_type_allowed
  CHECK (income_type IN ('salary','bonus','interest','gift','other'));
```

> The existing `type` column (`salary` / `ad_hoc`) is load-bearing for
> settlements — `SplitService.settle` writes `type: "ad_hoc"`. Leave it alone;
> `income_type` is the user-facing taxonomy layered on top.

### `migrations/0038_mortgage_plan_pg.sql` (new)

```sql
CREATE TABLE IF NOT EXISTS mortgage_deposits (
  id            SERIAL PRIMARY KEY,
  household_id  INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  mortgage_id   INTEGER NOT NULL REFERENCES mortgages(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_minor  BIGINT NOT NULL,
  UNIQUE (mortgage_id, user_id)
);

CREATE TABLE IF NOT EXISTS mortgage_targets (
  id              SERIAL PRIMARY KEY,
  household_id    INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  mortgage_id     INTEGER NOT NULL REFERENCES mortgages(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_share_bp INTEGER NOT NULL CHECK (target_share_bp BETWEEN 0 AND 10000),
  UNIQUE (mortgage_id, user_id)
);
```

Basis points, not percent — 50% is `5000`, and integer maths avoids the drift
that makes two people's shares fail to add to 100.

### `migrations/0039_recon_rules_pg.sql` (new)

```sql
CREATE TABLE IF NOT EXISTS recon_rules (
  id                   SERIAL PRIMARY KEY,
  household_id         INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  owner_user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_kind           TEXT NOT NULL CHECK (match_kind IN ('merchant_exact','merchant_contains')),
  match_value          TEXT NOT NULL,
  category_id          INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  participant_user_ids INTEGER[] NOT NULL DEFAULT '{}',
  times_used           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, owner_user_id, match_kind, match_value)
);

CREATE INDEX IF NOT EXISTS recon_rules_owner_idx ON recon_rules (household_id, owner_user_id);
```

### `migrations/0040_shared_list_category_pg.sql` (new)

```sql
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
```

### `migrations/0041_calendar_event_cost_pg.sql` (new)

```sql
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS expected_cost_minor INTEGER;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS expense_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS logged_expense_id  INTEGER REFERENCES expenses(id) ON DELETE SET NULL;
```

`logged_expense_id` stops "Log it" from being tapped twice.

### `migrations/0042_household_budget_month_pg.sql` (new)

```sql
ALTER TABLE households ADD COLUMN IF NOT EXISTS budget_month_start_day INTEGER;

-- Creator's day wins. created_by if present, else the earliest member.
UPDATE households h SET budget_month_start_day = COALESCE(
  (SELECT u.budget_month_start_day FROM users u WHERE u.id = h.created_by_user_id),
  (SELECT u.budget_month_start_day FROM users u WHERE u.household_id = h.id ORDER BY u.id LIMIT 1),
  1
) WHERE h.budget_month_start_day IS NULL;

ALTER TABLE households ALTER COLUMN budget_month_start_day SET DEFAULT 1;
ALTER TABLE households ALTER COLUMN budget_month_start_day SET NOT NULL;

-- Flag households whose members disagreed, so the app can tell them once.
ALTER TABLE households ADD COLUMN IF NOT EXISTS budget_month_notice_pending BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE households h SET budget_month_notice_pending = TRUE
WHERE (SELECT COUNT(DISTINCT u.budget_month_start_day) FROM users u WHERE u.household_id = h.id) > 1;
```

> `users.budget_month_start_day` is **left in place and unread** for one release.
> That is what makes this reversible. Drop it in a later migration.

### `src/lib/db/migration-manifest.ts`

```diff
   "0032_household_approval_pg.sql",
+  "0033_budgets_per_user_pg.sql",
+  "0034_expense_participants_pg.sql",
+  "0035_category_rollover_pg.sql",
+  "0036_account_sharing_pg.sql",
+  "0037_income_types_pg.sql",
+  "0038_mortgage_plan_pg.sql",
+  "0039_recon_rules_pg.sql",
+  "0040_shared_list_category_pg.sql",
+  "0041_calendar_event_cost_pg.sql",
+  "0042_household_budget_month_pg.sql",
 ];
```

---

## Phase 2 — Per-category available

### `src/lib/services/finance/accounts.ts`

Rewrite the pure function. `remaining` / `isOverspent` stay as aliases so the
existing UI keeps compiling while Phases 5–6 land.

```diff
 export interface BudgetCategoryRow {
   categoryId: number;
   categoryName: string;
   groupName: string;
   costType: "fixed" | "variable";
-  allocated: number;
+  /** Assigned this month. */
+  assigned: number;
+  /** Leftover carried in from the prior month. Zero unless the month was opened. */
+  carriedIn: number;
   spent: number;
-  remaining: number;
+  /** assigned + carriedIn - spent. The number the user thinks of as "left". */
+  available: number;
+  rollover: boolean;
+  /** @deprecated alias for `assigned`, kept until the budget UI lands. */
+  allocated: number;
+  /** @deprecated alias for `available`. */
+  remaining: number;
   isOverspent: boolean;
   spentByUser: Record<number, number>;
 }
 
 export function calculateBudgetOverviewArithmetic(input: {
   totalIncome: number;
   totalExpenses: number;
-  categories: Array<{ id: number; name: string; groupName: string; costType?: "fixed" | "variable" }>;
+  categories: Array<{
+    id: number;
+    name: string;
+    groupName: string;
+    costType?: "fixed" | "variable";
+    rollover?: boolean;
+  }>;
   allocationMap: Map<number, number>;
+  carriedInMap: Map<number, number>;
   expenses: Array<{ userId: number; categoryId: number; amount: number }>;
   spentByCategory: Record<number, number>;
 }): {
   balance: number;
-  totalAllocated: number;
+  totalAssigned: number;
+  /** Σ(assigned + carriedIn) — the denominator on Home's pace bar. */
+  envelopeTotal: number;
+  /** Σ available — the Home hero figure. */
+  envelopeLeft: number;
+  /** Positive sum of negative availables. */
+  overspentTotal: number;
   categoryRows: BudgetCategoryRow[];
   unallocated: number;
   isBalanced: boolean;
+  /** @deprecated alias for `totalAssigned`. */
+  totalAllocated: number;
 } {
   const balance = input.totalIncome - input.totalExpenses;
 
-  let totalAllocated = 0;
+  let totalAssigned = 0;
+  let envelopeTotal = 0;
+  let envelopeLeft = 0;
+  let overspentTotal = 0;
+
+  const spentByUserByCategory = new Map<number, Record<number, number>>();
+  for (const e of input.expenses) {
+    const bucket = spentByUserByCategory.get(e.categoryId) ?? {};
+    bucket[e.userId] = (bucket[e.userId] ?? 0) + e.amount;
+    spentByUserByCategory.set(e.categoryId, bucket);
+  }
+
   const categoryRows: BudgetCategoryRow[] = input.categories.map((cat) => {
-    const allocated = input.allocationMap.get(cat.id) ?? 0;
+    const assigned = input.allocationMap.get(cat.id) ?? 0;
+    const carriedIn = input.carriedInMap.get(cat.id) ?? 0;
     const spent = input.spentByCategory[cat.id] ?? 0;
+    const available = assigned + carriedIn - spent;
 
-    totalAllocated += allocated;
-    const remaining = allocated - spent;
-    const spentByUser: Record<number, number> = {};
-    for (const e of input.expenses) {
-      if (e.categoryId !== cat.id) continue;
-      spentByUser[e.userId] = (spentByUser[e.userId] ?? 0) + e.amount;
-    }
+    totalAssigned += assigned;
+    envelopeTotal += assigned + carriedIn;
+    envelopeLeft += available;
+    if (available < 0) overspentTotal += -available;
 
     return {
       categoryId: cat.id,
       categoryName: cat.name,
       groupName: cat.groupName,
       costType: cat.costType ?? "variable",
-      allocated,
+      assigned,
+      carriedIn,
       spent,
-      remaining,
-      isOverspent: remaining < 0,
-      spentByUser,
+      available,
+      rollover: cat.rollover ?? true,
+      allocated: assigned,
+      remaining: available,
+      isOverspent: available < 0,
+      spentByUser: spentByUserByCategory.get(cat.id) ?? {},
     };
   });
 
-  const unallocated = input.totalIncome - totalAllocated;
+  const unallocated = input.totalIncome - totalAssigned;
   const isBalanced = unallocated === 0;
 
-  return { balance, totalAllocated, categoryRows, unallocated, isBalanced };
+  return {
+    balance,
+    totalAssigned,
+    envelopeTotal,
+    envelopeLeft,
+    overspentTotal,
+    categoryRows,
+    unallocated,
+    isBalanced,
+    totalAllocated: totalAssigned,
+  };
 }
```

The `spentByUser` loop was O(categories × expenses); the map above makes it
O(expenses). On a month with 11 categories and 200 expenses that is 2 200
iterations down to 200.

### `src/lib/services/budget.service.ts`

```diff
 export interface BudgetOverviewResult {
   month: string;
   totalIncome: number;
   totalExpenses: number;
   balance: number;
-  totalAllocated: number;
-  /** Current-month only income minus allocations (before rollover adjustment). */
-  baseToAssign: number;
-  /** Positive prior-month cash overspending amount used by rollover logic. */
-  priorMonthCashOverspend: number;
-  /** Adjustment applied to base-to-assign (negative when prior month was overspent). */
-  rolloverAdjustment: number;
-  /** Final amount to allocate for this month after rollover adjustment. */
-  toBeAllocated: number;
-  /** Backward-compatible alias for toBeAllocated. */
-  unallocated: number;
+  totalAssigned: number;
+  /** Σ(assigned + carriedIn). */
+  envelopeTotal: number;
+  /** Σ available — Home's hero figure. */
+  envelopeLeft: number;
+  /** Positive sum of negative availables this month. */
+  overspentTotal: number;
+  /** Uncovered overspend inherited from last month, deducted from unassigned. */
+  carriedOverspend: number;
+  /** income − assigned − carriedOverspend. Money with no job. */
+  unassigned: number;
+  /** Whether this month has been opened (carry-in written). */
+  isOpened: boolean;
+  /** @deprecated alias for `unassigned`. */
+  toBeAllocated: number;
+  /** @deprecated alias for `unassigned`. */
+  unallocated: number;
+  /** @deprecated alias for `totalAssigned`. */
+  totalAllocated: number;
   isBalanced: boolean;
   categories: BudgetCategoryRow[];
   transfers: BudgetTransferDisplay[];
 }
```

Body of `getOverview`:

```diff
     await this.persistMissingAllocationsForMonth(month, allocationMap, categories, userId);
+    const monthState = await this.budgetRepo.getMonthOpenState(month, userId);
+    const carriedInMap = await this.budgetRepo.getCarriedInForMonth(month, userId);
     const spentByCategory = expenseResult.totals.byCategory;
     const categoryMeta = new Map(categories.map((c) => [c.id, c]));
     const budgetArithmetic = calculateBudgetOverviewArithmetic({
       totalIncome,
       totalExpenses,
       categories,
       allocationMap,
+      carriedInMap,
       expenses: expenseResult.expenses,
       spentByCategory,
     });
-    const { balance, totalAllocated, categoryRows, unallocated: baseToAssign } = budgetArithmetic;
-    const priorMonthCashOverspend = await this.computePriorMonthCashOverspend({
-      month,
-      userId,
-      categories,
-      monthsToLoad,
-      allocationsForMonths,
-    });
-    const rolloverAdjustment = -priorMonthCashOverspend;
-    const toBeAllocated = baseToAssign + rolloverAdjustment;
-    const isBalanced = toBeAllocated === 0;
+    const {
+      balance, totalAssigned, envelopeTotal, envelopeLeft, overspentTotal, categoryRows,
+    } = budgetArithmetic;
+    const carriedOverspend = monthState?.overspendCarriedMinor ?? 0;
+    const unassigned = totalIncome - totalAssigned - carriedOverspend;
+    const isBalanced = unassigned === 0;
```

Return:

```diff
     return {
       month,
       totalIncome,
       totalExpenses,
       balance,
-      totalAllocated,
-      baseToAssign,
-      priorMonthCashOverspend,
-      rolloverAdjustment,
-      toBeAllocated,
-      unallocated: toBeAllocated,
+      totalAssigned,
+      envelopeTotal,
+      envelopeLeft,
+      overspentTotal,
+      carriedOverspend,
+      unassigned,
+      isOpened: monthState != null,
+      toBeAllocated: unassigned,
+      unallocated: unassigned,
+      totalAllocated: totalAssigned,
       isBalanced,
       categories: categoryRows,
       transfers: transferDisplays,
     };
```

Delete `computePriorMonthCashOverspend` entirely (lines 205–262). Keep
`resolveEffectiveAllocations` — see finding 2.

New methods:

```ts
  /**
   * Writes carry-in for `month` from the prior month's availables, once.
   * Idempotent: a `budget_month_opens` row is the guard.
   *
   * Positive available carries into the same category (when `rollover`).
   * Negative available does NOT carry into the category — it is summed and
   * recorded as `overspend_carried_minor`, which `getOverview` deducts from
   * unassigned. A category that reads "over budget" before a rand is spent in
   * the new month would make the one-sentence rule unexplainable.
   */
  async openMonth(month: string, userId: number): Promise<{ opened: boolean; carriedOverspend: number }> {
    const existing = await this.budgetRepo.getMonthOpenState(month, userId);
    if (existing) {
      return { opened: false, carriedOverspend: existing.overspendCarriedMinor };
    }

    const previous = prevMonth(month);
    const prior = await this.getOverview(previous, userId);

    let carriedOverspend = 0;
    const carryIn: Array<{ categoryId: number; amount: number }> = [];
    for (const row of prior.categories) {
      if (row.available > 0 && row.rollover) {
        carryIn.push({ categoryId: row.categoryId, amount: row.available });
      } else if (row.available < 0) {
        carriedOverspend += -row.available;
      }
    }

    await withTransaction(async () => {
      for (const { categoryId, amount } of carryIn) {
        await this.budgetRepo.setCarriedIn(categoryId, month, amount, userId);
      }
      await this.budgetRepo.recordMonthOpen(month, userId, carriedOverspend);
    });

    return { opened: true, carriedOverspend };
  }

  /** True when the user's budget month has rolled over and they have not seen the summary. */
  async needsMonthOpen(userId: number): Promise<{ month: string; previous: string } | null> {
    const month = await getDefaultBudgetMonthForUser(userId);
    if (await this.budgetRepo.getMonthOpenState(month, userId)) return null;
    const previous = prevMonth(month);
    const priorAllocations = await this.budgetRepo.getAllocationsForMonth(previous, userId);
    if (priorAllocations.length === 0) return null; // first-ever month, nothing to summarise
    return { month, previous };
  }

  /** Moves money between categories to clear an overspend. Thin wrapper over transfer. */
  async coverOverspend(data: {
    fromCategoryId: number;
    toCategoryId: number;
    month: string;
    amount: number;
    userId: number;
  }) {
    return this.transfer({ ...data, reason: "Covering overspend" });
  }
```

Imports to add:

```diff
-import { prevMonth } from "@/lib/utils/date";
+import { prevMonth } from "@/lib/utils/date";
+import { getDefaultBudgetMonthForUser } from "@/lib/utils/budget-month-for-user";
+import { withTransaction } from "@/lib/db/postgres-client";
```

`transfer()` currently reads `fromRow.remaining` — that alias still resolves to
`available`, so it keeps working unchanged. Worth a comment there:

```diff
     const fromRow = overview.categories.find((c) => c.categoryId === data.fromCategoryId);
     const toRow = overview.categories.find((c) => c.categoryId === data.toCategoryId);
     if (!fromRow || !toRow) return { success: false, error: "Category not found" };
-    if (fromRow.remaining < data.amount) {
+    // `available` includes carry-in, which is correct: money carried into Fuel
+    // is as spendable as money assigned to it this month.
+    if (fromRow.available < data.amount) {
       return { success: false, error: "Insufficient funds in source category" };
     }
```

`autoAllocate` reads `overview.unallocated` — the alias keeps it working, but
change it to `unassigned` in the same commit for clarity.

### `src/lib/repositories/interfaces/budget.repository.ts`

```diff
 export interface BudgetAllocation {
   categoryId: number;
   allocatedAmount: number;
+  carriedInMinor?: number;
 }
+
+export interface BudgetMonthOpenState {
+  month: string;
+  overspendCarriedMinor: number;
+  openedAt: string;
+}
 
 export interface IBudgetRepository {
   getAllocationsForMonth(month: string, userId: number): Promise<BudgetAllocation[]>;
   getAllocationsForMonths(months: string[], userId: number): Promise<BudgetAllocationWithMonth[]>;
   upsertAllocation(categoryId: number, month: string, amount: number, userId: number): Promise<void>;
+  /** Carry-in per category for a month. Empty map when the month is not opened. */
+  getCarriedInForMonth(month: string, userId: number): Promise<Map<number, number>>;
+  setCarriedIn(categoryId: number, month: string, amount: number, userId: number): Promise<void>;
+  getMonthOpenState(month: string, userId: number): Promise<BudgetMonthOpenState | null>;
+  recordMonthOpen(month: string, userId: number, overspendCarriedMinor: number): Promise<void>;
   getTransfersForMonth(month: string, userId: number): Promise<BudgetTransferRecord[]>;
```

### `src/lib/repositories/sql/budget.repository.ts`

```diff
   async upsertAllocation(categoryId: number, month: string, amount: number, userId: number): Promise<void> {
     const hid = requireHouseholdId();
     await run(
       `INSERT INTO budgets (user_id, household_id, category_id, month, allocated_amount) VALUES (?, ?, ?, ?, ?)
-       ON CONFLICT (household_id, category_id, month) DO UPDATE SET allocated_amount = excluded.allocated_amount, updated_at = NOW()`,
+       ON CONFLICT (household_id, category_id, month, user_id) DO UPDATE SET allocated_amount = excluded.allocated_amount, updated_at = NOW()`,
       [userId, hid, categoryId, month, amount]
     );
   }
+
+  async getCarriedInForMonth(month: string, userId: number): Promise<Map<number, number>> {
+    const hid = requireHouseholdId();
+    const rows = await all<{ category_id: number; carried_in_minor: number }>(
+      "SELECT category_id, carried_in_minor FROM budgets WHERE month = ? AND user_id = ? AND household_id = ? AND carried_in_minor <> 0",
+      [month, userId, hid]
+    );
+    return new Map(rows.map((r) => [r.category_id, r.carried_in_minor]));
+  }
+
+  async setCarriedIn(categoryId: number, month: string, amount: number, userId: number): Promise<void> {
+    const hid = requireHouseholdId();
+    await run(
+      `INSERT INTO budgets (user_id, household_id, category_id, month, allocated_amount, carried_in_minor)
+       VALUES (?, ?, ?, ?, 0, ?)
+       ON CONFLICT (household_id, category_id, month, user_id)
+       DO UPDATE SET carried_in_minor = excluded.carried_in_minor, updated_at = NOW()`,
+      [userId, hid, categoryId, month, amount]
+    );
+  }
+
+  async getMonthOpenState(month: string, userId: number) {
+    const hid = requireHouseholdId();
+    const rows = await all<{ month: string; overspend_carried_minor: number; opened_at: string }>(
+      "SELECT month, overspend_carried_minor, opened_at FROM budget_month_opens WHERE month = ? AND user_id = ? AND household_id = ?",
+      [month, userId, hid]
+    );
+    const r = rows[0];
+    return r ? { month: r.month, overspendCarriedMinor: r.overspend_carried_minor, openedAt: r.opened_at } : null;
+  }
+
+  async recordMonthOpen(month: string, userId: number, overspendCarriedMinor: number): Promise<void> {
+    const hid = requireHouseholdId();
+    await run(
+      `INSERT INTO budget_month_opens (household_id, user_id, month, overspend_carried_minor)
+       VALUES (?, ?, ?, ?)
+       ON CONFLICT (household_id, user_id, month) DO NOTHING`,
+      [hid, userId, month, overspendCarriedMinor]
+    );
+  }
```

### Callers to update in the same commit

| File | Change |
|---|---|
| `src/app/(app)/budget/page.tsx` | `overview.unallocated` → `unassigned`; pass `envelopeLeft` |
| `src/app/(app)/dashboard/page.tsx` | hero reads `envelopeLeft`, not `balance` |
| `src/lib/services/summary.service.ts` | `allocated` → `assigned` in adherence rows |
| `src/components/budget/unallocated-banner.tsx` | copy: "still needs a job" → "Not given a job yet" |
| `src/lib/services/budget-ai-report.service.ts` | the prompt states the old rollover rule — rewrite it or the AI will explain behaviour that no longer exists |
| `docs/database.md`, `README.md` | both document the old rollover |

---

## Phase 3 — Participants

### `src/lib/services/finance/participants.ts` (new, pure)

```ts
import { formatRand } from "@/lib/utils/currency";
import { splitExpense } from "./accounts";

export interface ParticipantShare {
  userId: number;
  shareMinor: number;
}

/**
 * Divides `amountMinor` equally among `userIds`, giving the remainder cents to
 * the earliest ids so the result is deterministic and always sums exactly.
 */
export function divideEqually(amountMinor: number, userIds: number[]): Record<number, number> {
  if (userIds.length === 0) return {};
  const keyed = splitExpense({ amount: amountMinor, users: userIds.map(String) });
  const out: Record<number, number> = {};
  for (const id of userIds) out[id] = keyed[String(id)] ?? 0;
  return out;
}

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateParticipantShares(
  amountMinor: number,
  participants: ParticipantShare[],
  payerUserId?: number
): ValidationResult {
  if (participants.length === 0) {
    return { ok: false, error: "Pick at least one person" };
  }
  const ids = new Set(participants.map((p) => p.userId));
  if (ids.size !== participants.length) {
    return { ok: false, error: "Someone is listed twice" };
  }
  if (payerUserId != null && !ids.has(payerUserId)) {
    return { ok: false, error: "The payer must be one of the participants" };
  }
  if (participants.some((p) => p.shareMinor < 0)) {
    return { ok: false, error: "A share cannot be negative" };
  }
  const sum = participants.reduce((s, p) => s + p.shareMinor, 0);
  if (sum !== amountMinor) {
    return { ok: false, error: `Shares add up to ${formatRand(sum)}, not ${formatRand(amountMinor)}` };
  }
  return { ok: true };
}

/**
 * Rebalances after the user nudges one share: the nudged share is honoured and
 * the rest absorb the difference equally, so the total stays pinned.
 */
export function rebalanceAround(
  amountMinor: number,
  participants: ParticipantShare[],
  pinnedUserId: number,
  pinnedShareMinor: number
): ParticipantShare[] {
  const others = participants.filter((p) => p.userId !== pinnedUserId);
  if (others.length === 0) return [{ userId: pinnedUserId, shareMinor: amountMinor }];
  const clamped = Math.max(0, Math.min(amountMinor, pinnedShareMinor));
  const rest = divideEqually(amountMinor - clamped, others.map((o) => o.userId));
  return [
    { userId: pinnedUserId, shareMinor: clamped },
    ...others.map((o) => ({ userId: o.userId, shareMinor: rest[o.userId] ?? 0 })),
  ];
}
```

### `src/lib/services/expense.service.ts`

```diff
 export interface ExpensesByMonthResult {
   expenses: ExpenseWithDetails[];
   totals: {
     overall: number;
     byUser: Record<number, number>;
     byCategory: Record<number, number>;
   };
 }
```

`getByMonth` must total **the viewer's own share**, not the full amount, or
every category total on a split expense is double-counted. This is the change
that makes the reconciliation test pass.

```diff
   async getByMonth(month: string, userId?: number, accountId?: number): Promise<ExpensesByMonthResult> {
     const period = userId != null ? await getBudgetPeriodForUserMonth(month, userId) : undefined;
     const expenses = await this.repo.findByMonth(month, userId, accountId, period);
+    const shares = userId != null
+      ? await this.participantRepo.getSharesForExpenses(expenses.map((e) => e.id), userId)
+      : new Map<number, number>();
     const totals = {
       overall: 0,
       byUser: {} as Record<number, number>,
       byCategory: {} as Record<number, number>,
     };
     for (const e of expenses) {
-      totals.overall += e.amount;
-      totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + e.amount;
-      totals.byCategory[e.categoryId] = (totals.byCategory[e.categoryId] ?? 0) + e.amount;
+      // For a viewer, the number that matters is their own share. Falls back to
+      // the full amount for pre-backfill rows and for household-wide queries.
+      const mine = shares.get(e.id) ?? e.amount;
+      e.myShare = mine;
+      totals.overall += mine;
+      totals.byUser[e.userId] = (totals.byUser[e.userId] ?? 0) + mine;
+      totals.byCategory[e.categoryId] = (totals.byCategory[e.categoryId] ?? 0) + mine;
     }
     return { expenses, totals };
   }
```

`create` gains participants:

```diff
   async create(
     userId: number,
-    data: Omit<CreateExpenseInput, "userId" | "month">
+    data: Omit<CreateExpenseInput, "userId" | "month"> & { participants?: ParticipantShare[] }
   ): Promise<{ id: number }> {
     const month = await budgetMonthKeyForUser(userId, data.date);
+    const participants = data.participants?.length
+      ? data.participants
+      : [{ userId, shareMinor: data.amount }];
+    const valid = validateParticipantShares(data.amount, participants, userId);
+    if (!valid.ok) throw new Error(valid.error);
+
     const { id } = await this.repo.create({
       userId,
       categoryId: data.categoryId,
       amount: data.amount,
       note: data.note,
       date: data.date,
       month,
       accountId: data.accountId ?? null,
+      paidByUserId: userId,
+      splitGroupId: participants.length > 1 ? crypto.randomUUID() : null,
     });
+
+    await this.participantRepo.createMany(id, participants);
+
+    // Every non-payer share is a debt. split_allocations stays the debt ledger.
+    for (const p of participants) {
+      if (p.userId === userId || p.shareMinor <= 0) continue;
+      await this.allocationRepo.create(id, p.userId, p.shareMinor);
+    }
+
     if (data.accountId != null) {
       await this.accountTxRepo.create({
         accountId: data.accountId,
+        // The full amount left the account, even though only `mine` hit the envelope.
         amount: -data.amount,
         transactionType: "expense",
         referenceType: "expense",
         referenceId: id,
       });
     }
     return { id };
   }
```

That asymmetry — full amount to the account, own share to the envelope — is
exactly why Home needs the cash-behind-envelopes row, and why the two numbers
are allowed to disagree.

Constructor:

```diff
   constructor(
     private repo = getExpenseRepository(),
-    private accountTxRepo = getAccountTransactionRepository()
+    private accountTxRepo = getAccountTransactionRepository(),
+    private participantRepo = getExpenseParticipantRepository(),
+    private allocationRepo = getSplitAllocationRepository()
   ) {}
```

### `src/lib/types.ts`

```diff
 export interface ExpenseWithDetails {
   id: number;
   ...
+  /** The viewer's own share. Equals `amount` when unsplit. */
+  myShare?: number;
 }
```

### `src/lib/repositories/interfaces/expense-participant.repository.ts` (new)

```ts
import type { ParticipantShare } from "@/lib/services/finance/participants";

export interface ExpenseParticipantRow extends ParticipantShare {
  id: number;
  expenseId: number;
  userName: string;
}

export interface IExpenseParticipantRepository {
  createMany(expenseId: number, participants: ParticipantShare[]): Promise<void>;
  replaceForExpense(expenseId: number, participants: ParticipantShare[]): Promise<void>;
  findByExpenseId(expenseId: number): Promise<ExpenseParticipantRow[]>;
  /** expenseId → that user's share. Only ids the user participates in. */
  getSharesForExpenses(expenseIds: number[], userId: number): Promise<Map<number, number>>;
  deleteByExpenseId(expenseId: number): Promise<void>;
}
```

### `src/lib/repositories/sql/expense-participant.repository.ts` (new)

```ts
import { all, run } from "@/lib/db";
import { requireHouseholdId } from "@/lib/db/request-context";
import type {
  IExpenseParticipantRepository,
  ExpenseParticipantRow,
} from "../interfaces/expense-participant.repository";
import type { ParticipantShare } from "@/lib/services/finance/participants";

export class ExpenseParticipantRepository implements IExpenseParticipantRepository {
  async createMany(expenseId: number, participants: ParticipantShare[]): Promise<void> {
    if (participants.length === 0) return;
    const hid = requireHouseholdId();
    const values = participants.map(() => "(?, ?, ?, ?)").join(",");
    const params = participants.flatMap((p) => [hid, expenseId, p.userId, p.shareMinor]);
    await run(
      `INSERT INTO expense_participants (household_id, expense_id, user_id, share_minor)
       VALUES ${values}
       ON CONFLICT (expense_id, user_id) DO UPDATE SET share_minor = excluded.share_minor`,
      params
    );
  }

  async replaceForExpense(expenseId: number, participants: ParticipantShare[]): Promise<void> {
    await this.deleteByExpenseId(expenseId);
    await this.createMany(expenseId, participants);
  }

  async findByExpenseId(expenseId: number): Promise<ExpenseParticipantRow[]> {
    const hid = requireHouseholdId();
    const rows = await all<{ id: number; expense_id: number; user_id: number; share_minor: number; name: string }>(
      `SELECT p.id, p.expense_id, p.user_id, p.share_minor, u.name
       FROM expense_participants p JOIN users u ON u.id = p.user_id
       WHERE p.expense_id = ? AND p.household_id = ? ORDER BY p.user_id`,
      [expenseId, hid]
    );
    return rows.map((r) => ({
      id: r.id, expenseId: r.expense_id, userId: r.user_id,
      shareMinor: r.share_minor, userName: r.name,
    }));
  }

  async getSharesForExpenses(expenseIds: number[], userId: number): Promise<Map<number, number>> {
    if (expenseIds.length === 0) return new Map();
    const hid = requireHouseholdId();
    const placeholders = expenseIds.map(() => "?").join(",");
    const rows = await all<{ expense_id: number; share_minor: number }>(
      `SELECT expense_id, share_minor FROM expense_participants
       WHERE household_id = ? AND user_id = ? AND expense_id IN (${placeholders})`,
      [hid, userId, ...expenseIds]
    );
    return new Map(rows.map((r) => [r.expense_id, r.share_minor]));
  }

  async deleteByExpenseId(expenseId: number): Promise<void> {
    const hid = requireHouseholdId();
    await run("DELETE FROM expense_participants WHERE expense_id = ? AND household_id = ?", [expenseId, hid]);
  }
}
```

Register in `src/lib/repositories/index.ts` following the existing pattern:

```diff
+import { ExpenseParticipantRepository } from "./sql/expense-participant.repository";
+
+let expenseParticipantRepo: ExpenseParticipantRepository | null = null;
+export function getExpenseParticipantRepository() {
+  return (expenseParticipantRepo ??= new ExpenseParticipantRepository());
+}
```

### `src/lib/services/split.service.ts`

`createSplit` is superseded by `ExpenseService.create` with participants. Keep
the file for balances, settlement and history; delete the creation path.

```diff
-  async createSplit(
-    paidByUserId: number,
-    totalAmountCents: number,
-    ...
-  ): Promise<{ id: number }> {
-    const otherUsers = await this.userRepo.findAllExcept(paidByUserId);
-    if (otherUsers.length === 0) {
-      throw new Error("No other user to split with.");
-    }
-    const otherUser = otherUsers[0];
-    ...
-  }
+  // createSplit removed. Creating a shared expense is
+  // ExpenseService.create(userId, { ..., participants }) — one path for solo
+  // and shared spends, and it works for any number of people.
```

`getStatementSinceLastSettlement` keeps its signature (it is already
two-user-scoped and correct — it takes an explicit `otherUserId`). Add the
per-person list the new Splits screen needs:

```ts
  /** One row per other household member, netted, for the Splits screen. */
  async getBalances(currentUserId: number, groupId?: number): Promise<Array<{
    userId: number;
    userName: string;
    owedToMe: number;
    iOwe: number;
    net: number;
    itemCount: number;
    lastSettledDate: string | null;
  }>> {
    const balance = await this.getBalance(currentUserId, groupId);
    const members = await this.userRepo.findAllExcept(currentUserId);
    return Promise.all(
      members.map(async (m) => {
        const row = balance.perUser.find((u) => u.userId === m.id);
        const last = await this.settlementRepo.findLatestBetween(currentUserId, m.id, groupId);
        const statement = await this.getStatementSinceLastSettlement(
          currentUserId, m.id, new Date().toISOString().slice(0, 10), groupId
        );
        return {
          userId: m.id,
          userName: m.name,
          owedToMe: row?.owedToMe ?? 0,
          iOwe: row?.iOwe ?? 0,
          net: (row?.owedToMe ?? 0) - (row?.iOwe ?? 0),
          itemCount: statement.owedItems.length + statement.owingItems.length,
          lastSettledDate: last?.date ?? null,
        };
      })
    );
  }
```

`recordSettlementForExpense` — replace `otherUsers[0]` with an explicit
recipient:

```diff
   async recordSettlementForExpense(
     expenseId: number,
     payerUserId: number,
     amountCents: number,
     date: string,
     payerUserName: string,
-    recipientUserName: string
+    recipientUserName: string,
+    recipientUserId: number
   ): Promise<void> {
-    const otherUsers = await this.userRepo.findAllExcept(payerUserId);
-    if (otherUsers.length === 0) {
-      throw new Error("No other user to settle with.");
-    }
-    const recipientUserId = otherUsers[0].id;
     const incomeMonth = await budgetMonthKeyForUser(recipientUserId, date);
```

`settle` gains the target category, per the design decision:

```diff
   async settle(
     payerUserId: number,
     recipientUserId: number,
     amountCents: number,
     date: string,
     payerUserName: string,
     recipientUserName: string,
-    groupId: number
+    groupId: number,
+    /** Category the recipient's money lands in. Defaults to their most overspent. */
+    targetCategoryId?: number
   ): Promise<void> {
```

and the recipient's income row becomes an assignment into that category:

```diff
     const { id: expenseId } = await this.expenseRepo.create({
       userId: payerUserId,
       categoryId: splitsCategory.id,
       ...
     });
+    // The repayment reduces the recipient's spend in the chosen category rather
+    // than arriving as unassigned income, so it clears the overspend it repairs.
+    if (targetCategoryId != null) {
+      await this.expenseRepo.create({
+        userId: recipientUserId,
+        categoryId: targetCategoryId,
+        amount: -amountCents,
+        note: `Repaid by ${payerUserName}`,
+        date,
+        month: incomeMonth,
+      });
+    }
```

> A negative expense is the honest representation: the recipient's category
> spend genuinely goes down. Check `findByMonth` and the pace bar handle a
> negative row — the reconciliation test covers it.

### `src/lib/actions/expense.actions.ts`

```diff
   const isSplitsSettlement = category.name === "Splits";
   if (isSplitsSettlement) {
     const splitService = new SplitService();
     const balance = await splitService.getBalance(userId);
-    const otherUsers = await userRepo.findAllExcept(userId);
-    if (otherUsers.length === 0) {
-      return { success: false, error: "No other user to settle with." };
-    }
-    const recipient = otherUsers[0];
-    const perUser = balance.perUser.find((u) => u.userId === recipient.id);
-    const iOwe = perUser?.iOwe ?? 0;
+    // Who am I settling with? Explicit when given; otherwise the only person I
+    // owe. Ambiguity is an error, not a guess — `others[0]` silently paid the
+    // wrong housemate in a household of three.
+    const owed = balance.perUser.filter((u) => u.iOwe > 0);
+    const recipientId = formData.settleWithUserId
+      ?? (owed.length === 1 ? owed[0].userId : null);
+    if (recipientId == null) {
+      return owed.length === 0
+        ? { success: false, error: "You do not owe anything to settle." }
+        : { success: false, error: "Choose who you are settling with." };
+    }
+    const recipient = await userRepo.findById(recipientId);
+    if (!recipient) return { success: false, error: "Person not found." };
+    const iOwe = balance.perUser.find((u) => u.userId === recipientId)?.iOwe ?? 0;
     if (iOwe <= 0) {
       return { success: false, error: "You do not owe anything to settle." };
     }
```

and the call:

```diff
       await splitService.recordSettlementForExpense(
         id, userId, parsed.data.amount, parsed.data.date,
-        payer.name, recipient.name
+        payer.name, recipient.name, recipient.id
       );
```

New action for the Add sheet:

```ts
export async function addExpenseWithParticipants(formData: {
  categoryId: number;
  amount: number;
  note?: string | null;
  date: string;
  accountId?: number;
  participants: { userId: number; shareMinor: number }[];
}): Promise<ExpenseActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  setRequestContextFromSession(session);
  const userId = Number(session.user.id);

  const parsed = createExpenseWithParticipantsSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.message };

  const valid = validateParticipantShares(parsed.data.amount, parsed.data.participants, userId);
  if (!valid.ok) return { success: false, error: valid.error };

  const members = await getUserRepository().findAll();
  const memberIds = new Set(members.map((m) => m.id));
  if (parsed.data.participants.some((p) => !memberIds.has(p.userId))) {
    return { success: false, error: "Someone is not in this household." };
  }

  const service = new ExpenseService();
  const { id } = await service.create(userId, parsed.data);

  const myShare = parsed.data.participants.find((p) => p.userId === userId)!.shareMinor;
  const overview = await new BudgetService().getOverview(
    await budgetMonthKeyForUser(userId, parsed.data.date), userId
  );
  const row = overview.categories.find((c) => c.categoryId === parsed.data.categoryId);

  for (const path of ["/dashboard", "/expenses", "/budget", "/splits", "/what-i-owe"]) {
    revalidatePath(path);
  }

  return {
    success: true,
    id,
    myShare,
    budgetRemaining: row?.available,
    categoryName: row?.categoryName,
    isOverspent: (row?.available ?? 0) < 0,
  };
}
```

### `src/lib/validators/expense.schema.ts`

```ts
export const participantShareSchema = z.object({
  userId: z.number().int().positive(),
  shareMinor: z.number().int().min(0),
});

export const createExpenseWithParticipantsSchema = createExpenseSchema.extend({
  participants: z.array(participantShareSchema).min(1).max(20),
});
```

### Remaining `others[0]` / `otherUserName` sites

| File | Change |
|---|---|
| `src/app/(app)/what-i-owe/page.tsx` | `const them = others[0]` → render a person tab per member; `searchParams.with` selects. Single-member households render exactly as now. |
| `src/app/(app)/add/page.tsx` | drop `otherUserName`; pass `members` |
| `src/app/(app)/dashboard/page.tsx` | same |
| `src/app/(app)/budget/page.tsx` | same |
| `src/lib/actions/split.actions.ts` | `settleUp` takes `recipientUserId` + `targetCategoryId`, both required |
| `src/components/expenses/quick-add-form.tsx` | keep until Phase 4 deletes its UI; point its submit at the new action |

Grep gate for the commit — must return nothing:

```bash
grep -rn "findAllExcept(.*)\[0\]\|others\[0\]\|otherUsers\[0\]" src/
```

---

## Phase 4 — The Add sheet

New `src/components/add/add-sheet.tsx`. Keeps `quick-add-form.tsx`'s actions;
only the surface changes.

State and the one piece of arithmetic that matters:

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { divideEqually, rebalanceAround } from "@/lib/services/finance/participants";
import { addExpenseWithParticipants } from "@/lib/actions/expense.actions";
import { formatRand } from "@/lib/utils/currency";

interface Member { id: number; name: string }
interface CategoryOption { id: number; name: string; available: number; groupName: string }

export function AddSheet({
  me, members, categories, accounts, defaultAccountId, onClose,
}: {
  me: Member;
  members: Member[];
  categories: CategoryOption[];
  accounts: { id: number; name: string }[];
  defaultAccountId?: number;
  onClose: () => void;
}) {
  const [entry, setEntry] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [pickedIds, setPickedIds] = useState<number[]>([me.id]);   // "just me" default
  const [pinned, setPinned] = useState<{ userId: number; shareMinor: number } | null>(null);
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const amountMinor = useMemo(() => {
    const n = Number(entry.replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  }, [entry]);

  const participants = useMemo(() => {
    const even = divideEqually(amountMinor, pickedIds);
    const base = pickedIds.map((id) => ({ userId: id, shareMinor: even[id] ?? 0 }));
    return pinned && pickedIds.includes(pinned.userId)
      ? rebalanceAround(amountMinor, base, pinned.userId, pinned.shareMinor)
      : base;
  }, [amountMinor, pickedIds, pinned]);

  const myShare = participants.find((p) => p.userId === me.id)?.shareMinor ?? 0;
  const category = categories.find((c) => c.id === categoryId) ?? null;

  // The consequence panel. This is the whole point of the sheet: the budget
  // effect is visible before the save, not in a toast afterwards.
  const consequence = useMemo(() => {
    if (!category) return { tone: "neutral" as const, title: "Pick a category", body: "Each pill shows what's left in it." };
    if (amountMinor <= 0) return {
      tone: "neutral" as const,
      title: "Type an amount",
      body: `${category.name} has ${formatRand(category.available)} ${category.available < 0 ? "over already" : "left"}.`,
    };
    const after = category.available - myShare;
    const whose = pickedIds.length > 1 ? `Your ${formatRand(myShare)}` : `The full ${formatRand(amountMinor)}`;
    const others = participants.filter((p) => p.userId !== me.id);
    const owed = others.reduce((s, p) => s + p.shareMinor, 0);
    const tail = others.length ? ` ${othersLabel(others, members)} owe you ${formatRand(owed)}.` : "";
    return after < 0
      ? { tone: "bad" as const, title: `${whose} comes off ${category.name}`, body: `It goes ${formatRand(after)} over.${tail}` }
      : { tone: "good" as const, title: `${whose} comes off ${category.name}`, body: `${category.name} will have ${formatRand(after)} left.${tail}` };
  }, [category, amountMinor, myShare, participants, pickedIds.length, me.id, members]);

  const canSave = amountMinor > 0 && categoryId != null && !pending;

  function togglePerson(id: number) {
    if (id === me.id) return;                 // you are always in on your own spend
    setPinned(null);                           // re-even the split when the set changes
    setPickedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function save() {
    if (!canSave) return;
    startTransition(async () => {
      const res = await addExpenseWithParticipants({
        categoryId: categoryId!, amount: amountMinor, date,
        note: note || null, accountId, participants,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success(
        `Saved ${formatRand(res.myShare!)} to ${res.categoryName}. ` +
        (res.isOverspent
          ? `It's now ${formatRand(res.budgetRemaining!)} over.`
          : `${formatRand(res.budgetRemaining!)} left.`),
        { action: { label: "Undo", onClick: () => deleteExpense(res.id!) } }
      );
      onClose();
    });
  }
  ...
}
```

Notes that matter for the implementer:

- **Keypad, not `<input type="number">`.** An `inputMode="decimal"` input on iOS
  still shows a full keyboard and the sheet loses half its height to it. Render
  buttons; keep a hidden input for accessibility.
- **The remainder cent is visible.** With three people on R100, someone pays 34c.
  Show the per-person figures rather than "R33,33 each" — the design's share
  bars exist for that reason.
- **`pinned` resets whenever the participant set changes.** Otherwise nudging
  then adding a person produces a split nobody chose.
- **44px minimum on every avatar and key.** Both are primary hit targets.
- Route change: `src/app/(app)/add/page.tsx` keeps task/event only; the bottom
  bar's centre button opens the sheet. Long-press on it opens the old hub.

Files deleted in this phase: none. `quick-add-form.tsx` keeps its exported
actions and its UI is unmounted — a revert is a UI-only revert.

---

## Phases 5–15 — condensed

The pattern is established above; these follow it.

### Phase 5 — Home

```
src/components/dashboard/envelope-hero.tsx       new
src/components/dashboard/needs-you-list.tsx      new
src/components/dashboard/needs-you-row.tsx       new  (one row type, compact 4c)
src/components/dashboard/category-remaining.tsx  new
src/components/dashboard/breakdown-sheet.tsx     new
```

`needs-you-list.tsx` builds one array from every source and sorts once:

```ts
type NeedsYouItem = {
  key: string;
  kind: "overspend" | "unassigned" | "owed" | "event" | "task" | "account" | "goal";
  priority: number;      // lower first
  icon: string; tone: "bad" | "warn" | "neutral";
  title: string; body: string;
  action: { label: string; href: string };
};

// Priority: overspend 10, unassigned 20, event today 30, owed 40,
// task 50, unchecked account 60, goal behind 70.
```

Delete once the rows exist: `home-stats-strip.tsx`,
`budget-warning-tile.tsx`, `split-balance-banner.tsx`,
`today-calendar-tile.tsx`, `dashboard-income-section.tsx`. Keep
`when-dashboard-tile-enabled.tsx` — it now gates row kinds, so the Settings
toggles keep working with no schema change.

### Phase 6 — Budget

- `budget-overview.tsx`: drop the donut and the four-stat grid; keep unassigned
  as the headline plus a three-figure line.
- Delete `budget-donut-chart.tsx`, `budget-category-summary-tile.tsx`. **Grep
  first** — the latter is imported from more than the budget page.
- `budget-category-card.tsx` → read-only row; new `budget-category-sheet.tsx`
  holds the keypad, quick-add chips (`+R100`, `Match last month`, `Empty it
  out`), the rollover explainer and the category's transactions.
- New `src/app/(app)/new-month/page.tsx`. Gate in the app shell:

```ts
const pending = await new BudgetService().needsMonthOpen(userId);
if (pending && !pathname.startsWith("/new-month")) redirect("/new-month");
```

  Skipping calls `openMonth` anyway, so nothing breaks if it is ignored.

### Phase 7 — Splits

`splits-page-client.tsx` reads `SplitService.getBalances(userId)` — one card per
member. Groups become a `<select>` filter. New `settle-sheet.tsx` with the
category picker, defaulting to `overview.categories` sorted by most negative
`available`.

### Phase 8 — Accounts

- `account-create-fields.tsx`: `is_shared` switch, with the consequence in words.
- `balance-check-sheet.tsx` → new action `reconcileAccount(accountId, statedBalanceMinor)`:

```ts
const diff = statedBalanceMinor - account.balance;
if (diff === 0) return { success: true, adjusted: 0 };
const unaccounted = await categoryRepo.findOrCreate("Unaccounted", { system: true });
await expenseService.create(userId, {
  categoryId: unaccounted.id,
  amount: -diff,               // negative diff = money missing = a spend
  date: today,
  accountId,
  note: "Balance check",
});
```

- Transactions: drop the my/theirs/combined toggle. `findByMonth` gains
  `OR (a.is_shared AND e.household_id = ?)` so shared-account rows appear for
  both. `/income` → `redirect("/expenses?type=income")`.

### Phase 9 — Reports

`src/lib/services/report.service.ts`, all pure arithmetic over the ledger:

```ts
monthlyInOut(userId, from, to): Array<{ month, incomeMinor, spentMinor }>
categoryTotals(userId, from, to): Array<{ categoryId, name, totalMinor, share }>
budgetAccuracy(userId, from, to): Array<{ categoryId, name, assignedMinor, spentMinor, deltaMinor }>
mortgageInterestVsEquity(userId): Array<{ month, interestMinor, equityMinor }>
```

`from` defaults to the earliest transaction date. `/summary` →
`redirect("/reports")`; retire `monthly-snapshot.tsx`. Every figure must equal
the same sum computed from the raw ledger — that is the Phase 0 report test.

### Phase 10 — Mortgage

`src/lib/services/finance/mortgage-plan.ts`, pure:

```ts
export function solveShares(input: {
  price: number; paymentMinor: number; termMonths: number; annualRateBp: number;
  deposits: Array<{ userId: number; amountMinor: number }>;
  targets: Array<{ userId: number; shareBp: number }>;
}): {
  reachable: boolean;
  shares: Array<{ userId: number; monthlyMinor: number; projectedShareBp: number }>;
  closest?: Array<{ userId: number; shareBp: number }>;
  blockers: string[];     // e.g. "A 99% share needs R31 400/month, not R21 400"
};
```

Method: amortise the bond once to get total principal repaid over the term; each
person's end equity is `deposit + their share of principal`. Solve the linear
system for monthly shares that hit the target, then check every share is
between 0 and the total payment. Out of range → `reachable: false`, and return
the closest split plus a plain-language blocker. Never clamp silently.

`mortgage-story.ts`:

```ts
export type StoryCase = "equal-no-deposit" | "equal-with-deposit" | "unequal-to-target";

export function pickCase(deposits, shares): StoryCase;
export function buildStory(input): Array<{ title: string; body: string }>;
```

Three templates, chosen deterministically — no AI. A generated explanation of
someone's home equity that varies between reads, can't be tested, and might
hallucinate a number is the wrong tool for this screen. The templates take the
same inputs and are unit-testable.

`mortgage-summary-card.tsx` becomes the "what I own" view: share of what's paid
for so far, the three-part equity bar, this month's interest versus equity.
Amortisation, rate periods and extra payments stay behind More details.

### Phase 11 — Recon

- `recon-import-item.repository.ts`: add `matchRules(items, userId)`.
- `recon-page-client.tsx`: rule-matched group with one Accept-all; unmatched
  under "Need a decision".
- Row sheet reuses `AddSheet`'s category pills and participant avatars, plus a
  "Do this every time" checkbox writing a `recon_rules` row.
- Accepting goes through `ExpenseService.create` with participants — same path
  as manual entry, so participants and rollover behave identically.

### Phase 12 — Lists and Calendar

- `list-detail.tsx`: "Done shopping?" card once anything is ticked; opens
  `AddSheet` with `categoryId` from `shared_lists.category_id` and
  `pickedIds` from the list's members, and clears ticked items on save.
- Calendar: initials instead of dots, person filter, day view under the grid,
  `expected_cost_minor` with "Log it" writing `logged_expense_id`.

### Phase 13 — Tokens

`src/app/globals.css`, both blocks:

```css
:root {
  --success: #047857;  --success-foreground: #f8fbff;  --success-surface: #e7f7f0;
  --warning: #92400e;  --warning-surface: #fffaf0;     --emphasis: #0f1520;
}
.dark {
  --success: #34d399;  --success-foreground: #0f1520;  --success-surface: #12251f;
  --warning: #fbbf24;  --warning-surface: #241f14;     --emphasis: #e8edf5;
}
```

Then replace the ad-hoc greens and hard-coded `#0f1520` emphasis buttons. Land
this **before** Phases 4–12 are called done, or every screen gets touched twice.

### Phase 14 — Onboarding

- Invite becomes step 1; `onboarding-flow.tsx` grows to six steps.
- `budgetMonthKeyForUser` reads the household, not the user:

```diff
-  const start = await getUserRepository().getBudgetMonthStartDay(userId);
+  const start = await getHouseholdRepository().getBudgetMonthStartDay();
```

  Three call sites in that file; `getUserRepository().getBudgetMonthStartDay`
  stays for one release so nothing breaks mid-deploy.
- Show the notice once where `budget_month_notice_pending` is true.

### Phase 15 — The unglamorous states

`/pending-approval` copy; `EmptyState` on every list, category list, report and
the Recon inbox; a queued-write indicator; failed-split rollback (it touches two
balances — roll back both or neither); and a decision on money notifications.

---

## Commit sequence

```
1  test: reconciliation, rollover, participant and solver suites
2  fix(db): budgets unique constraint includes user_id
3  feat(db): participants, rollover, sharing, income types, mortgage plan, recon rules
4  feat(budget): per-category available, openMonth, coverOverspend
5  feat(expenses): participants; own share hits own envelope
6  feat(add): keypad sheet with participants and live consequence
7  feat(home): envelope hero and one needs-you stream
8  feat(budget): read-only rows, category sheet, new-month screen
9  feat(splits): per-person balances and settle-into-category
10 feat(accounts): sharing and the balance check
11 feat(reports): replaces summary
12 feat(mortgage): plan solver and templated story
13 feat(recon): rules and grouped accept
14 feat(lists,calendar): log-the-shop and event costs
15 feat(theme): success/warning/emphasis tokens
16 feat(onboarding): invite first, household budget month
17 feat(states): empty, offline, approval, failure
```

Commits 1–5 are one PR. Everything after is independently shippable.
