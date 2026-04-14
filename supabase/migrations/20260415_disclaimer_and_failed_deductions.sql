-- Add disclaimer_accepted flag to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS disclaimer_accepted boolean DEFAULT false;

-- Table to track failed subscription deductions
CREATE TABLE IF NOT EXISTS failed_deductions (
  id serial primary key,
  user_id uuid references auth.users(id),
  subscription_id integer,
  amount numeric,
  reason text,
  created_at timestamp default now()
);

ALTER TABLE failed_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view failed deductions"
ON failed_deductions FOR SELECT USING (
  exists (select 1 from profiles
  where id = auth.uid() and is_admin = true)
);

CREATE POLICY "System can insert failed deductions"
ON failed_deductions FOR INSERT WITH CHECK (true);
