-- A limit can ask for time between taps. It paces and never scores (an early tap logs and
-- counts as usual), so unlike the kind and period it doesn't lock, and keeps no history.
alter table habits
  add column spacing_minutes int,
  add constraint habits_spacing_check check (
    spacing_minutes is null or (kind = 'limit' and spacing_minutes in (30, 45, 60, 90, 120, 180, 240))
  );

grant insert (spacing_minutes), update (spacing_minutes) on habits to authenticated;
