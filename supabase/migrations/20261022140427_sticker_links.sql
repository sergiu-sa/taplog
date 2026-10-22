-- Every row gets an owner, so more users later is a policy change, not a rebuild.
-- Habits get numeric ids and each sticker its own random link, so renaming or deleting
-- a habit never breaks a sticker, and a leaked link exposes that one sticker only.

-- Existing rows need an owner. Production has exactly one user (sign-ups are off). A local
-- replay runs before seed.sql creates any user, so the init migration's habits go instead.
do $$
declare
  users int := (select count(*) from auth.users);
begin
  if users > 1 then
    raise exception 'sticker_links: % users, no way to tell who owns the existing rows', users;
  elsif users = 0 then
    delete from public.logs;
    delete from public.habits;
  end if;
end $$;

alter table habits
  add column id bigint generated always as identity,
  add column user_id uuid references auth.users (id) on delete cascade;
update habits set user_id = (select id from auth.users);

alter table logs
  add column habit_id bigint,
  add column user_id uuid,
  add column sticker_id bigint;
update logs set habit_id = h.id, user_id = h.user_id from habits h where h.slug = logs.habit_slug;

-- The view and the old foreign key hang on the slug columns, so they go first.
drop view daily_counts;
alter table logs drop column habit_slug, drop column tag_uid;
alter table habits drop column slug;

alter table habits
  add primary key (id),
  alter column user_id set not null,
  alter column user_id set default auth.uid();

create table stickers (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Nullable, so a sticker outlives a deleted habit and can be wired to another one.
  habit_id     bigint references habits (id) on delete set null,
  label        text not null,
  -- SHA-256 hex of the token in the sticker's /t/ link. The token itself is never stored.
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at   timestamptz not null default now(),
  last_tap_at  timestamptz
);

alter table logs
  alter column habit_id set not null,
  add foreign key (habit_id) references habits (id) on delete cascade,
  alter column user_id set not null,
  alter column user_id set default auth.uid(),
  add foreign key (sticker_id) references stickers (id) on delete set null;

create index habits_user_id_idx on habits (user_id);
create index logs_user_id_idx on logs (user_id);
create index logs_habit_created_idx on logs (habit_id, created_at desc);
create index logs_sticker_created_idx on logs (sticker_id, created_at desc);
create index stickers_user_id_idx on stickers (user_id);
create index stickers_habit_id_idx on stickers (habit_id);

create view daily_counts with (security_invoker = true) as
select habit_id,
       (created_at at time zone 'Europe/Oslo')::date as day,
       count(*) as count
from logs
group by 1, 2;

-- Dropping the view dropped its grants.
grant select on daily_counts to authenticated, service_role;
grant select on stickers to authenticated;
grant select, update (last_tap_at) on stickers to service_role;
-- A session can't backdate created_at, pick user_id or claim a sticker.
grant insert (habit_id, source) on logs to authenticated;

alter table stickers enable row level security;

drop policy "read habits" on habits;
drop policy "read logs" on logs;
drop policy "add manual logs" on logs;

create policy "read own habits" on habits for select to authenticated
  using (user_id = (select auth.uid()));
create policy "read own logs" on logs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "read own stickers" on stickers for select to authenticated
  using (user_id = (select auth.uid()));
-- Sticker taps come through tap() with the secret key, so a session only adds by hand.
create policy "add own manual logs" on logs for insert to authenticated
  with check (
    source = 'manual'
    and user_id = (select auth.uid())
    and habit_id in (select id from habits where user_id = (select auth.uid()))
  );

-- One round trip per tap. Stamping the sticker locks its row, so a second tap of it waits
-- until the first commits and the dedupe below sees it; checking then inserting raced.
create function tap(hash text)
returns table (log_id bigint, dup boolean)
language plpgsql
set search_path = ''
as $$
declare
  tapped record;
begin
  -- The log belongs to the habit's owner, read from the row as it is once locked.
  update public.stickers s
  set last_tap_at = now()
  from public.habits h
  where s.token_hash = hash and h.id = s.habit_id
  returning s.id, s.habit_id, h.user_id into tapped;
  -- Unknown, or not wired to a habit.
  if not found then
    return;
  end if;

  -- This sticker on its current habit only. Matching a +1 by hand or another sticker's tap
  -- would hand this tap's signed link, and its Undo, a row that a leaked link has no claim to.
  select l.id into log_id
  from public.logs l
  where l.sticker_id = tapped.id and l.habit_id = tapped.habit_id
    and l.created_at > now() - interval '30 seconds'
  order by l.created_at desc
  limit 1;
  dup := log_id is not null;

  if not dup then
    insert into public.logs (habit_id, user_id, sticker_id, source)
    values (tapped.habit_id, tapped.user_id, tapped.id, 'nfc')
    returning id into log_id;
  end if;
  return next;
end $$;

-- Returns the link's token once; only its hash is kept. Runs from the SQL editor until the
-- app can create stickers, so no API role may call it yet.
create function new_sticker(habit_id bigint, label text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  -- 16 random bytes as base64url without padding: 22 characters.
  token text := rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
begin
  insert into public.stickers (user_id, habit_id, label, token_hash)
  select h.user_id, h.id, new_sticker.label, encode(sha256(convert_to(token, 'UTF8')), 'hex')
  from public.habits h
  where h.id = new_sticker.habit_id;
  if not found then
    raise exception 'no habit with id %', new_sticker.habit_id;
  end if;
  return token;
end $$;

revoke execute on function tap(text), new_sticker(bigint, text) from public, anon, authenticated, service_role;
grant execute on function tap(text) to service_role;
