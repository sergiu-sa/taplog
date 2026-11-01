begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- A has a weekly habit with a tap and a daily one without; B has one habit.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, period, daily_target) overriding system value values
  (9201, '00000000-0000-0000-0000-00000000000a', 'A gym', 'goal', 'week', 3),
  (9202, '00000000-0000-0000-0000-00000000000a', 'A floss', 'goal', 'day', 1),
  (9203, '00000000-0000-0000-0000-00000000000b', 'B gym', 'goal', 'week', 3);
insert into logs (habit_id, user_id, source) values (9201, '00000000-0000-0000-0000-00000000000a', 'manual');

select ok(
  not (has_function_privilege('anon', 'lock_scoring()', 'execute')
       or has_function_privilege('authenticated', 'lock_scoring()', 'execute')
       or has_function_privilege('service_role', 'lock_scoring()', 'execute')),
  'no API role may call lock_scoring()'
);

-- Signed in as A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into habits (name, kind, daily_target) values ('A water', 'goal', 8) $$,
  'A makes a habit without naming a period'
);
select is((select period from habits where name = 'A water'), 'day', 'and it counts by the day');
select lives_ok(
  $$ insert into habits (name, kind, period, daily_target) values ('A takeaway', 'limit', 'week', 2) $$,
  'A makes a weekly limit'
);
select throws_ok(
  $$ insert into habits (name, kind, period, daily_target) values ('A month', 'goal', 'month', 1) $$,
  '23514', null, 'a period other than day or week is refused'
);

select lives_ok($$ update habits set period = 'week' where id = 9202 $$, 'a period change passes before the first tap');
select throws_ok($$ update habits set period = 'day' where id = 9201 $$, '23514', null, 'and fails after it');
-- The editor sends every field on each save, the kind and period included.
select lives_ok(
  $$ update habits set name = 'A gym bag', kind = 'goal', period = 'week', daily_target = 4 where id = 9201 $$,
  'a save that leaves the kind and period as they are passes after the first tap'
);
select lives_ok(
  $$ delete from logs where habit_id = 9201 $$,
  'A removes every tap'
);
select lives_ok($$ update habits set period = 'day' where id = 9201 $$, 'and the period unlocks');

-- Signed in as B
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);
update habits set period = 'day' where id = 9202;
reset role;
select is((select period from habits where id = 9202), 'week', 'B cannot change A''s period');
set local role authenticated;
update habits set period = 'day' where id = 9203;
reset role;
select is((select period from habits where id = 9203), 'day', 'B changes its own');

select * from finish();
rollback;
