-- Migration: Atomic like toggle RPC
-- Run in Supabase SQL Editor after add_review_likes.sql

CREATE OR REPLACE FUNCTION toggle_review_like(
  p_review_id UUID,
  p_user_id   UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_liked BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Single INSERT; ON CONFLICT means user already liked this review.
  -- FOUND is TRUE when the row was inserted, FALSE when suppressed by conflict.
  INSERT INTO review_likes (review_id, user_id)
  VALUES (p_review_id, p_user_id)
  ON CONFLICT (review_id, user_id) DO NOTHING;

  v_liked := FOUND;

  IF v_liked THEN
    -- New like: atomic increment on the same row
    UPDATE reviews
       SET like_count = like_count + 1
     WHERE id = p_review_id
       AND is_approved = TRUE
    RETURNING like_count INTO v_count;
  ELSE
    -- Already liked: remove the row, then atomically decrement
    DELETE FROM review_likes
     WHERE review_id = p_review_id
       AND user_id   = p_user_id;

    UPDATE reviews
       SET like_count = GREATEST(0, like_count - 1)
     WHERE id = p_review_id
       AND is_approved = TRUE
    RETURNING like_count INTO v_count;
  END IF;

  -- v_count is NULL when the review doesn't exist or is not approved.
  -- The whole function runs in a transaction, so the INSERT above is rolled back automatically.
  IF v_count IS NULL THEN
    RAISE EXCEPTION 'review_not_found';
  END IF;

  RETURN jsonb_build_object('liked', v_liked, 'like_count', v_count);
END;
$$;

-- Grant execute to authenticated users (called via service role, but safe to be explicit)
REVOKE ALL ON FUNCTION toggle_review_like(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION toggle_review_like(UUID, UUID) TO service_role;
