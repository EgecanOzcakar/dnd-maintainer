-- Shared per-campaign dice roll log (replaces device-local history).
-- Same open-access model as the other tables (see 00001_initial_schema.sql); no auth yet.
create table roll_log (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns on delete cascade,
  character_id uuid null references characters on delete set null,
  label text,
  formula text,
  result integer,
  detail jsonb,
  created_at timestamptz default now()
);

create index roll_log_campaign_created_idx on roll_log (campaign_id, created_at desc);

alter table roll_log enable row level security;

create policy "Anon can select roll_log" on roll_log for select to anon, authenticated using (true);
create policy "Anon can insert roll_log" on roll_log for insert to anon, authenticated with check (true);

grant select, insert on roll_log to anon, authenticated;
