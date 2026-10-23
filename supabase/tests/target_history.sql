begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target) overriding system value values
  (9001, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8),
  (9002, '00000000-0000-0000-0000-00000000000a', 'A smokes', 'limit', 10),
  (9003, '00000000-0000-0000-0000-00000000000b', 'B water', 'goal', 8);

-- As the SQL editor, where targets change until the app can edit habits
select results_eq(
  'select habit_id, user_id, from_day, target from habit_targets where habit_id > 9000 order by habit_id',
  $$ values
    (9001::bigint, '00000000-0000-0000-0000-00000000000a'::uuid, (now() at time zone 'Europe/Oslo')::date, 8),
    (9002, '00000000-0000-0000-0000-00000000000a', (now() at time zone 'Europe/Oslo')::date, 10),
    (9003, '00000000-0000-0000-0000-00000000000b', (now() at time zone 'Europe/Oslo')::date, 8) $$,
  'a new habit starts with its target from today, owned by its owner'
);

-- As if the habits were made ten days ago, so a change today is a new row.
update habit_targets set from_day = from_day - 10 where habit_id > 9000;

update habits set daily_target = 6 where id = 9002;
select results_eq(
  'select from_day, target from habit_targets where habit_id = 9002 order by from_day',
  $$ values ((now() at time zone 'Europe/Oslo')::date - 10, 10), ((now() at time zone 'Europe/Oslo')::date, 6) $$,
  'a new target applies from today and keeps the old one for earlier days'
);
update habits set daily_target = 7 where id = 9002;
select results_eq(
  'select from_day, target from habit_targets where habit_id = 9002 order by from_day',
  $$ values ((now() at time zone 'Europe/Oslo')::date - 10, 10), ((now() at time zone 'Europe/Oslo')::date, 7) $$,
  'a second change the same day replaces the first'
);
update habits set name = 'A water bottle' where id = 9001;
select is((select count(*)::int from habit_targets where habit_id = 9001), 1, 'a rename writes no target');

select ok(
  not (has_function_privilege('anon', 'record_target()', 'execute')
       or has_function_privilege('authenticated', 'record_target()', 'execute')
       or has_function_privilege('service_role', 'record_target()', 'execute')),
  'no API role may call record_target()'
);

-- Signed in as B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select results_eq('select habit_id from habit_targets where habit_id > 9000', 'values (9003::bigint)', 'B sees only its own targets');
select throws_ok(
  $$ insert into habit_targets (habit_id, user_id, from_day, target) values (9003, '00000000-0000-0000-0000-00000000000b', '2026-01-01', 1) $$,
  '42501', null, 'a session cannot add history'
);
select throws_ok($$ update habit_targets set target = 1 $$, '42501', null, 'or rewrite it');
select throws_ok($$ delete from habit_targets $$, '42501', null, 'or delete it');

-- Once a session may edit its own habits, the trigger still records the change.
reset role;
grant update (daily_target) on habits to authenticated;
create policy "edit own habits" on habits for update to authenticated
  using (user_id = (select auth.uid()));
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok($$ update habits set daily_target = 10 where id = 9001 $$, 'A changes its own target');
select results_eq(
  'select target from habit_targets where habit_id = 9001 order by from_day',
  'values (8), (10)',
  'and the history records it, though A cannot write history itself'
);
update habits set daily_target = 1 where id = 9003;
reset role;
select is((select daily_target from habits where id = 9003), 8, 'A cannot change a target of B');

-- The secret key, which /logged uses
set local role service_role;
select is((select count(*)::int from habit_targets where habit_id > 9000), 5, 'the secret key reads every target');

reset role;
delete from habits where id = 9003;
select is_empty('select 1 from habit_targets where habit_id = 9003', 'deleting a habit deletes its targets');

select * from finish();
rollback;
