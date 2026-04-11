-- Quality feedback on delivered orders
create table if not exists quality_feedback (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  issue text not null,
  reported_at timestamptz default now()
);

alter table quality_feedback enable row level security;

create policy "Customers can submit quality feedback"
  on quality_feedback for insert
  with check (auth.uid() = user_id);

create policy "Customers can view own feedback; admins can view all"
  on quality_feedback for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Admin-managed discount codes
create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent integer not null check (percent between 1 and 99),
  description text,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table discount_codes enable row level security;

-- All authenticated users can read active codes (needed for validation)
create policy "Authenticated users can read active discount codes"
  on discount_codes for select
  using (auth.role() = 'authenticated');

-- Only admins can insert/update/delete
create policy "Admins can manage discount codes"
  on discount_codes for all
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Bulk order enquiries from homepage form
create table if not exists bulk_enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  institution text,
  quantity text,
  message text,
  created_at timestamptz default now()
);

-- Enable RLS — only admins can read; anyone can insert (public form)
alter table bulk_enquiries enable row level security;

create policy "Public insert bulk enquiries"
  on bulk_enquiries for insert
  with check (true);

create policy "Admins can view bulk enquiries"
  on bulk_enquiries for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Missed delivery reports from customer dashboard
create table if not exists missed_delivery_reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  delivery_date date,
  reported_at timestamptz default now()
);

alter table missed_delivery_reports enable row level security;

-- Customers can insert their own reports
create policy "Customers can report their own orders"
  on missed_delivery_reports for insert
  with check (auth.uid() = user_id);

-- Customers can view their own reports; admins can view all
create policy "Customers can view own reports"
  on missed_delivery_reports for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );
