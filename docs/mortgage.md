# Mortgage

## Interest rate changes

HomeFinance supports **scheduled interest rate changes** during the loan (typical for variable / prime-linked mortgages in South Africa).

### Data model

- **`mortgage_configs.annual_interest_rate`** — starting rate from loan setup (applies from loan month 1 unless overridden).
- **`mortgage_rate_periods`** — optional rows: `effective_from_month` + `annual_interest_rate`. From that loan month onward, the new rate applies until the next period.

Loan months are numbered from `start_date` (month 1 = first payment month).

### Calculation behaviour

1. **Interest on actual payments** — `allocateMonthPrincipalInterest()` uses the rate effective for that calendar month (after prior principal reduces the balance).
2. **Projected schedule** — `simulateSchedule()` / `projectScheduleFromBalance()` recalculate the **minimum monthly payment** whenever the effective rate changes, using:
   - opening balance for that month
   - remaining original term (`loan_term_months - month + 1`)
   - new monthly rate
3. **Summary card** — shows the **next** payment’s minimum, rate %, and per-user split (including top-up for equity convergence).

### UI

On `/mortgage`, open **Interest rate changes** to add rows such as “from loan month 6 → 11%”. Saving recalculates the projected schedule and upcoming payment amounts.

### "Owed to me" page

`/owed-to-me` is a statement for the signed-in user, gated by `users.owed_to_me_enabled`
(Settings: **Show Owed to me**). Default is off; `0028` turns it on for `users.id = 1` only.

Toggle **Owed to me** / **What I owe** (`?view=owing`). Split costs are allocations since the
**day after** the latest settlement between the two users (all history if they have never
settled). The last settlement is the cutoff, so settlement amounts are not subtracted again.
Line items sit in an accordion under **Total split costs**. **Total mortgage amount** is the
selected budget month’s share for the person in view (their share when “owed to me”, yours
when “what I owe”), from `getSchedule()` (`userA` / `userB` by `base_split_pct`, falling back
to `monthlyPaymentUserA` / `monthlyPaymentUserB`). Budget-month key vs schedule `yyyy-MM` is
an approximation. **Total** is splits + mortgage. Month navigator only changes the mortgage
month.

### Related

- Unit tests: `src/tests/mortgage-rate-periods.test.ts`, `src/tests/transaction-drift.test.ts`
- Integration: `src/__tests__/integration/mortgage-interest-recalc.integration.test.ts`
- Migration: `drizzle/0026_mortgage_rate_periods_pg.sql`
