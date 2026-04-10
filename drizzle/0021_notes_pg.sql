CREATE TABLE notes (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON UPDATE NO ACTION ON DELETE NO ACTION,
  linked_type TEXT NOT NULL,
  linked_id BIGINT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE INDEX notes_owner_user_id_idx ON notes (owner_user_id);
--> statement-breakpoint
CREATE INDEX notes_linked_target_idx ON notes (owner_user_id, linked_type, linked_id);
--> statement-breakpoint
