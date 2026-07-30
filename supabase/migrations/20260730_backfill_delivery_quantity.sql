-- Persist actual delivered quantity on subscription_deliveries instead of deriving it
-- live from subscriptions.quantity/weekly_schedule, which silently rewrites history
-- whenever a customer changes their current subscription quantity.
--
-- Backfill strategy: match each existing row to its wallet_transactions debit
-- ("Daily subscription {id} [{date}]") and back-solve quantity from the amount
-- actually charged. Rows that can't be confidently resolved (no matching
-- transaction, or a non-integer result) are kept but flagged via quantity_source
-- rather than silently guessed.

alter table subscription_deliveries
  add column if not exists quantity integer,
  add column if not exists quantity_source text;

-- Pass 1: clean match — amount / (price * (1 - discount%)) resolves to a whole number.
with clean as (
  select sd.id,
         round(wt.amount / (p.price * (1 - coalesce(s.discount_percent, 0) / 100.0))) as qty
  from subscription_deliveries sd
  join wallet_transactions wt
    on wt.description = 'Daily subscription ' || sd.subscription_id || ' [' || sd.delivery_date || ']'
   and wt.type = 'debit'
  join subscriptions s on s.id = sd.subscription_id
  join products p on p.id = s.product_id
  where sd.not_delivered = false
    and abs(
      (wt.amount / (p.price * (1 - coalesce(s.discount_percent, 0) / 100.0)))
      - round(wt.amount / (p.price * (1 - coalesce(s.discount_percent, 0) / 100.0)))
    ) <= 0.05
)
update subscription_deliveries sd
set quantity = clean.qty,
    quantity_source = 'backfilled'
from clean
where sd.id = clean.id;

-- Pass 2: matched a transaction, but amount doesn't cleanly resolve (price/discount
-- drifted since). Store the nearest-integer best guess but flag it for manual review.
with fuzzy as (
  select sd.id,
         greatest(1, round(wt.amount / (p.price * (1 - coalesce(s.discount_percent, 0) / 100.0)))) as qty
  from subscription_deliveries sd
  join wallet_transactions wt
    on wt.description = 'Daily subscription ' || sd.subscription_id || ' [' || sd.delivery_date || ']'
   and wt.type = 'debit'
  join subscriptions s on s.id = sd.subscription_id
  join products p on p.id = s.product_id
  where sd.not_delivered = false
    and sd.quantity is null
)
update subscription_deliveries sd
set quantity = fuzzy.qty,
    quantity_source = 'backfilled_flagged'
from fuzzy
where sd.id = fuzzy.id;

-- Pass 3: no matching wallet_transactions row at all. Fall back to the subscription's
-- current quantity (best available guess) and flag as unresolved.
update subscription_deliveries sd
set quantity = coalesce(s.quantity, 1),
    quantity_source = 'unresolved_no_transaction'
from subscriptions s
where sd.subscription_id = s.id
  and sd.quantity is null;

-- Any stragglers with no subscription match at all (orphaned rows) — default to 1.
update subscription_deliveries
set quantity = 1,
    quantity_source = 'unresolved_no_transaction'
where quantity is null;

alter table subscription_deliveries
  alter column quantity set not null;
