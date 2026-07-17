-- Pluxee (Sodexo) payment support
-- payment_method distinguishes customer Pluxee self-requests from agent wallet adjustments
-- txn_ref stores the Pluxee transaction reference number submitted by the customer
ALTER TABLE wallet_requests
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS txn_ref text;

-- Setting for the Pluxee merchant QR image URL (admin pastes public URL from Supabase storage)
INSERT INTO app_settings (key, value)
VALUES ('pluxee_qr_url', '')
ON CONFLICT (key) DO NOTHING;
