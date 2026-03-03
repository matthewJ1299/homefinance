import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  groupName: text("group_name").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  /** fixed = same amount each month (auto-populated); variable = varies by month */
  costType: text("cost_type", { enum: ["fixed", "variable"] })
    .notNull()
    .default("variable"),
  /** For fixed costs: default amount (cents) to allocate each month when none set */
  defaultAmount: integer("default_amount"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const income = sqliteTable("income", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type", { enum: ["salary", "ad_hoc"] }).notNull(),
  description: text("description"),
  date: text("date").notNull(),
  month: text("month").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  amount: integer("amount").notNull(),
  note: text("note"),
  date: text("date").notNull(),
  month: text("month").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  synced: integer("synced", { mode: "boolean" }).notNull().default(true),
});

export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id),
  month: text("month").notNull(),
  allocatedAmount: integer("allocated_amount").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const budgetTransfers = sqliteTable(
  "budget_transfers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fromCategoryId: integer("from_category_id")
      .notNull()
      .references(() => categories.id),
    toCategoryId: integer("to_category_id")
      .notNull()
      .references(() => categories.id),
    month: text("month").notNull(),
    amount: integer("amount").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const mortgageConfigs = sqliteTable("mortgage_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  propertyValue: integer("property_value").notNull(),
  loanAmount: integer("loan_amount").notNull(),
  annualInterestRate: real("annual_interest_rate").notNull(),
  loanTermMonths: integer("loan_term_months").notNull(),
  startDate: text("start_date").notNull(),
  targetEquityUserAPct: real("target_equity_user_a_pct"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const mortgageUserConfigs = sqliteTable("mortgage_user_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mortgageId: integer("mortgage_id")
    .notNull()
    .references(() => mortgageConfigs.id, { onDelete: "cascade" }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  initialDeposit: integer("initial_deposit").notNull().default(0),
  baseSplitPct: real("base_split_pct").notNull(),
  monthlyCap: integer("monthly_cap"),
});

export const mortgagePayments = sqliteTable(
  "mortgage_payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mortgageId: integer("mortgage_id")
      .notNull()
      .references(() => mortgageConfigs.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    paymentDate: text("payment_date").notNull(),
    monthNumber: integer("month_number").notNull(),
    amount: integer("amount").notNull(),
    principalPortion: integer("principal_portion").notNull(),
    interestPortion: integer("interest_portion").notNull(),
    isExtraPayment: integer("is_extra_payment", { mode: "boolean" })
      .notNull()
      .default(false),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
);

export const mortgageScheduleSnapshots = sqliteTable(
  "mortgage_schedule_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    mortgageId: integer("mortgage_id")
      .notNull()
      .references(() => mortgageConfigs.id),
    generatedAt: text("generated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    triggerEvent: text("trigger_event", {
      enum: ["initial", "extra_payment", "recalculation", "config_update"],
    }).notNull(),
    triggerPaymentId: integer("trigger_payment_id").references(
      () => mortgagePayments.id
    ),
    scheduleJson: text("schedule_json").notNull(),
    projectedPayoffDate: text("projected_payoff_date").notNull(),
    projectedMonths: integer("projected_months").notNull(),
    monthlyTopup: integer("monthly_topup").notNull(),
    userAFinalEquityPct: real("user_a_final_equity_pct").notNull(),
    userBFinalEquityPct: real("user_b_final_equity_pct").notNull(),
  },
);
