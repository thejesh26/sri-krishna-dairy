-- Prevent duplicate Pluxee submissions at the DB level.
-- Partial index: uniqueness enforced only for pluxee rows (agent rows have NULL txn_ref, unaffected).
-- This catches both:
--   (a) same customer double-tapping submit (race condition)
--   (b) two different customers entering the same txn_ref
CREATE UNIQUE INDEX IF NOT EXISTS wallet_requests_pluxee_txn_ref_unique
  ON wallet_requests(txn_ref)
  WHERE payment_method = 'pluxee';
