begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target) overriding system value values
  (9001, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8),
  (9003, '00000000-0000-0000-0000-00000000000b', 'B water', 'goal', 8);
insert into stickers (id, user_id, habit_id, label, token_hash) overriding system value values
  (9101, '00000000-0000-0000-0000-00000000000a', 9001, 'Bottle', encode(sha256('a-bottle'), 'hex'));
-- A sticker tap of A's on 20 Oct, 08:00 Oslo.
insert into logs (id, habit_id, user_id, sticker_id, source, created_at) overriding system value values
  (9201, 9001, '00000000-0000-0000-0000-00000000000a', 9101, 'nfc', '2026-10-20 08:00 Europe/Oslo');

-- Signed in as B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);

select lives_ok($$ delete from logs where id = 9201 $$, 'B may run a delete on a tap of A');
select throws_ok(
  $$ insert into logs (habit_id, source, created_at) values (9001, 'manual', now() - interval '1 day') $$,
  '42501', null, 'B cannot add a backdated tap to a habit of A'
);

-- Signed in as A
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select is((select count(*)::int from logs where id = 9201), 1, 'but it removes nothing');

select lives_ok($$ delete from logs where id = 9201 $$, 'A removes its own sticker tap');
select is_empty($$ select 1 from daily_counts where habit_id = 9001 and day = '2026-10-20' $$, 'and the day no longer counts it');

-- Undo re-inserts the row at the time it had.
select lives_ok(
  $$ insert into logs (habit_id, source, created_at) values (9001, 'manual', '2026-10-20 08:00 Europe/Oslo') $$,
  'Undo puts it back by hand at its old time'
);
select results_eq(
  $$ select count from daily_counts where habit_id = 9001 and day = '2026-10-20' $$,
  'values (1::bigint)', 'and the day counts it again'
);

-- "Add one at" sends an Oslo wall time; Postgres resolves the offset, DST included.
insert into logs (habit_id, source, created_at) values
  (9001, 'manual', '2026-10-22 09:15 Europe/Oslo'),
  (9001, 'manual', '2026-01-15 09:15 Europe/Oslo'),
  (9001, 'manual', '2026-10-01 00:30 Europe/Oslo');
select is((select count(*)::int from logs where created_at = '2026-10-22 07:15+00'), 1, '09:15 Oslo in summer time is 07:15 UTC');
select is((select count(*)::int from logs where created_at = '2026-01-15 08:15+00'), 1, '09:15 Oslo in winter time is 08:15 UTC');
select results_eq(
  $$ select day from daily_counts where habit_id = 9001 and day in ('2026-10-22', '2026-01-15', '2026-10-01', '2026-09-30') order by day $$,
  $$ values ('2026-01-15'::date), ('2026-10-01'), ('2026-10-22') $$,
  'each lands on its Oslo day, 00:30 too though UTC still says the day before'
);

select throws_ok(
  $$ insert into logs (habit_id, source, created_at) values (9001, 'manual', now() + interval '1 minute') $$,
  '42501', null, 'a tap in the future is refused'
);
select lives_ok($$ insert into logs (habit_id, source) values (9001, 'manual') $$, 'a +1 without a time still passes');
select throws_ok(
  $$ insert into logs (habit_id, source, created_at) values (9001, 'nfc', now() - interval '1 hour') $$,
  '42501', null, 'a session still cannot add a sticker tap, backdated or not'
);
select throws_ok(
  $$ insert into logs (habit_id, source, sticker_id) values (9001, 'manual', 9101) $$,
  '42501', null, 'nor claim a sticker'
);
select throws_ok(
  $$ update logs set created_at = now() - interval '1 day' where habit_id = 9001 $$,
  '42501', null, 'and cannot move a tap to another time'
);

reset role;
select is((select count(*)::int from logs where habit_id = 9003), 0, 'B''s habit got nothing from A');

select * from finish();
rollback;
