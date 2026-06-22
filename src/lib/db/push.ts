/**
 * Applies schema to the database using a versioned migration ledger.
 * Use: npm run db:push
 */
import path from "path";
import fs from "fs";
import pg from "pg";
import { MIGRATION_FILES } from "./migration-manifest";
import { isMigrationAlreadyApplied } from "./migration-seed";

function splitStatements(sqlContent: string): string[] {
  return sqlContent
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function pushPostgres(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Postgres push");
  const client = new pg.Client({ connectionString: url });
  await client.connect();

  const query = (sql: string) => client.query(sql);

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const ledgerResult = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations"
    );
    const applied = new Set(ledgerResult.rows.map((r) => r.filename));
    const hasExistingSchema = await isMigrationAlreadyApplied(query, "0000_init_pg.sql");

    if (applied.size === 0 && hasExistingSchema) {
      console.log("Seeding migration ledger from existing schema (no data loss)...");
      for (const filename of MIGRATION_FILES) {
        if (await isMigrationAlreadyApplied(query, filename)) {
          await client.query(
            "INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
            [filename]
          );
          applied.add(filename);
        }
      }
      console.log(`Seeded ${applied.size} migration(s) into ledger.`);
    }

    for (const filename of MIGRATION_FILES) {
      if (applied.has(filename)) continue;

      const migrationPath = path.join(process.cwd(), "drizzle", filename);
      if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: drizzle/${filename}`);
        process.exit(1);
      }

      const statements = splitStatements(fs.readFileSync(migrationPath, "utf-8"));
      await client.query("BEGIN");
      try {
        for (const stmt of statements) {
          await client.query(stmt);
        }
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [filename]);
        await client.query("COMMIT");
        console.log(`Applied migration: ${filename}`);
        applied.add(filename);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }

    if (MIGRATION_FILES.every((f) => applied.has(f))) {
      console.log("Database schema is up to date.");
    }
  } finally {
    await client.end();
  }
}

(async () => {
  await pushPostgres();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
