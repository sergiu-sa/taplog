-- Each habit's target by Oslo day, so changing a target scores only the days from then on.
-- habits.daily_target stays the current target; the trigger below records every value it takes.
create table habit_targets (
  habit_id  bigint not null references habits (id) on delete cascade,
  -- No foreign key, as on logs: rows go with their habit, which cascades from its owner.
  user_id   uuid not null,
  from_day  date not null,
  target    int  not null,
  primary key (habit_id, from_day)
);

create index habit_targets_user_id_idx on habit_targets (user_id);

grant select on habit_targets to authenticated, service_role;

alter table habit_targets enable row level security;

create policy "read own targets" on habit_targets for select to authenticated
  using (user_id = (select auth.uid()));

-- History starts today. Days before a habit's first row take that row's target
-- (targetOn in lib/habits.ts), since nothing earlier was recorded.
insert into habit_targets (habit_id, user_id, from_day, target)
select id, user_id, (now() at time zone 'Europe/Oslo')::date, daily_target
from habits;

-- Runs as its owner, so a session allowed to edit a habit still can't write history directly.
-- A second change on the same Oslo day replaces the first.
create function record_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- update of daily_target fires whenever the column is in the SET list, even unchanged.
  if tg_op = 'UPDATE' and new.daily_target = old.daily_target then
    return null;
  end if;
  insert into public.habit_targets (habit_id, user_id, from_day, target)
  values (new.id, new.user_id, (now() at time zone 'Europe/Oslo')::date, new.daily_target)
  on conflict (habit_id, from_day) do update set target = excluded.target;
  return null;
end $$;

revoke execute on function record_target() from public, anon, authenticated, service_role;

-- On insert too, so a habit made later starts with its first row.
create trigger record_target after insert or update of daily_target on habits
  for each row execute function record_target();
