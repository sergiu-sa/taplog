begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');
insert into habits (id, user_id, name, kind, daily_target) overriding system value values
  (9401, '00000000-0000-0000-0000-00000000000a', 'A water', 'goal', 8),
  (9402, '00000000-0000-0000-0000-00000000000b', 'B water', 'goal', 8);

select is((select remind from habits where id = 9401), true, 'a habit reminds unless it is turned off');
select is((select reminded_at from habits where id = 9401), null, 'and has never nudged');

-- A subscription's keys in the browser's shape: 87 and 22 base64url characters.
create function pg_temp.sub(endpoint text, p256dh text default repeat('A', 87), auth text default repeat('b', 22))
returns text language sql as $$
  select format('insert into push_subscriptions (endpoint, p256dh, auth) values (%L, %L, %L)', endpoint, p256dh, auth)
$$;

-- Signed in as A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select lives_ok(pg_temp.sub('https://web.push.apple.com/QA-phone'), 'A subscribes on Apple''s push host');
select is((select user_id from push_subscriptions), '00000000-0000-0000-0000-00000000000a'::uuid, 'and the row is A''s');
select lives_ok(pg_temp.sub('https://fcm.googleapis.com/fcm/send/QA-mac'), 'and on Google''s');
select throws_ok(pg_temp.sub('http://web.push.apple.com/x'), '23514', null, 'plain http is refused');
select throws_ok(pg_temp.sub('https://evil.example/x'), '23514', null, 'another host is refused');
select throws_ok(pg_temp.sub('https://web.push.apple.com.evil.example/x'), '23514', null, 'a host that only starts like Apple''s is refused');
select throws_ok(pg_temp.sub('https://evil.example/web.push.apple.com/'), '23514', null, 'Apple''s host in the path is refused');
select throws_ok(pg_temp.sub('https://web.push.apple.com@evil.example/x'), '23514', null, 'Apple''s host as a user name is refused');
select throws_ok(pg_temp.sub('https://fcm.googleapis.com.evil.example/x'), '23514', null, 'a host that only starts like Google''s is refused');
select throws_ok(pg_temp.sub('https://web.push.apple.com:8443/x'), '23514', null, 'another port is refused');
select throws_ok(pg_temp.sub('https://web.push.apple.com/k', repeat('A', 86)), '23514', null, 'a short key is refused');
select throws_ok(pg_temp.sub('https://web.push.apple.com/k', repeat('A', 87), repeat('+', 22)), '23514', null, 'a secret that isn''t base64url is refused');
select throws_ok(pg_temp.sub('https://web.push.apple.com/QA-phone'), '23505', null, 'the same endpoint twice is refused');
select throws_ok(
  $$ insert into push_subscriptions (user_id, endpoint, p256dh, auth)
     values ('00000000-0000-0000-0000-00000000000b', 'https://web.push.apple.com/for-b', repeat('A', 87), repeat('b', 22)) $$,
  '42501', null, 'A cannot file a subscription under B'
);
select throws_ok($$ update push_subscriptions set endpoint = 'https://web.push.apple.com/moved' $$, '42501', null, 'a subscription is never edited');

select lives_ok($$ update habits set remind = false where id = 9401 $$, 'A turns a habit''s reminders off');
select is((select remind from habits where id = 9401), false, 'and it stays off');
select throws_ok($$ update habits set reminded_at = now() where id = 9401 $$, '42501', null, 'a session cannot set when a habit last nudged');

-- Signed in as B
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated"}', true);
select is((select count(*)::int from push_subscriptions), 0, 'B sees none of A''s subscriptions');
delete from push_subscriptions;
update habits set remind = true where id = 9401;
select throws_ok(pg_temp.sub('https://web.push.apple.com/QA-phone'), '23505', null, 'an endpoint belongs to one account');
reset role;
select is((select count(*)::int from push_subscriptions), 2, 'B cannot remove A''s subscriptions');
select is((select remind from habits where id = 9401), false, 'B cannot turn A''s reminders back on');

set local role anon;
select throws_ok($$ select 1 from push_subscriptions $$, '42501', null, 'signed out, the table is closed');

-- The reminder route's role
set local role service_role;
select is((select count(*)::int from push_subscriptions), 2, 'the route reads every subscription');
select lives_ok($$ update habits set reminded_at = now() where id = 9401 $$, 'and stamps a nudge');
select throws_ok($$ update habits set remind = true where id = 9401 $$, '42501', null, 'but cannot flip the owner''s switch');
select throws_ok(pg_temp.sub('https://web.push.apple.com/from-route'), '42501', null, 'or add a subscription');
select lives_ok($$ delete from push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/QA-mac' $$, 'it prunes a dead one');
reset role;

delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select is((select count(*)::int from push_subscriptions), 0, 'a deleted account takes its subscriptions along');

-- The job. Nothing here is ever sent: pg_net posts after a commit, and this rolls back.
select is((select schedule from cron.job where jobname = 'reminders'), '*/15 * * * *', 'the job runs every 15 minutes');
delete from vault.secrets where name in ('remind_url', 'cron_secret');
select is_empty((select command from cron.job where jobname = 'reminders'), 'with no address or secret in Vault it sends nothing');
select vault.create_secret('https://taplog.test/api/remind', 'remind_url');
select vault.create_secret('qa-cron-secret', 'cron_secret');
select isnt_empty((select command from cron.job where jobname = 'reminders'), 'with both it sends one request');
select results_eq(
  $$ select url, headers ->> 'Authorization', timeout_milliseconds from net.http_request_queue order by id desc limit 1 $$,
  $$ values ('https://taplog.test/api/remind', 'Bearer qa-cron-secret', 20000) $$,
  'to that address, with the secret as a bearer token'
);

select * from finish();
rollback;
