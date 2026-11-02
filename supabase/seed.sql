-- Local only: `supabase db reset` runs this after the migrations, `supabase db push` never does.
-- Sign in at /login as dev@taplog.local; the code lands in the local mail viewer.

-- The empty token columns must be '' rather than null, or Auth fails to load the user.
insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, created_at, updated_at,
                        raw_app_meta_data, raw_user_meta_data,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001',
        'authenticated', 'authenticated', 'dev@taplog.local', now(), now(), now(),
        '{"provider": "email", "providers": ["email"]}', '{}', '', '', '', '');

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'email',
        '{"sub": "00000000-0000-0000-0000-000000000001", "email": "dev@taplog.local", "email_verified": true}',
        now(), now(), now());

insert into habits (user_id, name, kind, daily_target, color) values
  ('00000000-0000-0000-0000-000000000001', 'Water', 'goal', 8, '#3B82F6'),
  ('00000000-0000-0000-0000-000000000001', 'Smokes', 'limit', 15, '#F97316'),
  ('00000000-0000-0000-0000-000000000001', 'Move', 'goal', 1, '#22C55E');
update habits set spacing_minutes = 60 where name = 'Smokes';

-- The trigger gave each habit today's target. Smokes was 10 until two weeks ago, so the grid
-- shows older days scored on the old limit.
insert into habit_targets (habit_id, user_id, from_day, target)
select id, user_id, (now() at time zone 'Europe/Oslo')::date - v.ago, v.target
from habits, (values (35, 10), (14, 15)) as v (ago, target)
where name = 'Smokes';

-- Fixed tokens, so http://localhost:3000/t/local-water-sticker-01 logs a tap here.
insert into stickers (user_id, habit_id, label, token_hash)
select h.user_id, h.id, h.name || ' sticker', encode(sha256(convert_to(t.token, 'UTF8')), 'hex')
from habits h
join (values ('Water', 'local-water-sticker-01'), ('Smokes', 'local-smokes-sticker-1'), ('Move', 'local-move-sticker-001')) as t (name, token)
  using (name);

-- Five weeks of taps between 07:00 and 22:00 Oslo time; today's stop at the current time.
with days as (
  select h.id as habit_id, h.user_id, s.id as sticker_id, d, r.lo + floor(random() * (r.hi - r.lo + 1))::int as n
  from habits h
  join (values ('Water', 3, 10), ('Smokes', 5, 18), ('Move', 0, 2)) as r (name, lo, hi) using (name)
  join stickers s on s.habit_id = h.id
  cross join generate_series(0, 34) as d
),
taps as (
  select habit_id, user_id, sticker_id,
         ((now() at time zone 'Europe/Oslo')::date - d + time '07:00' + random() * interval '15 hours')
           at time zone 'Europe/Oslo' as created_at,
         random() < 0.7 as nfc
  from days
  cross join lateral generate_series(1, days.n)
)
insert into logs (habit_id, user_id, sticker_id, source, created_at)
select habit_id, user_id, case when nfc then sticker_id end, case when nfc then 'nfc' else 'manual' end, created_at
from taps
where created_at <= now();

-- Two weekly habits, logged by hand: a goal of three a week from a Thursday four weeks back,
-- so its first week starts midweek, and a limit of two a week with the odd week over.
insert into habits (user_id, name, kind, period, daily_target, color) values
  ('00000000-0000-0000-0000-000000000001', 'Gym', 'goal', 'week', 3, '#8B5CF6'),
  ('00000000-0000-0000-0000-000000000001', 'Takeaway', 'limit', 'week', 2, '#F59E0B');

-- isodow counts Monday as 1, so 24 + isodow days back is the Thursday four weeks before this one.
with taps as (
  select h.id as habit_id, h.user_id,
         ((now() at time zone 'Europe/Oslo')::date - d + time '17:00' + random() * interval '4 hours') at time zone 'Europe/Oslo' as created_at
  from habits h
  cross join generate_series(0, 34) as d
  where (h.name = 'Gym' and d <= 24 + extract(isodow from now() at time zone 'Europe/Oslo')::int and random() < 0.45)
     or (h.name = 'Takeaway' and random() < 0.3)
)
insert into logs (habit_id, user_id, source, created_at)
select habit_id, user_id, 'manual', created_at
from taps
where created_at <= now();
