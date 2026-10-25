-- Taps can be removed and added after the fact from the habit page.

-- Any of your own taps, sticker or by hand: removing a stray sticker tap is the main use.
-- Undo after a removal inserts the row again; nothing is kept once a tap is gone.
grant delete on logs to authenticated;

create policy "remove own logs" on logs for delete to authenticated
  using (user_id = (select auth.uid()));

-- "Add one at" and Undo after a removal set the time. The column default is the same
-- now(), so a +1 without a time still passes the check.
grant insert (created_at) on logs to authenticated;

alter policy "add own manual logs" on logs
  with check (
    source = 'manual'
    and user_id = (select auth.uid())
    and habit_id in (select id from habits where user_id = (select auth.uid()))
    and created_at <= now()
  );
