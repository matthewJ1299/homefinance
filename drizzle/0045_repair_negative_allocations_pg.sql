-- Rows written by `transfer` before it debited carry-in (see FIXES.md fix 2).
-- A negative assignment understates totalAssigned, which overstates unassigned
-- by the same amount. The money it represents was really taken from carry-in,
-- so that is where the correction goes.
--
-- GREATEST matters: if carry-in is smaller than the negative assignment the row
-- was already incoherent, and clamping is the only safe read.
UPDATE budgets
   SET carried_in_minor = GREATEST(0, carried_in_minor + allocated_amount),
       allocated_amount = 0,
       updated_at = NOW()
 WHERE allocated_amount < 0;
