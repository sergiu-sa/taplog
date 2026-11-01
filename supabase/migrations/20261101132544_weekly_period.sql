-- A habit counts by the Oslo day or by the Oslo week (Monday to Sunday). Weeks are summed
-- from daily_counts in lib/habits.ts, so the view stays per day.
alter table habits add column period text not null default 'day'
  constraint habits_period_check check (period in ('day', 'week'));

-- Kept under its old name: record_target() names the column in its body, and saveHabit writes it.
comment on column habits.daily_target is 'The target per period: a day or a week.';

grant insert (period), update (period) on habits to authenticated;

-- Switching day to week re-scores every day already logged, as a kind change would, so both
-- lock at the first tap. Runs as its owner, so it sees every log whatever the session may read.
drop trigger lock_kind on habits;
drop function lock_kind();

create function lock_scoring()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.kind <> old.kind or new.period <> old.period)
     and exists (select 1 from public.logs where habit_id = old.id) then
    raise exception 'habit % already has taps, so its kind and period are locked', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke execute on function lock_scoring() from public, anon, authenticated, service_role;

create trigger lock_scoring before update of kind, period on habits
  for each row execute function lock_scoring();
