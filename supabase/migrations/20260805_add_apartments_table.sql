-- Structured apartments entity, replacing free-text-only apartment_name for filtering/
-- dropdown purposes. apartment_name stays as-is (still written, still read by ~15
-- consumers across the app) and is kept in sync with the chosen apartment's name when a
-- real apartment is picked; individual houses keep free text with apartment_id = null.
create table apartments (
  id serial primary key,
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table apartments enable row level security;

create policy "Public read active apartments"
  on apartments for select
  using (is_active = true);

create policy "Admins manage apartments"
  on apartments for all
  using (public.is_admin_user())
  with check (public.is_admin_user());

insert into apartments (name) values ('Sattva Exotic'), ('Bollineni Astra'), ('Balaji Apartment');

alter table profiles add column apartment_id integer references apartments(id) on delete set null;

-- Best-effort backfill from the existing messy free text — anything that doesn't match
-- stays NULL (individual house / unmatched), not guessed.
update profiles set apartment_id = (select id from apartments where name = 'Sattva Exotic')
  where apartment_name ilike '%sattva%';
update profiles set apartment_id = (select id from apartments where name = 'Bollineni Astra')
  where apartment_name ilike '%bollineni%';
update profiles set apartment_id = (select id from apartments where name = 'Balaji Apartment')
  where apartment_name ilike '%balaji%';
