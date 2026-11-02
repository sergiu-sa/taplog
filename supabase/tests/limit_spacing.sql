begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- A has a limit with a tap and a goal without; B has a limit.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target) overriding system value values
  (9301, '00000000-0000-0000-0000-00000000000a', 'A smokes', 'limit', 15),
  (9302, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8),
  (9303, '00000000-0000-0000-0000-00000000000b', 'B smokes', 'limit', 10);
insert into logs (habit_id, user_id, source) values (9301, '00000000-0000-0000-0000-00000000000a', 'manual');

-- Signed in as A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok($$ update habits set spacing_minutes = 60 where id = 9301 $$, 'a limit with a tap takes a spacing');
select is((select spacing_minutes from habits where id = 9301), 60, 'and keeps it');
select throws_ok($$ update habits set spacing_minutes = 60 where id = 9302 $$, '23514', null, 'a goal cannot be spaced');
select throws_ok($$ update habits set spacing_minutes = 50 where id = 9301 $$, '23514', null, 'a spacing off the list is refused');
select throws_ok(
  $$ insert into habits (name, kind, daily_target, spacing_minutes) values ('A gum', 'goal', 1, 30) $$,
  '23514', null, 'a new goal cannot be spaced'
);
select lives_ok(
  $$ insert into habits (name, kind, daily_target, spacing_minutes) values ('A snacks', 'limit', 3, 30) $$,
  'A makes a spaced limit'
);
select lives_ok(
  $$ insert into habits (name, kind, period, daily_target, spacing_minutes) values ('A takeaway', 'limit', 'week', 2, 240) $$,
  'a weekly limit can be spaced too'
);
-- Before its first tap a limit may become a goal, but not while it's spaced.
select throws_ok($$ update habits set kind = 'goal' where name = 'A snacks' $$, '23514', null, 'a spaced limit cannot become a goal');
select lives_ok(
  $$ update habits set kind = 'goal', daily_target = 1, spacing_minutes = null where name = 'A snacks' $$,
  'with its spacing cleared it can'
);
-- A pace, not a rule: the second tap lands at the same instant as the first.
select lives_ok($$ insert into logs (habit_id, source) values (9301, 'manual') $$, 'a tap inside the spacing still logs');
select is((select count(*)::int from logs where habit_id = 9301), 2, 'and counts');
select lives_ok($$ update habits set spacing_minutes = 240 where id = 9301 $$, 'a limit with taps can change its spacing');

-- Signed in as B
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);
update habits set spacing_minutes = 30 where id = 9301;
update habits set spacing_minutes = 30 where id = 9303;
reset role;
select is((select spacing_minutes from habits where id = 9301), 240, 'B cannot change A''s spacing');
select is((select spacing_minutes from habits where id = 9303), 30, 'B changes its own');

select * from finish();
rollback;
