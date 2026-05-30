-- Admin notifications table.
-- Each row is one event shown in the admin notification bell.
CREATE TABLE IF NOT EXISTS admin_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,           -- 'new_subscription' | 'new_order' | 'wallet_request' | 'low_balance' | 'missed_delivery' | 'quality_report'
  title       text NOT NULL,
  body        text NOT NULL DEFAULT '',
  link_tab    text,                    -- admin page tab to open on click, e.g. 'customers', 'reports'
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins (via service role or is_admin check) can read/update
CREATE POLICY "admin_notifications: admin read"
  ON admin_notifications FOR SELECT
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

CREATE POLICY "admin_notifications: admin update"
  ON admin_notifications FOR UPDATE
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- Index for unread count queries
CREATE INDEX IF NOT EXISTS admin_notifications_is_read_idx ON admin_notifications (is_read, created_at DESC);
