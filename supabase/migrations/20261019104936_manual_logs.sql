-- The dashboard's "+1" inserts through the signed-in session, so the database still
-- refuses it if the Server Action's own session check is ever missing.
-- Column grant: a session can't backdate created_at or set tag_uid.
grant insert (habit_slug, source) on logs to authenticated;

create policy "add manual logs" on logs for insert to authenticated
  with check (source = 'manual');
