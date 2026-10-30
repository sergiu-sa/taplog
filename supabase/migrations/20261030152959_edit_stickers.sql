-- Stickers are added, renamed, moved, relinked and removed from the app. A sticker with no
-- habit, or on an archived one, asks which habit on its next tap instead of logging.

-- Same rule as habit names; the app trims before it saves.
alter table stickers
  add constraint stickers_label_check
    check (label = btrim(label) and length(label) between 1 and 40);

-- A session renames and moves its own stickers, and removes them. token_hash, user_id and
-- last_tap_at stay out of reach: a new link comes from new_link() below.
grant update (label, habit_id) on stickers to authenticated;
grant delete on stickers to authenticated;

-- No archived clause: renaming a sticker that sits on an archived habit must still work.
create policy "edit own stickers" on stickers for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (habit_id is null or habit_id in (select id from habits where user_id = (select auth.uid())))
  );
-- Its logs stay, their sticker_id set to null by the foreign key.
create policy "remove own stickers" on stickers for delete to authenticated
  using (user_id = (select auth.uid()));

-- Now also returns the sticker's id. With no habit, or an archived one, there's no log and
-- the route sends the owner to the sticker's page. A new return type needs a drop.
drop function tap(text);
create function tap(hash text)
returns table (log_id bigint, dup boolean, sticker_id bigint)
language plpgsql
set search_path = ''
as $$
declare
  tapped record;
  owner_id uuid;
begin
  -- One round trip per tap. Stamping the sticker locks its row, so a second tap of it waits
  -- until the first commits and the dedupe below sees it.
  update public.stickers s
  set last_tap_at = now()
  where s.token_hash = hash
  returning s.id, s.habit_id into tapped;
  if not found then
    return;
  end if;
  sticker_id := tapped.id;

  -- The log belongs to the habit's owner.
  select h.user_id into owner_id
  from public.habits h
  where h.id = tapped.habit_id and h.archived_at is null;
  if not found then
    return next;
    return;
  end if;

  -- This sticker on its current habit only. Matching a +1 by hand or another sticker's tap
  -- would hand this tap's signed link, and its Undo, a row that a leaked link has no claim to.
  select l.id into log_id
  from public.logs l
  where l.sticker_id = tapped.id and l.habit_id = tapped.habit_id
    and l.created_at > now() - interval '30 seconds'
  order by l.created_at desc
  limit 1;
  dup := log_id is not null;

  if not dup then
    insert into public.logs (habit_id, user_id, sticker_id, source)
    values (tapped.habit_id, owner_id, tapped.id, 'nfc')
    returning id into log_id;
  end if;
  return next;
end $$;

-- Both return the link's token once; only its hash is kept. They run as their owner so a
-- session never writes token_hash itself, which is why each checks auth.uid() by hand.
create or replace function new_sticker(habit_id bigint, label text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- 16 random bytes as base64url without padding: 22 characters.
  token text := rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
begin
  insert into public.stickers (user_id, habit_id, label, token_hash)
  select h.user_id, h.id, new_sticker.label, encode(sha256(convert_to(token, 'UTF8')), 'hex')
  from public.habits h
  where h.id = new_sticker.habit_id and h.user_id = (select auth.uid()) and h.archived_at is null;
  if not found then
    raise exception 'no habit % to add a sticker to', new_sticker.habit_id
      using errcode = 'no_data_found';
  end if;
  return token;
end $$;

-- The old link stops at once: tap() only knows the new hash.
create function new_link(sticker_id bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := rtrim(translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/', '-_'), '=');
begin
  update public.stickers s
  set token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex')
  where s.id = new_link.sticker_id and s.user_id = (select auth.uid());
  if not found then
    raise exception 'no sticker %', new_link.sticker_id
      using errcode = 'no_data_found';
  end if;
  return token;
end $$;

revoke execute on function tap(text), new_sticker(bigint, text), new_link(bigint)
  from public, anon, authenticated, service_role;
grant execute on function tap(text) to service_role;
grant execute on function new_sticker(bigint, text), new_link(bigint) to authenticated;
