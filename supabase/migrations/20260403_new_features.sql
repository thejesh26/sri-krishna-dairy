-- ============================================================
-- Sri Krishnaa Dairy – Feature Migration (2026-04-03)
-- Features: Loyalty Points, Streak Badges, Referrals
-- ============================================================

-- 1. Add new columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- 2. Generate referral codes for existing users (first 8 chars of id, uppercased, alphanumeric)
UPDATE profiles
SET referral_code = UPPER(REPLACE(SUBSTRING(id::TEXT, 1, 8), '-', ''))
WHERE referral_code IS NULL;

-- 3. Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_type TEXT NOT NULL DEFAULT '500ml_4days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

-- 4. RLS for referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Note: referrals table is new in this migration so policies won't already exist
CREATE POLICY "Users see own referrals"
  ON referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users create referral on signup"
  ON referrals FOR INSERT
  WITH CHECK (referred_id = auth.uid());

CREATE POLICY "Admins manage referrals"
  ON referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- 5. Extend RLS on profiles so users can update loyalty/streak/badges via server only
--    (no client-side UPDATE allowed for these sensitive fields; server uses service role)
