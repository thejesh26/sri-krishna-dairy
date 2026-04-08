-- ============================================================
-- Fix: Restrict profiles UPDATE policy to non-sensitive columns.
-- Prevents clients from changing is_admin, loyalty_points,
-- streak_count, badges, or referral_code via the anon key.
-- All sensitive fields are written server-side (service role).
-- ============================================================

-- Allow any authenticated user to read a profile row only to validate a referral code.
-- This is the minimum exposure needed for referral lookups at signup.
-- Only the 'id' column is actually used by the query, but RLS can't restrict columns.
DROP POLICY IF EXISTS "profiles: referral code lookup" ON profiles;
CREATE POLICY "profiles: referral code lookup"
  ON profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND referral_code IS NOT NULL
  );

-- Fix referral INSERT policy:
-- 1. referred_id must be the current user (you can only create your own referral)
-- 2. referrer_id must be a real profile (no pointing to random UUIDs)
-- 3. Cannot refer yourself
DROP POLICY IF EXISTS "Users create referral on signup" ON referrals;
CREATE POLICY "Users create referral on signup"
  ON referrals FOR INSERT
  WITH CHECK (
    referred_id = auth.uid()
    AND referrer_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = referrer_id
    )
  );

DROP POLICY IF EXISTS "profiles: owner update" ON profiles;

CREATE POLICY "profiles: owner update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Sensitive fields must not change via client
    AND is_admin         IS NOT DISTINCT FROM (SELECT is_admin         FROM profiles WHERE id = auth.uid())
    AND loyalty_points   IS NOT DISTINCT FROM (SELECT loyalty_points   FROM profiles WHERE id = auth.uid())
    AND streak_count     IS NOT DISTINCT FROM (SELECT streak_count     FROM profiles WHERE id = auth.uid())
    AND badges           IS NOT DISTINCT FROM (SELECT badges           FROM profiles WHERE id = auth.uid())
    AND referral_code    IS NOT DISTINCT FROM (SELECT referral_code    FROM profiles WHERE id = auth.uid())
  );
