-- Add delivery tracking columns to addon_orders
ALTER TABLE addon_orders
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_by uuid REFERENCES auth.users(id);
