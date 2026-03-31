-- ============================================================
-- Row Level Security (RLS) Policies — Sri Krishna Dairy
-- ============================================================
-- Run this migration once in the Supabase SQL editor or via CLI.
-- These policies are the DATABASE-LEVEL safety net that prevents
-- any authenticated user from reading or mutating another user's
-- data, even if they call Supabase directly from the browser console.
--
-- Design principles:
--   1. Enable RLS on every table — deny-by-default.
--   2. Service-role key bypasses RLS (used only in server API routes).
--   3. All write operations on user-owned rows check auth.uid() = user_id.
--   4. Admins are identified via profiles.is_admin — checked with a
--      subquery so it is always authoritative (not a JWT claim).
--   5. Products are public-readable but admin-writable only.
-- ============================================================


-- ── Helper: is the current JWT user an admin? ────────────────
-- Used as a sub-expression in policies below.
-- (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true))


-- ============================================================
-- TABLE: profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile only
DROP POLICY IF EXISTS "profiles: owner select" ON profiles;
CREATE POLICY "profiles: owner select"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles: owner update" ON profiles;
CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (for admin panel)
DROP POLICY IF EXISTS "profiles: admin select all" ON profiles;
CREATE POLICY "profiles: admin select all"
  ON profiles FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- No direct INSERT from client — profiles are created via server API
-- (supabase-server.js with service role key bypasses RLS for inserts)

-- No DELETE allowed from client
-- (service role key used for admin operations)


-- ============================================================
-- TABLE: products
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated (or even anon) can read available products
DROP POLICY IF EXISTS "products: public read" ON products;
CREATE POLICY "products: public read"
  ON products FOR SELECT
  USING (true);

-- Only admins can insert/update/delete products
DROP POLICY IF EXISTS "products: admin insert" ON products;
CREATE POLICY "products: admin insert"
  ON products FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

DROP POLICY IF EXISTS "products: admin update" ON products;
CREATE POLICY "products: admin update"
  ON products FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

DROP POLICY IF EXISTS "products: admin delete" ON products;
CREATE POLICY "products: admin delete"
  ON products FOR DELETE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );


-- ============================================================
-- TABLE: subscriptions
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscriptions
DROP POLICY IF EXISTS "subscriptions: owner select" ON subscriptions;
CREATE POLICY "subscriptions: owner select"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all subscriptions
DROP POLICY IF EXISTS "subscriptions: admin select all" ON subscriptions;
CREATE POLICY "subscriptions: admin select all"
  ON subscriptions FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- Users can update their own subscriptions (pause, cancel)
-- Server API routes add a .eq('user_id', user.id) filter too — double safety
DROP POLICY IF EXISTS "subscriptions: owner update" ON subscriptions;
CREATE POLICY "subscriptions: owner update"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No client INSERT — all inserts go through /api/subscriptions/create (service role)
-- No client DELETE — use is_active = false instead


-- ============================================================
-- TABLE: orders
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can read their own orders
DROP POLICY IF EXISTS "orders: owner select" ON orders;
CREATE POLICY "orders: owner select"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all orders
DROP POLICY IF EXISTS "orders: admin select all" ON orders;
CREATE POLICY "orders: admin select all"
  ON orders FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- Delivery agents can read orders assigned to them
DROP POLICY IF EXISTS "orders: assigned delivery read" ON orders;
CREATE POLICY "orders: assigned delivery read"
  ON orders FOR SELECT
  USING (auth.uid() = assigned_to);

-- Delivery agents can update status on orders assigned to them
DROP POLICY IF EXISTS "orders: assigned delivery update" ON orders;
CREATE POLICY "orders: assigned delivery update"
  ON orders FOR UPDATE
  USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

-- Admins can update any order (status changes, assignment)
DROP POLICY IF EXISTS "orders: admin update" ON orders;
CREATE POLICY "orders: admin update"
  ON orders FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- No client INSERT — all inserts go through /api/orders/create (service role)


-- ============================================================
-- TABLE: wallet
-- ============================================================
ALTER TABLE wallet ENABLE ROW LEVEL SECURITY;

-- Users can read their own wallet balance
DROP POLICY IF EXISTS "wallet: owner select" ON wallet;
CREATE POLICY "wallet: owner select"
  ON wallet FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all wallets
DROP POLICY IF EXISTS "wallet: admin select all" ON wallet;
CREATE POLICY "wallet: admin select all"
  ON wallet FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- NO client UPDATE on wallet — all balance changes go through
-- server-side API routes (cron, admin routes) using the service role key.
-- This prevents users from crediting their own wallet from the browser console.


-- ============================================================
-- TABLE: wallet_transactions
-- ============================================================
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own transaction history
DROP POLICY IF EXISTS "wallet_transactions: owner select" ON wallet_transactions;
CREATE POLICY "wallet_transactions: owner select"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can read all transactions
DROP POLICY IF EXISTS "wallet_transactions: admin select all" ON wallet_transactions;
CREATE POLICY "wallet_transactions: admin select all"
  ON wallet_transactions FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
  );

-- NO client INSERT/UPDATE/DELETE — all transaction records are written
-- by server-side cron/API routes using the service role key.
