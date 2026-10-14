-- This project came with the old default that auto-grants everything in public to the
-- Data API roles. Opt out so only the explicit grants below exist (Supabase's documented opt-in).
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public;

create table habits (
  slug          text primary key,
  name          text not null,
  kind          text not null check (kind in ('goal', 'limit')),
  daily_target  int  not null,
  color         text not null default '#888888',
  created_at    timestamptz not null default now()
);

create table logs (
  id          bigint generated always as identity primary key,
  habit_slug  text not null references habits(slug),
  created_at  timestamptz not null default now(),
  source      text not null default 'nfc' check (source in ('nfc', 'manual')),
  tag_uid     text            -- null until phase 5 (self-identifying tags)
);

create index logs_habit_created_idx on logs (habit_slug, created_at desc);

-- "Today" is always Europe/Oslo, never UTC.
-- Views run as their owner and skip RLS unless security_invoker is set.
create view daily_counts with (security_invoker = true) as
select habit_slug,
       (created_at at time zone 'Europe/Oslo')::date as day,
       count(*) as count
from logs
group by 1, 2;

-- Each role gets exactly what it uses. anon gets nothing.
grant select on habits, logs, daily_counts to authenticated;
grant select on habits, daily_counts to service_role;
grant select, insert, delete on logs to service_role;

alter table habits enable row level security;
alter table logs   enable row level security;

-- Single user: sign-ups disabled in Supabase Auth, so "authenticated" = you
create policy "read habits" on habits for select to authenticated using (true);
create policy "read logs"   on logs   for select to authenticated using (true);
-- No insert/delete policies: writes happen only server-side with the secret key

insert into habits (slug, name, kind, daily_target, color) values
  ('water',  'Water',  'goal',  8, '#3B82F6'),
  ('smokes', 'Smokes', 'limit', 10, '#F97316'),
  ('move',   'Move',   'goal',  1, '#22C55E');
