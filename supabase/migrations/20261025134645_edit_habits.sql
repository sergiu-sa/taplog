-- Habits are made, edited, archived and deleted from the app. Every rule the form applies
-- also holds here, so a hand-made request can't get round it.

-- An archived habit keeps its history but takes no new taps.
alter table habits add column archived_at timestamptz;

-- The palette is lib/palette.ts, each colour checked for 3:1 on both grounds. Past 20 turns
-- the coil blurs; a limit of 0 means none at all, a goal of 0 would always be met.
alter table habits
  alter column color set default '#3B82F6',
  add constraint habits_color_check
    check (color in ('#F97316', '#F59E0B', '#22C55E', '#14B8A6', '#0EA5E9', '#3B82F6', '#8B5CF6', '#D946EF')),
  add constraint habits_daily_target_check
    check (daily_target between case kind when 'goal' then 1 else 0 end and 20),
  add constraint habits_name_check
    check (name = btrim(name) and length(name) between 1 and 40);

-- user_id comes from its default, so a session only ever makes habits for itself.
grant insert (name, kind, daily_target, color) on habits to authenticated;
grant update (name, kind, daily_target, color, archived_at) on habits to authenticated;
grant delete on habits to authenticated;

create policy "add own habits" on habits for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "edit own habits" on habits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "delete own habits" on habits for delete to authenticated
  using (user_id = (select auth.uid()));

-- Changing the kind would re-score every day already logged, so it locks at the first tap.
-- Runs as its owner, so the check sees every log on the habit whatever the session may read.
create function lock_kind()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> old.kind and exists (select 1 from public.logs where habit_id = old.id) then
    raise exception 'habit % already has taps, so its kind is locked', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke execute on function lock_kind() from public, anon, authenticated, service_role;

create trigger lock_kind before update of kind on habits
  for each row execute function lock_kind();

alter policy "add own manual logs" on logs
  with check (
    source = 'manual'
    and user_id = (select auth.uid())
    and habit_id in (select id from habits where user_id = (select auth.uid()) and archived_at is null)
    and created_at <= now()
  );

-- Same as before, except a sticker on an archived habit logs nothing, like one with no habit.
-- create or replace keeps the execute grant to service_role.
create or replace function tap(hash text)
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
  where s.token_hash = hash and h.id = s.habit_id and h.archived_at is null
  returning s.id, s.habit_id, h.user_id into tapped;
  -- Unknown, not wired to a habit, or wired to an archived one.
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
