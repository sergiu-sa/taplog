begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

-- A has an active habit, an archived one, and stickers on both plus two with no habit; B has
-- a habit with a sticker. A's Bottle has a tap from an hour ago.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target, archived_at) overriding system value values
  (9001, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8, null),
  (9002, '00000000-0000-0000-0000-00000000000a', 'A guitar', 'goal', 1, now()),
  (9003, '00000000-0000-0000-0000-00000000000b', 'B water', 'goal', 8, null);
insert into stickers (id, user_id, habit_id, label, token_hash) overriding system value values
  (9101, '00000000-0000-0000-0000-00000000000a', 9001, 'Bottle', encode(sha256('a-bottle'), 'hex')),
  (9102, '00000000-0000-0000-0000-00000000000a', 9002, 'Stand', encode(sha256('a-stand'), 'hex')),
  (9103, '00000000-0000-0000-0000-00000000000a', null, 'Desk', encode(sha256('a-desk'), 'hex')),
  (9104, '00000000-0000-0000-0000-00000000000b', 9003, 'B bottle', encode(sha256('b-bottle'), 'hex')),
  (9105, '00000000-0000-0000-0000-00000000000a', null, 'Front door', encode(sha256('a-door'), 'hex'));
insert into logs (id, habit_id, user_id, sticker_id, source, created_at) overriding system value values
  (9201, 9001, '00000000-0000-0000-0000-00000000000a', 9101, 'nfc', now() - interval '1 hour');

select ok(
  not (has_function_privilege('anon', 'new_sticker(bigint, text)', 'execute')
       or has_function_privilege('anon', 'new_link(bigint)', 'execute')
       or has_function_privilege('service_role', 'new_sticker(bigint, text)', 'execute')
       or has_function_privilege('service_role', 'new_link(bigint)', 'execute')),
  'only a session may call new_sticker() and new_link()'
);
select ok(
  has_function_privilege('service_role', 'tap(text)', 'execute')
  and not (has_function_privilege('anon', 'tap(text)', 'execute')
           or has_function_privilege('authenticated', 'tap(text)', 'execute')),
  'tap() is still for the secret key alone'
);

-- Signed in as A. Tokens go through settings, which every role can read back.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select set_config('t.made', new_sticker(9001, 'Kitchen'), true);
select matches(current_setting('t.made'), '^[A-Za-z0-9_-]{22}$', 'A adds a sticker to its own habit and gets a 22-character token');
select results_eq(
  $$ select user_id, habit_id, label from stickers where token_hash = encode(sha256(convert_to(current_setting('t.made'), 'UTF8')), 'hex') $$,
  $$ values ('00000000-0000-0000-0000-00000000000a'::uuid, 9001::bigint, 'Kitchen') $$,
  'only its hash is kept, on that habit'
);
select throws_ok($$ select new_sticker(9003, 'x') $$, 'P0002', null, 'not on a habit of B');
select throws_ok($$ select new_sticker(9002, 'x') $$, 'P0002', null, 'nor on an archived habit');
select throws_ok($$ select new_sticker(9001, ' Desk') $$, '23514', null, 'a label with spaces around it is refused');
select throws_ok($$ select new_sticker(9001, repeat('x', 41)) $$, '23514', null, 'and so is one past 40 characters');

select lives_ok($$ update stickers set label = 'Water bottle' where id = 9101 $$, 'A renames its own sticker');
select lives_ok($$ update stickers set label = 'Music stand' where id = 9102 $$, 'even one on an archived habit');
select lives_ok($$ update stickers set habit_id = 9001 where id = 9103 $$, 'A moves a sticker with no habit to its own');
select throws_ok($$ update stickers set habit_id = 9003 where id = 9101 $$, '42501', null, 'but not to a habit of B');
select throws_ok($$ update stickers set label = '' where id = 9101 $$, '23514', null, 'an empty label is refused');
select throws_ok(
  $$ update stickers set token_hash = encode(sha256('mine'), 'hex') where id = 9101 $$,
  '42501', null, 'a session cannot write a hash itself'
);
select throws_ok(
  $$ update stickers set user_id = '00000000-0000-0000-0000-00000000000b' where id = 9101 $$,
  '42501', null, 'nor hand a sticker to someone else'
);
select throws_ok($$ update stickers set last_tap_at = now() where id = 9101 $$, '42501', null, 'nor stamp a tap');

select set_config('t.relinked', new_link(9101), true);
select is(
  (select token_hash from stickers where id = 9101),
  encode(sha256(convert_to(current_setting('t.relinked'), 'UTF8')), 'hex'),
  'new_link() gives A''s sticker a new token'
);
select throws_ok($$ select new_link(9104) $$, 'P0002', null, 'but not a sticker of B');

-- Signed in as B
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);
update stickers set label = 'Taken' where id = 9101;
delete from stickers where id = 9101;
reset role;
select is((select label from stickers where id = 9101), 'Water bottle', 'B can neither rename nor remove a sticker of A');

-- The tap route, with the secret key
set local role service_role;
select is_empty($$ select * from tap(encode(sha256('a-bottle'), 'hex')) $$, 'the old link stops at once');
select is(
  (select dup from tap(encode(sha256(convert_to(current_setting('t.relinked'), 'UTF8')), 'hex'))),
  false, 'and the new one logs'
);
create temp table desk_tap as select * from tap(encode(sha256('a-desk'), 'hex'));
select is(
  (select l.habit_id from logs l where l.id = (select log_id from desk_tap)),
  9001::bigint, 'a sticker the session moved logs to its new habit'
);
select results_eq(
  $$ select log_id, dup, sticker_id from tap(encode(sha256('a-door'), 'hex')) $$,
  $$ values (null::bigint, null::boolean, 9105::bigint) $$,
  'a sticker with no habit returns its id and no log'
);
reset role;
select is_empty('select 1 from logs where sticker_id = 9105', 'so the tap that asks is not logged');
select isnt((select last_tap_at from stickers where id = 9105), null, 'but it stamps the sticker');

-- Signed in as A, removing a sticker with taps
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);
select lives_ok($$ delete from stickers where id = 9101 $$, 'A removes its own sticker');
reset role;
select ok(
  not has_column_privilege('authenticated', 'logs', 'sticker_id', 'update'),
  'a session cannot update logs itself'
);
select results_eq(
  'select id, sticker_id from logs where id = 9201',
  $$ values (9201::bigint, null::bigint) $$,
  'yet the removed sticker''s taps stay, unlinked by the foreign key'
);

select * from finish();
rollback;
