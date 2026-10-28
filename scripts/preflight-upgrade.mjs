/**
 * Read-only pre-flight for upgrading a pre-household database.
 *
 * Answers one question against YOUR data rather than a seed: will `db:push`
 * complete, and will anything be lost or merged on the way? It writes nothing
 * and opens no transaction, so it is safe to point at production.
 *
 *   DATABASE_URL="postgres://..." node scripts/preflight-upgrade.mjs
 *
 * Exit code 0 means clear to upgrade; 1 means at least one blocker. See
 * docs/upgrading-existing-data.md for what each finding means.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL to the database you intend to upgrade.");
  process.exit(2);
}

const client = new pg.Client({ connectionString: url });
await client.connect();

const q = async (sql, params = []) => (await client.query(sql, params)).rows;
const tableExists = async (name) =>
  (await q("SELECT to_regclass($1) AS t", [`public.${name}`]))[0].t !== null;
const columnExists = async (table, column) =>
  (
    await q(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
      [table, column]
    )
  ).length > 0;

let blockers = 0;
let notes = 0;
const blocker = (what, detail) => {
  blockers++;
  console.log(`BLOCKER  ${what}`);
  if (detail) console.log(`         ${detail}`);
};
const ok = (what) => console.log(`ok       ${what}`);
const note = (what, detail) => {
  notes++;
  console.log(`note     ${what}`);
  if (detail) console.log(`         ${detail}`);
};

console.log(`\nPre-flight against ${url.replace(/:[^:@/]*@/, ":***@")}\n`);

// ---------------------------------------------------------------- already done?
if (await tableExists("households")) {
  console.log("This database already has households -- it is past the migration");
  console.log("this script checks. Nothing to do.\n");
  await client.end();
  process.exit(0);
}

// ------------------------------------------------- 1. can every row find an owner
// The household backfill reads the owning row: `SET household_id = u.household_id
// FROM users u WHERE x.user_id = u.id`. A row whose owner is missing keeps NULL
// and the following SET NOT NULL aborts the whole migration.
const owners = [
  ["budgets", "user_id", "users"],
  ["budget_transfers", "user_id", "users"],
  ["expenses", "user_id", "users"],
  ["income", "user_id", "users"],
  ["recurring_income", "user_id", "users"],
  ["recurring_expenses", "user_id", "users"],
  ["calendar_events", "created_by_user_id", "users"],
  ["accounts", "owner_user_id", "users"],
  ["transfers", "from_account_id", "accounts"],
  ["goals", "owner_user_id", "users"],
  ["goal_contributions", "owner_user_id", "users"],
  ["notes", "owner_user_id", "users"],
  ["ai_analysis_runs", "user_id", "users"],
  ["vendor_category_mappings", "user_id", "users"],
  ["recon_graph_connections", "user_id", "users"],
  ["recon_import_items", "user_id", "users"],
  ["push_subscriptions", "user_id", "users"],
  ["split_settlements", "payer_user_id", "users"],
  ["mortgage_payments", "user_id", "users"],
  ["mortgage_user_configs", "user_id", "users"],
  ["mortgage_schedule_snapshots", "mortgage_id", "mortgage_configs"],
];
let orphaned = 0;
for (const [table, column, parent] of owners) {
  if (!(await tableExists(table)) || !(await columnExists(table, column))) continue;
  const [{ n }] = await q(
    `SELECT count(*)::int AS n FROM "${table}" x
      LEFT JOIN "${parent}" p ON p.id = x."${column}"
      WHERE x."${column}" IS NULL OR p.id IS NULL`
  );
  if (Number(n) > 0) {
    orphaned += Number(n);
    blocker(
      `${table}: ${n} row(s) whose ${column} points at no ${parent}`,
      `They would end the migration with a NULL household_id. Repoint or delete them first.`
    );
  }
}
if (orphaned === 0) ok("every row can find its owner, so nothing is left without a household");

// ---------------------------------------------------- 2. budgets uniqueness
// The new key is (household_id, category_id, month, user_id). Everyone lands in
// one household, so a duplicate on (user, category, month) becomes a duplicate
// on the new key too.
if (await tableExists("budgets")) {
  const dupes = await q(
    `SELECT user_id, category_id, month, count(*)::int AS n
       FROM budgets GROUP BY user_id, category_id, month HAVING count(*) > 1
       ORDER BY n DESC LIMIT 5`
  );
  if (dupes.length) {
    blocker(
      `budgets: duplicate rows on (user, category, month)`,
      dupes.map((d) => `user ${d.user_id}, category ${d.category_id}, ${d.month}: ${d.n} rows`).join("; ")
    );
  } else ok("budgets are unique per user, category and month");
}

// ------------------------------------------- 3. name-unique tables per household
// Everyone lands in one household, so any two rows sharing a name collide on the
// new (household_id, name) index.
for (const table of ["categories", "split_groups", "calendar_categories"]) {
  if (!(await tableExists(table))) continue;
  const dupes = await q(
    `SELECT name, count(*)::int AS n FROM "${table}" GROUP BY name HAVING count(*) > 1 LIMIT 5`
  );
  if (dupes.length) {
    blocker(
      `${table}: names that are not unique`,
      dupes.map((d) => `"${d.name}" x${d.n}`).join(", ")
    );
  } else ok(`${table} names are unique, so the per-household index will build`);
}

// ------------------------------------------------------ 4. what the goals do
if (await tableExists("goals")) {
  const savings = await q(
    `SELECT owner_user_id, name, target_amount FROM goals
      WHERE type = 'savings' AND archived_at IS NULL ORDER BY name, id`
  );
  const byName = new Map();
  for (const g of savings) byName.set(g.name, (byName.get(g.name) ?? 0) + 1);
  const merging = [...byName].filter(([, n]) => n > 1);
  if (merging.length) {
    note(
      `${merging.length} savings goal name(s) held by more than one person will merge into one category`,
      merging.map(([n, c]) => `"${n}" (${c} people)`).join(", ") +
        " -- the earliest goal's target is kept"
    );
  } else if (savings.length) {
    ok(`${savings.length} savings goal(s) each become their own category`);
  }
  const credit = await q(
    `SELECT count(*)::int AS n FROM goals WHERE type <> 'savings' AND archived_at IS NULL`
  );
  if (Number(credit[0].n) > 0) {
    note(
      `${credit[0].n} credit goal(s) are left exactly as they are`,
      "A debt payoff plan is not an envelope. The goals tables stay, read-only, for a release."
    );
  }
}

// ------------------------------------------------------ 5. What I owe entitlement
if (await columnExists("users", "owed_to_me_enabled")) {
  const [{ n }] = await q(
    `SELECT count(*)::int AS n FROM users WHERE owed_to_me_enabled`
  );
  if (Number(n) === 0) {
    note(
      "nobody has \"Owed to me\" switched on, so the household will not be entitled to What I owe",
      "Turn it on for someone first, or enable it afterwards at /admin/houses/[id]."
    );
  } else ok(`What I owe carries over (${n} user(s) have it on today)`);
}

// ------------------------------------------------------------- 6. onboarding
const started = await q(
  `SELECT count(*)::int AS n FROM users u
    WHERE EXISTS (SELECT 1 FROM expenses e WHERE e.user_id = u.id)
       OR EXISTS (SELECT 1 FROM income i WHERE i.user_id = u.id)`
);
if (Number(started[0].n) > 0) {
  ok(`${started[0].n} user(s) with history skip the onboarding wizard`);
}

// ----------------------------------------------------------------- what is here
const counts = {};
for (const t of ["users", "accounts", "expenses", "income", "budgets", "goals", "transfers"]) {
  if (await tableExists(t)) counts[t] = Number((await q(`SELECT count(*)::int AS n FROM "${t}"`))[0].n);
}
console.log(
  "\nThis database holds: " +
    Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(", ")
);

console.log(
  blockers === 0
    ? `\nCLEAR TO UPGRADE${notes ? ` (${notes} thing(s) worth reading above)` : ""}. ` +
        `Take a dump first anyway.\n`
    : `\n${blockers} BLOCKER(S). db:push would abort -- and roll back whole, leaving this ` +
        `database as it is. Fix the above, then run this again.\n`
);

await client.end();
process.exit(blockers === 0 ? 0 : 1);
