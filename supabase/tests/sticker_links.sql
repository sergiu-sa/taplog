begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- Two users. A has two habits with a sticker each, B has one habit. Fixed ids so the
-- statements below can name rows that the acting user isn't allowed to see.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target) overriding system value values
  (9001, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8),
  (9002, '00000000-0000-0000-0000-00000000000a', 'A smokes', 'limit', 10),
  (9003, '00000000-0000-0000-0000-00000000000b', 'B water', 'goal', 8);
insert into stickers (id, user_id, habit_id, label, token_hash) overriding system value values
  (9101, '00000000-0000-0000-0000-00000000000a', 9001, 'Bottle', encode(sha256('a-bottle'), 'hex')),
  (9102, '00000000-0000-0000-0000-00000000000a', 9002, 'Lighter', encode(sha256('a-lighter'), 'hex')),
  (9103, '00000000-0000-0000-0000-00000000000a', 9001, 'Work bottle', encode(sha256('a-work-bottle'), 'hex'));
insert into logs (habit_id, user_id, source) values (9001, '00000000-0000-0000-0000-00000000000a', 'manual');

-- Signed in as B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select results_eq('select id from habits', 'values (9003::bigint)', 'B sees only its own habit');
select is_empty('select 1 from logs', 'B sees none of the logs');
select is_empty('select 1 from daily_counts', 'B gets no counts');
select is_empty('select 1 from stickers', 'B sees none of the stickers');
select throws_ok(
  $$ insert into logs (habit_id, source) values (9001, 'manual') $$,
  '42501', null, 'B cannot log on a habit of A'
);

-- Signed in as A
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(
  $$ insert into logs (habit_id, source) values (9001, 'manual') $$,
  'A logs by hand on its own habit'
);
select is(
  (select count(*)::int from logs where user_id = '00000000-0000-0000-0000-00000000000a'),
  2, 'and owns the new row'
);
select results_eq('select count from daily_counts where habit_id = 9001', 'values (2::bigint)', 'A counts its own logs');
select throws_ok(
  $$ insert into logs (habit_id, source) values (9001, 'nfc') $$,
  '42501', null, 'a session cannot log a sticker tap'
);
select throws_ok(
  $$ insert into logs (habit_id, source, user_id) values (9001, 'manual', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'a session cannot set user_id'
);
select throws_ok(
  $$ insert into logs (habit_id, source, created_at) values (9001, 'manual', now() - interval '1 day') $$,
  '42501', null, 'a session cannot backdate a log'
);
select throws_ok($$ select * from tap('x') $$, '42501', null, 'a session cannot call tap()');
select throws_ok($$ select new_sticker(9001, 'x') $$, '42501', null, 'a session cannot call new_sticker()');

-- The tap route, which uses the secret key
reset role;
set local role service_role;

create temp table first_tap as select * from tap(encode(sha256('a-bottle'), 'hex'));
create temp table second_tap as select * from tap(encode(sha256('a-bottle'), 'hex'));
select is((select dup from first_tap), false, 'a tap logs');
select is((select count(*)::int from logs where sticker_id = 9101), 1, 'two taps within 30 s write one row');
select is((select log_id from second_tap), (select log_id from first_tap), 'the second tap returns the first row');
select is((select dup from second_tap), true, 'and says it was already counted');
select isnt((select last_tap_at from stickers where id = 9101), null, 'a tap stamps the sticker');
select is(
  (select dup from tap(encode(sha256('a-work-bottle'), 'hex'))),
  false, 'another sticker on the same habit is its own tap'
);

insert into logs (habit_id, user_id, source) values (9002, '00000000-0000-0000-0000-00000000000a', 'manual');
select is(
  (select dup from tap(encode(sha256('a-lighter'), 'hex'))),
  false, 'a manual log just before does not swallow a tap'
);
select is_empty($$ select * from tap(repeat('0', 64)) $$, 'an unknown sticker logs nothing');

-- Moving a sticker is a plain update today, done from the SQL editor.
reset role;
update stickers set habit_id = 9003 where id = 9101;
set local role service_role;
create temp table moved_tap as select * from tap(encode(sha256('a-bottle'), 'hex'));
select is((select dup from moved_tap), false, 'a sticker moved to another habit logs there at once');
select is(
  (select user_id from logs where id = (select log_id from moved_tap)),
  '00000000-0000-0000-0000-00000000000b'::uuid, 'and the row belongs to that habit''s owner'
);

-- Stickers made from the SQL editor
reset role;

create temp table made as select new_sticker(9003, 'Kitchen') as token;
select matches((select token from made), '^[A-Za-z0-9_-]{22}$', 'new_sticker returns a 22-character base64url token');
select results_eq(
  $$ select user_id, label from stickers where token_hash = encode(sha256(convert_to((select token from made), 'UTF8')), 'hex') $$,
  $$ values ('00000000-0000-0000-0000-00000000000b'::uuid, 'Kitchen') $$,
  'and stores only its hash, owned by the habit''s owner'
);
select is(
  (select dup from tap(encode(sha256(convert_to((select token from made), 'UTF8')), 'hex'))),
  false, 'its token taps through'
);

delete from habits where id = 9002;
select is_empty($$ select * from tap(encode(sha256('a-lighter'), 'hex')) $$, 'a sticker whose habit was deleted logs nothing');

select * from finish();
rollback;
