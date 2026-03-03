# Home Finance

Personal finance app for tracking income, expenses, and budgets.

## Features

- **Income**: Record salary and ad-hoc income per month.
- **Expenses**: Log expenses by category with optional notes.
  - **Dashboard**: The "Recent" expenses section shows only the signed-in user's expenses.
  - **Expenses page**: Toggle to view **My expenses**, another user's expenses (e.g. partner's), or **Combined** income and expenses for the selected view. Income and expense totals are shown for the active filter.
- **Categories**: Each category is either **Fixed** or **Variable** cost.
  - **Fixed**: Same amount each month (e.g. Utilities, Insurance). You can set a default amount (R) in Manage categories; that amount is auto-allocated for new months until you change it.
  - **Variable**: Amount varies by month (e.g. Groceries, Dining out).
- **Budget**: Allocate income to categories per month. Category order can be changed by **drag and drop** (grip handle on the left of each category card); the order is saved and used app-wide (e.g. Manage categories, category pickers). Allocations **carry over**: if a month has no allocation set for a category, the last set allocation from a previous month is used. So you only need to change an allocation when you want it to differ from the previous month.
  - When there is unallocated income, use **Auto-allocate** to distribute the remainder:
    - If you have already set amounts for some categories, the remainder is added to those categories only.
    - If historical expense data exists (past 6 months), the remainder is split in proportion to past spending.
    - If there is no history or no allocations yet, the remainder is split evenly across categories.
  - Opening the budget for a new month automatically fills in carried-over allocations and, for fixed-cost categories with a default amount, that default.
- **Transfers**: Move budget between categories within a month.
- **Summary**: View spending by category and budget adherence.
- **Mortgage**: Optional mortgage tracking and amortisation.

## Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `AUTH_SECRET` (and optionally `DB_PATH`, seed overrides).
3. Create the database and seed: `npm run db:fresh` (recreates the DB from scratch from the migration scripts, then seeds), or:
   - Run migrations: `npm run db:migrate` (creates/updates tables from `drizzle/*.sql`)
   - Seed: `npm run db:seed` (clears all data, then inserts users, categories, and 3 months of income and expenses for both users)

## Seed data

Seed always creates:

- Two users (see `.env.example` for `SEED_USER1_EMAIL`, `SEED_USER2_EMAIL`, etc.).
- Default categories (fixed/variable and default amounts where applicable).
- **3 months** of income and expenses for **both users**: current month and the two previous months. Income includes monthly salary per user plus ad-hoc entries; expenses are spread across categories and both users.

Amounts use the same integer format as the app (e.g. cents). To start with an empty transaction history, you would need to change the seed script or clear income/expenses after seeding.

## Scripts

- `npm run dev` – Start dev server (Turbopack)
- `npm run build` / `npm run start` – Production build and start
- `npm run db:generate` – Generate Drizzle migrations
- `npm run db:migrate` – Run migrations (create/update tables)
- `npm run db:reset` – Recreate DB from scratch (delete file, run migrations). Do not run while the app is using the DB.
- `npm run db:seed` – Clear all data, then seed users, categories, and 3 months of income/expenses for both users
- `npm run db:fresh` – Reset DB then seed (recreate from scratch and seed in one go)
- `npm run db:studio` – Open Drizzle Studio
