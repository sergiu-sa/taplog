-- Reminders: every 15 minutes the database calls the app, which pushes a nudge for each goal
-- behind its pace. The pace rule lives in the app (lib/habits.ts); this holds what it reads.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- remind is the owner's switch per habit. reminded_at is the last nudge, written only by the
-- app's reminder route, so a session can read it and never set it.
alter table habits
  add column remind boolean not null default true,
  add column reminded_at timestamptz;

grant insert (remind), update (remind) on habits to authenticated;
grant update (reminded_at) on habits to service_role;

-- One row per browser or home-screen app that allowed notifications. The server posts to
-- endpoint, so it may only ever be a push service: https, and Apple's or Google's host.
create table push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_check check (
    length(endpoint) <= 1000
    and (endpoint ~ '^https://([a-z0-9-]+\.)*push\.apple\.com/' or endpoint ~ '^https://fcm\.googleapis\.com/')
  ),
  -- A P-256 public key (65 bytes) and a 16-byte secret, base64url as the browser hands them over.
  constraint push_subscriptions_keys_check check (p256dh ~ '^[A-Za-z0-9_-]{87}$' and auth ~ '^[A-Za-z0-9_-]{22}$')
);

create index push_subscriptions_user_id_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

-- user_id comes from its default, so a session can't file a subscription under someone else.
grant select, delete on push_subscriptions to authenticated;
grant insert (endpoint, p256dh, auth) on push_subscriptions to authenticated;
-- The reminder route reads them and deletes one the push service says is gone.
grant select, delete on push_subscriptions to service_role;

create policy "read own subscriptions" on push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "add own subscriptions" on push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "remove own subscriptions" on push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- The address and the secret live in Vault (remind_url, cron_secret), set by hand per database.
-- Until both are there the join is empty and nothing is sent. Schedules are UTC; the app
-- decides what counts as waking hours in Oslo, so summer time needs no second job.
select cron.schedule('reminders', '*/15 * * * *', $job$
  select net.http_post(
    url := u.decrypted_secret,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    timeout_milliseconds := 20000
  )
  from vault.decrypted_secrets u, vault.decrypted_secrets s
  where u.name = 'remind_url' and s.name = 'cron_secret'
$job$);

-- pg_cron never trims its own run history.
select cron.schedule('reminders-history', '0 3 * * *', $job$
  delete from cron.job_run_details where end_time < now() - interval '7 days'
$job$);
