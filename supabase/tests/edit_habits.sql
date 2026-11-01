begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- A has a habit with a tap and a sticker, and one with neither; B has one habit.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target) overriding system value values
  (9001, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8),
  (9002, '00000000-0000-0000-0000-00000000000a', 'A floss', 'goal', 1),
  (9003, '00000000-0000-0000-0000-00000000000b', 'B water', 'goal', 8);
insert into stickers (id, user_id, habit_id, label, token_hash) overriding system value values
  (9101, '00000000-0000-0000-0000-00000000000a', 9001, 'Bottle', encode(sha256('a-bottle'), 'hex')),
  (9102, '00000000-0000-0000-0000-00000000000a', 9002, 'Mirror', encode(sha256('a-mirror'), 'hex'));
insert into logs (habit_id, user_id, source) values (9001, '00000000-0000-0000-0000-00000000000a', 'manual');

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
  $$ insert into habits (name, kind, daily_target, color) values ('A read', 'goal', 3, '#8B5CF6') $$,
  'A makes a habit'
);
select is(
  (select user_id from habits where name = 'A read'),
  '00000000-0000-0000-0000-00000000000a'::uuid, 'and owns it'
);
select results_eq(
  $$ select from_day, target from habit_targets where habit_id = (select id from habits where name = 'A read') $$,
  $$ values ((now() at time zone 'Europe/Oslo')::date, 3) $$,
  'it starts with its target from today'
);
select throws_ok(
  $$ insert into habits (name, kind, daily_target, user_id) values ('For B', 'goal', 1, '00000000-0000-0000-0000-00000000000b') $$,
  '42501', null, 'a session cannot make a habit for someone else'
);
select throws_ok(
  $$ insert into habits (name, kind, daily_target, color) values ('Grey', 'goal', 1, '#888888') $$,
  '23514', null, 'a colour outside the palette is refused'
);
select throws_ok(
  $$ insert into habits (name, kind, daily_target) values ('Nothing', 'goal', 0) $$,
  '23514', null, 'a goal of 0 is refused'
);
select throws_ok(
  $$ insert into habits (name, kind, daily_target) values ('Lots', 'limit', 21) $$,
  '23514', null, 'a target past 20 is refused'
);
select lives_ok(
  $$ insert into habits (name, kind, daily_target) values ('None at all', 'limit', 0) $$,
  'a limit of 0 passes'
);
select throws_ok(
  $$ insert into habits (name, kind, daily_target) values (' ', 'goal', 1) $$,
  '23514', null, 'an empty name is refused'
);
select throws_ok(
  $$ insert into habits (name, kind, daily_target) values (' Padded', 'goal', 1) $$,
  '23514', null, 'and so is one with spaces around it'
);
select lives_ok(
  $$ update habits set name = 'A water bottle', daily_target = 6, color = '#0EA5E9' where id = 9001 $$,
  'A edits its own habit'
);
select throws_ok(
  $$ update habits set user_id = '00000000-0000-0000-0000-00000000000b' where id = 9001 $$,
  '42501', null, 'a session cannot hand a habit to someone else'
);

select lives_ok($$ update habits set kind = 'limit' where id = 9002 $$, 'a kind change passes before the first tap');
select throws_ok($$ update habits set kind = 'limit' where id = 9001 $$, '23514', null, 'and fails after it');
delete from logs where habit_id = 9001;
select lives_ok($$ update habits set kind = 'limit' where id = 9001 $$, 'until every tap is removed again');

select lives_ok($$ update habits set archived_at = now() where id = 9002 $$, 'A archives a habit');
select throws_ok(
  $$ insert into logs (habit_id, source) values (9002, 'manual') $$,
  '42501', null, 'an archived habit refuses a +1'
);

-- Signed in as B
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);
update habits set name = 'Taken', archived_at = now() where id = 9001;
delete from habits where id = 9001;
reset role;
select results_eq(
  'select name, archived_at is null from habits where id = 9001',
  $$ values ('A water bottle', true) $$,
  'B can neither edit, archive nor delete a habit of A'
);

-- The tap route, with the secret key
set local role service_role;
select results_eq(
  $$ select log_id, dup, sticker_id from tap(encode(sha256('a-mirror'), 'hex')) $$,
  $$ values (null::bigint, null::boolean, 9102::bigint) $$,
  'a sticker on an archived habit logs nothing and returns its id'
);
reset role;
update habits set archived_at = null where id = 9002;
set local role service_role;
select is((select dup from tap(encode(sha256('a-mirror'), 'hex'))), false, 'restored, it logs again');

-- Signed in as A: a habit goes with its taps and history; its stickers stay, unwired.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
insert into logs (habit_id, source) values (9001, 'manual');
select lives_ok($$ delete from habits where id = 9001 $$, 'A deletes its own habit');
reset role;
select is_empty('select 1 from logs where habit_id = 9001', 'its taps go with it');
select is_empty('select 1 from habit_targets where habit_id = 9001', 'and its target history');
select is((select habit_id from stickers where id = 9101), null, 'its sticker stays, with no habit');

select * from finish();
rollback;
