-- Per-weekday quantity schedule for subscriptions
-- weekly_schedule is a JSONB object keyed by lowercase 3-letter day abbreviation.
-- Example: {"mon":1,"tue":1,"wed":1,"thu":1,"fri":2,"sat":2,"sun":2}
-- NULL means use the uniform `quantity` column (fully backward compatible).
-- A day value of 0 means skip delivery on that day.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS weekly_schedule jsonb;
