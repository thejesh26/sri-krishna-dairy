create table cron_invocations (
  id            bigserial primary key,
  job_name      text not null,
  run_date      date not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running',  -- running | success | error
  rows_affected int,
  error_detail  text,
  unique (job_name, run_date)
);

create index on cron_invocations (run_date desc);

alter table cron_invocations enable row level security;

-- No policies: only supabaseAdmin (service role) reads/writes this table, which bypasses RLS.
