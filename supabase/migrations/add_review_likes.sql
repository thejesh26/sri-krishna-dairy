-- Migration: Review Likes
-- Run in Supabase SQL Editor

-- 1. Denormalized like count on reviews (fast reads, no COUNT JOIN)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;

-- 2. Likes tracking table — composite PK enforces one like per user per review
CREATE TABLE IF NOT EXISTS review_likes (
  review_id  UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);

-- 3. Index: fast lookup of "what has this user liked?" (used on page load)
CREATE INDEX IF NOT EXISTS review_likes_user_idx ON review_likes (user_id);

-- 4. RLS: anyone can read likes (for counts), only owner can insert/delete their own
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON review_likes FOR SELECT USING (true);
CREATE POLICY "Auth insert own" ON review_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own" ON review_likes FOR DELETE USING (auth.uid() = user_id);
