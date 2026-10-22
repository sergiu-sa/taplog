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

update habits set daily_target = 15 where slug = 'smokes';

-- Five weeks of taps between 07:00 and 22:00 Oslo time; today's stop at the current time.
with days as (
  select h.slug, d, h.lo + floor(random() * (h.hi - h.lo + 1))::int as n
  from (values ('water', 3, 10), ('smokes', 5, 18), ('move', 0, 2)) as h (slug, lo, hi)
  cross join generate_series(0, 34) as d
),
taps as (
  select slug,
         ((now() at time zone 'Europe/Oslo')::date - d + time '07:00' + random() * interval '15 hours')
           at time zone 'Europe/Oslo' as created_at,
         case when random() < 0.7 then 'nfc' else 'manual' end as source
  from days
  cross join lateral generate_series(1, days.n)
)
insert into logs (habit_slug, created_at, source)
select slug, created_at, source from taps
where created_at <= now();
