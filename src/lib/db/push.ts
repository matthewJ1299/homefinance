/**
 * Applies schema to the database using sql.js (no native bindings).
 * Runs migration SQL from drizzle/0000_init.sql if the DB has no tables.
 * Use: npm run db:push
 */
import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";

const dbPath =
  process.env.DB_PATH ?? path.join(process.cwd(), "data", "sqlite.db");

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

async function main() {
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
