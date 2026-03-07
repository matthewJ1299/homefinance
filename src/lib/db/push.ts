/**
 * Applies schema to the database.
 * - If DATABASE_URL is set: runs drizzle/0000_init_pg.sql when users table is missing.
 * - Otherwise: runs drizzle/0000_init.sql (SQLite) when no tables exist.
 * Use: npm run db:push
 */
import path from "path";
import fs from "fs";

async function pushPostgres(): Promise<void> {
  const pg = await import("pg");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for Postgres push");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const res = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
    );
    if (res.rows.length > 0) {
      console.log("Schema already applied (users table exists).");
      return;
    }
    const migrationPath = path.join(process.cwd(), "drizzle", "0000_init_pg.sql");
    if (!fs.existsSync(migrationPath)) {
      console.error("Migration file not found: drizzle/0000_init_pg.sql");
      process.exit(1);
    }
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");
    const statements = sqlContent
      .split(/--> statement-breakpoint\n?/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await client.query(stmt);
    }
    console.log("Postgres schema applied.");
  } finally {
    await client.end();
  }
}

async function pushSqlite(): Promise<void> {
  const initSqlJs = (await import("sql.js")).default;
  const dbPath =
    process.env.DB_PATH ?? path.join(process.cwd(), "data", "sqlite.db");
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();
  let db: import("sql.js").Database;
  if (fs.existsSync(dbPath)) {
    const buf = fs.readFileSync(dbPath);
    db = new SQL.Database(new Uint8Array(buf));
  } else {
    db = new SQL.Database();
  }

  const tableExists = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );
  if (tableExists.length > 0 && tableExists[0].values.length > 0) {
    console.log("Schema already applied (users table exists).");
    db.close();
    return;
  }

  const migrationPath = path.join(process.cwd(), "drizzle", "0000_init.sql");
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found: drizzle/0000_init.sql");
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(migrationPath, "utf-8");
  const statements = sqlContent
    .split(/--> statement-breakpoint\n?/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    db.run(stmt);
  }

  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();
  console.log("Schema applied. Database saved to", dbPath);
}

(async () => {
  if (process.env.DATABASE_URL) {
    await pushPostgres();
  } else {
    await pushSqlite();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
