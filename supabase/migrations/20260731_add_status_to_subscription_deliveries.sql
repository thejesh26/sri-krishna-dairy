-- Adds an explicit status to subscription_deliveries so a row can represent
-- "scheduled but not yet delivered" (status='pending'), not just the two
-- historical terminal states. This underpins the early-morning delivery
-- snapshot: a cron pre-writes 'pending' rows with the frozen scheduled
-- quantity, and delivery/confirm transitions them to 'delivered'/'missed'.
--
-- Default is 'delivered', not 'pending' — deliberately. The only writer to
-- this table today is delivery/confirm, and it has only ever written rows
-- for actual deliveries (or, after this deploy, actual misses). If old
-- confirm-route code (unaware of `status`) writes a row during the gap
-- between this migration landing and the code deploying, a 'delivered'
-- default matches what actually happened; a 'pending' default would
-- misclassify a real delivery. No pending rows can be created until the
-- new snapshot cron's code is also deployed, so this default is never wrong.
alter table subscription_deliveries
  add column status text not null default 'delivered'
    check (status in ('pending', 'delivered', 'missed'));

-- Backfill existing rows to match their not_delivered value.
update subscription_deliveries set status = 'delivered' where not_delivered = false;
update subscription_deliveries set status = 'missed' where not_delivered = true;
