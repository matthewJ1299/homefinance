-- Multi-household tenancy: one household per user; rows scoped by household_id.
-- Applied when the multi-household end-state is still incomplete (see src/lib/db/push.ts).

CREATE TABLE IF NOT EXISTS households (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
ALTER TABLE users ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
DO $hf_users$
DECLARE
  ur RECORD;
  new_hid INTEGER;
BEGIN
  FOR ur IN SELECT id, name FROM users WHERE household_id IS NULL ORDER BY id
  LOOP
    INSERT INTO households (name) VALUES (ur.name || ' household') RETURNING id INTO new_hid;
    UPDATE users SET household_id = new_hid WHERE id = ur.id;
  END LOOP;
END $hf_users$;
--> statement-breakpoint
ALTER TABLE users ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE categories ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
DROP INDEX IF EXISTS categories_name_unique;
--> statement-breakpoint
DO $hf_categories$
DECLARE
  ucount INTEGER;
  single_hid INTEGER;
  u_rec RECORD;
  c_rec RECORD;
  new_cat_id INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO ucount FROM users;
  IF ucount <= 1 THEN
    SELECT household_id INTO single_hid FROM users ORDER BY id LIMIT 1;
    UPDATE categories SET household_id = single_hid WHERE household_id IS NULL;
  ELSE
    CREATE TEMP TABLE _hf_cat_map (old_id INTEGER, new_id INTEGER, household_id INTEGER) ON COMMIT DROP;
    FOR u_rec IN SELECT household_id AS hid FROM users ORDER BY id
    LOOP
      FOR c_rec IN
        SELECT id, name, group_name, icon, sort_order, is_active, cost_type, default_amount
        FROM categories
        WHERE household_id IS NULL
        ORDER BY id
      LOOP
        INSERT INTO categories (
          name, group_name, icon, sort_order, is_active, cost_type, default_amount, household_id
        ) VALUES (
          c_rec.name,
          c_rec.group_name,
          c_rec.icon,
          c_rec.sort_order,
          c_rec.is_active,
          c_rec.cost_type,
          c_rec.default_amount,
          u_rec.hid
        ) RETURNING id INTO new_cat_id;
        INSERT INTO _hf_cat_map VALUES (c_rec.id, new_cat_id, u_rec.hid);
      END LOOP;
    END LOOP;

    UPDATE expenses e
    SET category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = e.user_id
    WHERE e.category_id = m.old_id AND u.household_id = m.household_id;

    UPDATE budgets b
    SET category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = b.user_id
    WHERE b.category_id = m.old_id AND u.household_id = m.household_id;

    UPDATE budget_transfers bt
    SET from_category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = bt.user_id
    WHERE bt.from_category_id = m.old_id AND u.household_id = m.household_id;

    UPDATE budget_transfers bt
    SET to_category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = bt.user_id
    WHERE bt.to_category_id = m.old_id AND u.household_id = m.household_id;

    UPDATE recurring_expenses re
    SET category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = re.user_id
    WHERE re.category_id = m.old_id AND u.household_id = m.household_id;

    UPDATE vendor_category_mappings v
    SET category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = v.user_id
    WHERE v.category_id = m.old_id AND u.household_id = m.household_id;

    UPDATE recon_import_items ri
    SET suggested_category_id = m.new_id
    FROM _hf_cat_map m
    INNER JOIN users u ON u.id = ri.user_id
    WHERE ri.suggested_category_id IS NOT NULL
      AND ri.suggested_category_id = m.old_id
      AND u.household_id = m.household_id;

    DELETE FROM categories WHERE household_id IS NULL;
  END IF;
END $hf_categories$;
--> statement-breakpoint
ALTER TABLE categories ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS categories_household_id_name_unique ON categories (household_id, name);
--> statement-breakpoint
ALTER TABLE split_groups ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
DROP INDEX IF EXISTS split_groups_name_unique;
--> statement-breakpoint
DO $hf_split_groups$
DECLARE
  h_rec RECORD;
  sg_rec RECORD;
  new_sg_id INTEGER;
BEGIN
  FOR h_rec IN SELECT DISTINCT household_id AS hid FROM users ORDER BY hid
  LOOP
    FOR sg_rec IN SELECT id, name, is_default, sort_order FROM split_groups WHERE household_id IS NULL ORDER BY id
    LOOP
      INSERT INTO split_groups (name, is_default, sort_order, household_id)
      VALUES (sg_rec.name, sg_rec.is_default, sg_rec.sort_order, h_rec.hid)
      RETURNING id INTO new_sg_id;

      UPDATE expenses e
      SET split_expense_group_id = new_sg_id
      FROM users u
      WHERE e.user_id = u.id
        AND u.household_id = h_rec.hid
        AND e.split_expense_group_id IS NOT NULL
        AND e.split_expense_group_id = sg_rec.id;

      UPDATE split_settlements ss
      SET split_expense_group_id = new_sg_id
      FROM users u
      WHERE ss.payer_user_id = u.id
        AND u.household_id = h_rec.hid
        AND ss.split_expense_group_id IS NOT NULL
        AND ss.split_expense_group_id = sg_rec.id;
    END LOOP;
  END LOOP;
  DELETE FROM split_groups WHERE household_id IS NULL;
END $hf_split_groups$;
--> statement-breakpoint
ALTER TABLE split_groups ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS split_groups_household_id_name_unique ON split_groups (household_id, name);
--> statement-breakpoint
ALTER TABLE calendar_categories ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
ALTER TABLE calendar_categories DROP CONSTRAINT IF EXISTS calendar_categories_name_key;
--> statement-breakpoint
DROP INDEX IF EXISTS calendar_categories_name_unique;
--> statement-breakpoint
DO $hf_cal_categories$
DECLARE
  ucount INTEGER;
  single_hid INTEGER;
  h_rec RECORD;
  cc_rec RECORD;
  new_cc_id INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO ucount FROM users;
  IF ucount <= 1 THEN
    SELECT household_id INTO single_hid FROM users ORDER BY id LIMIT 1;
    UPDATE calendar_categories SET household_id = single_hid WHERE household_id IS NULL;
  ELSE
    CREATE TEMP TABLE _hf_cc_map (old_id INTEGER, new_id INTEGER, household_id INTEGER) ON COMMIT DROP;
    FOR h_rec IN SELECT DISTINCT household_id AS hid FROM users ORDER BY hid
    LOOP
      FOR cc_rec IN
        SELECT id, name, color, sort_order FROM calendar_categories WHERE household_id IS NULL ORDER BY id
      LOOP
        INSERT INTO calendar_categories (name, color, sort_order, household_id)
        VALUES (cc_rec.name, cc_rec.color, cc_rec.sort_order, h_rec.hid)
        RETURNING id INTO new_cc_id;
        INSERT INTO _hf_cc_map VALUES (cc_rec.id, new_cc_id, h_rec.hid);
      END LOOP;
    END LOOP;

    UPDATE calendar_events ce
    SET category_id = m.new_id
    FROM _hf_cc_map m
    INNER JOIN users u ON u.id = ce.created_by_user_id
    WHERE ce.category_id IS NOT NULL
      AND ce.category_id = m.old_id
      AND u.household_id = m.household_id;

    DELETE FROM calendar_categories WHERE household_id IS NULL;
  END IF;
END $hf_cal_categories$;
--> statement-breakpoint
ALTER TABLE calendar_categories ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS calendar_categories_household_id_name_unique ON calendar_categories (household_id, name);
--> statement-breakpoint
ALTER TABLE mortgage_configs ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
DO $hf_mortgage$
DECLARE
  mc_rec RECORD;
  map_rec RECORD;
  new_mc_id INTEGER;
  hid INTEGER;
BEGIN
  FOR mc_rec IN SELECT id FROM mortgage_configs WHERE household_id IS NULL
  LOOP
    FOR map_rec IN
      SELECT DISTINCT u.household_id AS hid
      FROM mortgage_user_configs muc
      INNER JOIN users u ON u.id = muc.user_id
      WHERE muc.mortgage_id = mc_rec.id
      ORDER BY u.household_id
    LOOP
      hid := map_rec.hid;
      INSERT INTO mortgage_configs (
        property_value, loan_amount, annual_interest_rate, loan_term_months, start_date,
        target_equity_user_a_pct, is_active, household_id
      )
      SELECT
        property_value, loan_amount, annual_interest_rate, loan_term_months, start_date,
        target_equity_user_a_pct, is_active, hid
      FROM mortgage_configs WHERE id = mc_rec.id
      RETURNING id INTO new_mc_id;

      UPDATE mortgage_user_configs muc
      SET mortgage_id = new_mc_id
      FROM users u
      WHERE muc.mortgage_id = mc_rec.id
        AND muc.user_id = u.id
        AND u.household_id = hid;

      UPDATE mortgage_payments mp
      SET mortgage_id = new_mc_id
      FROM users u
      WHERE mp.mortgage_id = mc_rec.id
        AND mp.user_id = u.id
        AND u.household_id = hid;

      INSERT INTO mortgage_schedule_snapshots (
        mortgage_id, generated_at, trigger_event, trigger_payment_id, schedule_json,
        projected_payoff_date, projected_months, monthly_topup, user_a_final_equity_pct, user_b_final_equity_pct
      )
      SELECT
        new_mc_id, generated_at, trigger_event, trigger_payment_id, schedule_json,
        projected_payoff_date, projected_months, monthly_topup, user_a_final_equity_pct, user_b_final_equity_pct
      FROM mortgage_schedule_snapshots WHERE mortgage_id = mc_rec.id;
    END LOOP;
    DELETE FROM mortgage_schedule_snapshots WHERE mortgage_id = mc_rec.id;
    DELETE FROM mortgage_configs WHERE id = mc_rec.id;
  END LOOP;
END $hf_mortgage$;
--> statement-breakpoint
UPDATE mortgage_configs SET household_id = (SELECT household_id FROM users ORDER BY id LIMIT 1) WHERE household_id IS NULL;
--> statement-breakpoint
ALTER TABLE mortgage_configs ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE budgets b SET household_id = u.household_id FROM users u WHERE b.user_id = u.id;
--> statement-breakpoint
ALTER TABLE budgets ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS budgets_user_id_category_id_month_unique;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS budgets_household_id_category_id_month_unique ON budgets (household_id, category_id, month);
--> statement-breakpoint
ALTER TABLE budget_transfers ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE budget_transfers bt SET household_id = u.household_id FROM users u WHERE bt.user_id = u.id;
--> statement-breakpoint
ALTER TABLE budget_transfers ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE expenses e SET household_id = u.household_id FROM users u WHERE e.user_id = u.id;
--> statement-breakpoint
ALTER TABLE expenses ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE income ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE income i SET household_id = u.household_id FROM users u WHERE i.user_id = u.id;
--> statement-breakpoint
ALTER TABLE income ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE recurring_income ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE recurring_income r SET household_id = u.household_id FROM users u WHERE r.user_id = u.id;
--> statement-breakpoint
ALTER TABLE recurring_income ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE recurring_expenses r SET household_id = u.household_id FROM users u WHERE r.user_id = u.id;
--> statement-breakpoint
ALTER TABLE recurring_expenses ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE calendar_events ce SET household_id = u.household_id FROM users u WHERE ce.created_by_user_id = u.id;
--> statement-breakpoint
ALTER TABLE calendar_events ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE shared_lists ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE shared_lists sl SET household_id = u.household_id FROM users u WHERE sl.owner_user_id IS NOT NULL AND sl.owner_user_id = u.id;
--> statement-breakpoint
UPDATE shared_lists SET household_id = (SELECT household_id FROM users ORDER BY id LIMIT 1) WHERE household_id IS NULL;
--> statement-breakpoint
ALTER TABLE shared_lists ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE accounts a SET household_id = u.household_id FROM users u WHERE a.owner_user_id = u.id;
--> statement-breakpoint
ALTER TABLE accounts ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE transfers t SET household_id = a.household_id FROM accounts a WHERE t.from_account_id = a.id;
--> statement-breakpoint
ALTER TABLE transfers ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE goals ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE goals g SET household_id = u.household_id FROM users u WHERE g.owner_user_id = u.id;
--> statement-breakpoint
ALTER TABLE goals ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE goal_contributions ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE goal_contributions gc SET household_id = u.household_id FROM users u WHERE gc.owner_user_id = u.id;
--> statement-breakpoint
ALTER TABLE goal_contributions ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE notes ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE notes n SET household_id = u.household_id FROM users u WHERE n.owner_user_id = u.id;
--> statement-breakpoint
ALTER TABLE notes ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE ai_analysis_runs ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE ai_analysis_runs a SET household_id = u.household_id FROM users u WHERE a.user_id = u.id;
--> statement-breakpoint
ALTER TABLE ai_analysis_runs ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE vendor_category_mappings ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE vendor_category_mappings v SET household_id = u.household_id FROM users u WHERE v.user_id = u.id;
--> statement-breakpoint
ALTER TABLE vendor_category_mappings ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE recon_graph_connections ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE recon_graph_connections r SET household_id = u.household_id FROM users u WHERE r.user_id = u.id;
--> statement-breakpoint
ALTER TABLE recon_graph_connections ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE recon_import_items ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE recon_import_items r SET household_id = u.household_id FROM users u WHERE r.user_id = u.id;
--> statement-breakpoint
ALTER TABLE recon_import_items ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE push_subscriptions p SET household_id = u.household_id FROM users u WHERE p.user_id = u.id;
--> statement-breakpoint
ALTER TABLE push_subscriptions ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE split_settlements ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE split_settlements ss SET household_id = u.household_id FROM users u WHERE ss.payer_user_id = u.id;
--> statement-breakpoint
ALTER TABLE split_settlements ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE mortgage_payments ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE mortgage_payments mp SET household_id = u.household_id FROM users u WHERE mp.user_id = u.id;
--> statement-breakpoint
ALTER TABLE mortgage_payments ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE mortgage_user_configs ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE mortgage_user_configs muc SET household_id = u.household_id FROM users u WHERE muc.user_id = u.id;
--> statement-breakpoint
ALTER TABLE mortgage_user_configs ALTER COLUMN household_id SET NOT NULL;
--> statement-breakpoint
ALTER TABLE mortgage_schedule_snapshots ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
--> statement-breakpoint
UPDATE mortgage_schedule_snapshots ms SET household_id = mc.household_id FROM mortgage_configs mc WHERE ms.mortgage_id = mc.id;
--> statement-breakpoint
ALTER TABLE mortgage_schedule_snapshots ALTER COLUMN household_id SET NOT NULL;
