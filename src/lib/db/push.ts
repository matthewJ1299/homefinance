/**
 * Applies schema to the database.
 * - If DATABASE_URL is set: runs drizzle/0000_init_pg.sql when users table is missing.
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
    const hasUsers = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'"
    );
    if (hasUsers.rows.length === 0) {
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
      console.log("Postgres schema (0000) applied.");
    } else {
      console.log("Base schema already applied (users table exists).");
    }

    const hasSplitGroups = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'split_groups'"
    );
    if (hasSplitGroups.rows.length === 0) {
      const migration0001Path = path.join(process.cwd(), "drizzle", "0001_split_groups_pg.sql");
      if (fs.existsSync(migration0001Path)) {
        const sql0001 = fs.readFileSync(migration0001Path, "utf-8");
        const statements0001 = sql0001
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0001) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0001 (split_groups) applied.");
      }
    }

    const hasRecurringIncome = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_income'"
    );
    if (hasRecurringIncome.rows.length === 0) {
      const migration0002Path = path.join(process.cwd(), "drizzle", "0002_recurring_pg.sql");
      if (fs.existsSync(migration0002Path)) {
        const sql0002 = fs.readFileSync(migration0002Path, "utf-8");
        const statements0002 = sql0002
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0002) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0002 (recurring) applied.");
      }
    }

    const hasCalendarEvents = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calendar_events'"
    );
    if (hasCalendarEvents.rows.length === 0) {
      const migration0003Path = path.join(process.cwd(), "drizzle", "0003_calendar_events_pg.sql");
      if (fs.existsSync(migration0003Path)) {
        const sql0003 = fs.readFileSync(migration0003Path, "utf-8");
        const statements0003 = sql0003
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0003) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0003 (calendar_events) applied.");
      }
    }

    const hasSharedLists = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shared_lists'"
    );
    if (hasSharedLists.rows.length === 0) {
      const migration0004Path = path.join(process.cwd(), "drizzle", "0004_shared_lists_pg.sql");
      if (fs.existsSync(migration0004Path)) {
        const sql0004 = fs.readFileSync(migration0004Path, "utf-8");
        const statements0004 = sql0004
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0004) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0004 (shared_lists) applied.");
      }
    }

    // Backfill list visibility (shared vs personal) so older databases keep working.
    // Personal lists are owned by a specific user via shared_lists.owner_user_id.
    const hasVisibilityColumn = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shared_lists' AND column_name = 'visibility'"
    );
    if (hasVisibilityColumn.rows.length === 0) {
      await client.query(
        "ALTER TABLE shared_lists ADD COLUMN visibility TEXT NOT NULL DEFAULT 'shared';"
      );
    }

    const hasOwnerUserIdColumn = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'shared_lists' AND column_name = 'owner_user_id'"
    );
    if (hasOwnerUserIdColumn.rows.length === 0) {
      await client.query(
        "ALTER TABLE shared_lists ADD COLUMN owner_user_id INTEGER REFERENCES users(id);"
      );
    }

    const hasPushSubscriptions = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_subscriptions'"
    );
    if (hasPushSubscriptions.rows.length === 0) {
      const migration0005Path = path.join(process.cwd(), "drizzle", "0005_push_subscriptions_pg.sql");
      if (fs.existsSync(migration0005Path)) {
        const sql0005 = fs.readFileSync(migration0005Path, "utf-8");
        const statements0005 = sql0005
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0005) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0005 (push_subscriptions) applied.");
      }
    }

    const hasSentReminders = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sent_reminders'"
    );
    if (hasSentReminders.rows.length === 0) {
      const migration0006Path = path.join(process.cwd(), "drizzle", "0006_calendar_reminders_pg.sql");
      if (fs.existsSync(migration0006Path)) {
        const sql0006 = fs.readFileSync(migration0006Path, "utf-8");
        const statements0006 = sql0006
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0006) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0006 (calendar_reminders) applied.");
      }
    }

    const hasAccounts = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts'"
    );
    if (hasAccounts.rows.length === 0) {
      const migration0007Path = path.join(process.cwd(), "drizzle", "0007_accounts_pg.sql");
      if (fs.existsSync(migration0007Path)) {
        const sql0007 = fs.readFileSync(migration0007Path, "utf-8");
        const statements0007 = sql0007
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0007) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0007 (accounts & transfers) applied.");
      }
    }

    const hasGoals = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals'"
    );
    if (hasGoals.rows.length === 0) {
      const migration0008Path = path.join(process.cwd(), "drizzle", "0008_goals_pg.sql");
      if (fs.existsSync(migration0008Path)) {
        const sql0008 = fs.readFileSync(migration0008Path, "utf-8");
        const statements0008 = sql0008
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0008) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0008 (goals) applied.");
      }
    }

    const hasCalendarEndTime = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'end_time'"
    );
    if (hasCalendarEndTime.rows.length === 0) {
      const migration0009Path = path.join(process.cwd(), "drizzle", "0009_calendar_categories_and_event_fields_pg.sql");
      if (fs.existsSync(migration0009Path)) {
        const sql0009 = fs.readFileSync(migration0009Path, "utf-8");
        const statements0009 = sql0009
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0009) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0009 (calendar categories + event fields) applied.");
      }
    }

    const hasCalendarEndDate = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'calendar_events' AND column_name = 'end_date'"
    );
    if (hasCalendarEndDate.rows.length === 0) {
      const migration0010Path = path.join(process.cwd(), "drizzle", "0010_calendar_event_end_date_pg.sql");
      if (fs.existsSync(migration0010Path)) {
        const sql0010 = fs.readFileSync(migration0010Path, "utf-8");
        const statements0010 = sql0010
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0010) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0010 (calendar_events.end_date) applied.");
      }
    }

    const hasBudgetMonthStartDay = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'budget_month_start_day'"
    );
    if (hasBudgetMonthStartDay.rows.length === 0) {
      const migration0011Path = path.join(process.cwd(), "drizzle", "0011_budget_month_start_day_pg.sql");
      if (fs.existsSync(migration0011Path)) {
        const sql0011 = fs.readFileSync(migration0011Path, "utf-8");
        const statements0011 = sql0011
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0011) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0011 (budget_month_start_day on users) applied.");
      }
    }

    const hasPrimaryAccountId = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'primary_account_id'"
    );
    if (hasPrimaryAccountId.rows.length === 0) {
      const migration0012Path = path.join(process.cwd(), "drizzle", "0012_primary_account_pg.sql");
      if (fs.existsSync(migration0012Path)) {
        const sql0012 = fs.readFileSync(migration0012Path, "utf-8");
        const statements0012 = sql0012
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0012) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0012 (users.primary_account_id) applied.");
      }
    }

    const hasReconGraphConnections = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recon_graph_connections'"
    );
    if (hasReconGraphConnections.rows.length === 0) {
      const migration0013Path = path.join(process.cwd(), "drizzle", "0013_recon_pg.sql");
      if (fs.existsSync(migration0013Path)) {
        const sql0013 = fs.readFileSync(migration0013Path, "utf-8");
        const statements0013 = sql0013
          .split(/--> statement-breakpoint\n?/)
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements0013) {
          await client.query(stmt);
        }
        console.log("Postgres migration 0013 (recon + vendor_category_mappings) applied.");
      }
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
