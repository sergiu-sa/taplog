import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { osloDay } from "@/lib/habits";
import { loginPath } from "@/lib/login";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { addDevice, deleteHabit, removeDevice, saveHabit, setArchived, signOut, signOutEverywhere } from "../../../actions";
import { toEditorView } from "../../../detail-view";
import { HabitEditor } from "../../../habit-editor";
import { loadHabit } from "../habit";

export async function generateMetadata({ params }: PageProps<"/h/[id]/edit">): Promise<Metadata> {
  const id = Number((await params).id);
  const habit = Number.isSafeInteger(id) ? await loadHabit(id) : null;
  return { title: habit ? `Edit ${habit.name}` : "Not found" };
}

export default async function EditHabit({ params }: PageProps<"/h/[id]/edit">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect(loginPath(`/h/${(await params).id}/edit`));

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const habit = await loadHabit(id);
  if (!habit) notFound();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const today = osloDay(Date.now());

  return (
    <HabitEditor
      habit={toEditorView(habit, today)}
      color={habit.color}
      backHref={`/h/${id}`}
      save={saveHabit.bind(null, id)}
      archive={setArchived.bind(null, id, !habit.archived_at)}
      remove={deleteHabit.bind(null, id)}
      frame={{ theme: await readTheme(), signOut, signOutEverywhere, addDevice, removeDevice }}
    />
  );
}
