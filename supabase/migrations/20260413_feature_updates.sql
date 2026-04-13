-- ── Feature updates: referral system, COD, addon orders, pause limits, loyalty expiry ──

-- Profiles: COD trial flag + loyalty expiry
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_used_cod boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_points_expiry date;

-- Subscriptions: pause limit tracking + pending delivery flag
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pause_days_used_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_delivery boolean DEFAULT false;

-- Referrals: activation timestamp + subscription day counter
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS referral_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_days_count integer DEFAULT 0;

-- Add-on orders table
CREATE TABLE IF NOT EXISTS addon_orders (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id integer REFERENCES subscriptions(id),
  product_id integer REFERENCES products(id),
  quantity integer DEFAULT 1,
  delivery_date date NOT NULL,
  delivery_slot text DEFAULT 'morning',
  total_price numeric NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE addon_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own addon orders" ON addon_orders;
CREATE POLICY "Users can manage own addon orders"
  ON addon_orders FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all addon orders" ON addon_orders;
CREATE POLICY "Admins can manage all addon orders"
  ON addon_orders FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Delivery agents can view addon orders" ON addon_orders;
CREATE POLICY "Delivery agents can view addon orders"
  ON addon_orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_delivery = true)
  );
