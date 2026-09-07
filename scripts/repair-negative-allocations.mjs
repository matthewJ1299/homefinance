/**
 * One-off repair for allocations driven negative by the old `transfer()`.
 *
 * Before the transfer fix, moving money out of a category funded by carry-in
 * wrote `assigned - amount` and stored a negative `allocated_amount`. That
 * lowered `totalAssigned`, which raised `unassigned` by the same amount --
 * money appearing from nothing -- and broke the per-category invariant against
 * the ledger.
 *
 * The fix stops new rows going negative; it does not repair rows already
 * written. This does: each negative allocation is zeroed and the difference
 * moved back into `carried_in_minor`, which is where the money actually came
 * from. `envelopeTotal` (assigned + carriedIn) is unchanged by the repair, so
 * no envelope gains or loses.
 *
 * Dry run first -- it writes nothing without --apply:
 *
 *   DATABASE_URL="postgres://..." node scripts/repair-negative-allocations.mjs
 *   DATABASE_URL="postgres://..." node scripts/repair-negative-allocations.mjs --apply
 *
 * Exit code 0 means nothing to do or the repair succeeded.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to the database you intend to repair.");
  process.exit(2);
}
const apply = process.argv.includes("--apply");

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const { rows } = await client.query(
    `SELECT b.id, b.household_id, b.user_id, b.month, b.category_id,
            b.allocated_amount, b.carried_in_minor, c.name AS category_name
       FROM budgets b
       LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.allocated_amount < 0
      ORDER BY b.month, b.household_id, b.user_id`
  );

  if (rows.length === 0) {
    console.log("No negative allocations. Nothing to repair.");
    process.exit(0);
  }

  const rand = (minor) => `R${(minor / 100).toFixed(2)}`;
  console.log(`${rows.length} negative allocation${rows.length === 1 ? "" : "s"}:\n`);
  for (const r of rows) {
    // The shortfall comes out of carry-in, which is where the transfer should
    // have taken it. Carry-in can end up short if it was spent since; floor at
    // zero rather than writing a negative in the other column.
    const shortfall = -r.allocated_amount;
    const newCarry = Math.max(0, r.carried_in_minor - shortfall);
    const unrecovered = shortfall - (r.carried_in_minor - newCarry);
    console.log(
      `  ${r.month}  user ${r.user_id}  ${r.category_name ?? `category ${r.category_id}`}: ` +
        `assigned ${rand(r.allocated_amount)} -> R0.00, ` +
        `carried ${rand(r.carried_in_minor)} -> ${rand(newCarry)}` +
        (unrecovered > 0 ? `  (${rand(unrecovered)} could not come off carry-in)` : "")
    );
  }

  if (!apply) {
    console.log("\nDry run. Re-run with --apply to write these changes.");
    process.exit(0);
  }

  await client.query("BEGIN");
  const updated = await client.query(
    `UPDATE budgets
        SET carried_in_minor = GREATEST(0, carried_in_minor + allocated_amount),
            allocated_amount = 0,
            updated_at = NOW()
      WHERE allocated_amount < 0`
  );
  await client.query("COMMIT");
  console.log(`\nRepaired ${updated.rowCount} row${updated.rowCount === 1 ? "" : "s"}.`);
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Repair failed, nothing was written:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
