-- Migration: add discount_percent to subscriptions
-- Stores the validated discount applied at subscription creation time.
-- The cron job (deduct-subscriptions) uses this to charge the discounted daily rate.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0
    CHECK (discount_percent >= 0 AND discount_percent <= 100);
