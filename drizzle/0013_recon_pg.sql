-- Additive migration only: creates new tables and indexes. Does not DROP, TRUNCATE, or modify existing user data tables.
CREATE TABLE recon_graph_connections (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_encrypted TEXT NOT NULL,
  ms_account_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE recon_import_items (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  graph_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending_duplicate','pending_add','accepted_duplicate','accepted_add','ignored')),
  parse_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  txn_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  merchant_key_normalized TEXT NOT NULL,
  matched_expense_ids JSONB,
  suggested_category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  raw_subject TEXT,
  raw_body_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, graph_message_id)
);
--> statement-breakpoint
CREATE INDEX recon_import_items_user_status ON recon_import_items (user_id, status);
--> statement-breakpoint
CREATE INDEX recon_import_items_user_date ON recon_import_items (user_id, txn_date DESC);
--> statement-breakpoint
CREATE TABLE vendor_category_mappings (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant_key_normalized TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  use_count INTEGER NOT NULL DEFAULT 1,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, merchant_key_normalized)
);
--> statement-breakpoint
CREATE INDEX vendor_category_mappings_user ON vendor_category_mappings (user_id);
