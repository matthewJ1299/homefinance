ALTER TABLE users ADD COLUMN primary_account_id BIGINT REFERENCES accounts(id) ON UPDATE NO ACTION ON DELETE SET NULL;
--> statement-breakpoint
UPDATE users u
SET primary_account_id = COALESCE(
  (SELECT a.id FROM accounts a WHERE a.owner_user_id = u.id AND a.type = 'bank' ORDER BY a.id ASC LIMIT 1),
  (SELECT MIN(a2.id) FROM accounts a2 WHERE a2.owner_user_id = u.id)
)
WHERE u.primary_account_id IS NULL
  AND EXISTS (SELECT 1 FROM accounts a3 WHERE a3.owner_user_id = u.id);
