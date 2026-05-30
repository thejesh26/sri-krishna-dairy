-- Add pincode column to profiles table.
-- Safe to run multiple times (IF NOT EXISTS).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pincode text DEFAULT '';
