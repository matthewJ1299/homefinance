-- An upgraded database already has months of accounts, income and spending in
-- it, but every user in it reads as `not_started` -- so the first login after
-- upgrading sends them to /welcome and asks them to add the accounts, payday,
-- income and categories they have been using for months.
--
-- Anyone with data has plainly started. Mark them complete so the upgrade lands
-- them on Home. A genuinely new user, added after this runs, still has no rows
-- and still gets the wizard.
UPDATE users u
SET setup_wizard_status = 'completed',
    setup_wizard_completed_at = COALESCE(setup_wizard_completed_at, NOW()),
    setup_wizard_step = NULL
WHERE COALESCE(u.setup_wizard_status, 'not_started') = 'not_started'
  AND (
    EXISTS (SELECT 1 FROM expenses e WHERE e.user_id = u.id)
    OR EXISTS (SELECT 1 FROM income i WHERE i.user_id = u.id)
    OR EXISTS (SELECT 1 FROM accounts a WHERE a.owner_user_id = u.id)
  );
