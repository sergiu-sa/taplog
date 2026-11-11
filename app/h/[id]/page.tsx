import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { addDays, osloDay, osloTime } from "@/lib/habits";
import { loginPath } from "@/lib/login";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { addDevice, addLog, addSticker, removeDevice, removeLog, setArchived, signOut, signOutEverywhere } from "../../actions";
import { pickDay, toDetailView } from "../../detail-view";
import { HabitDetail } from "../../habit-detail";
import { loadHabit } from "./habit";

export async function generateMetadata({ params }: PageProps<"/h/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const habit = Number.isSafeInteger(id) ? await loadHabit(id) : null;
  return { title: habit?.name ?? "Not found" };
}

export default async function HabitPage({ params, searchParams }: PageProps<"/h/[id]">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const { day: asked } = await searchParams;
  if (!auth) redirect(loginPath(`/h/${(await params).id}${typeof asked === "string" ? `?day=${encodeURIComponent(asked)}` : ""}`));

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const today = osloDay(now);
  const day = pickDay(asked, today);

  // Postgres reads "<day> 00:00 Europe/Oslo" as that Oslo midnight, DST included.
  const [habit, { data: recent }, { data: taps }] = await Promise.all([
    loadHabit(id),
    // The hours strip: 1000 rows is PostgREST's cap, about 33 taps a day for 30 days.
    supabase
      .from("logs")
      .select("created_at")
      .eq("habit_id", id)
      .gte("created_at", `${addDays(today, -29)} 00:00 Europe/Oslo`)
      .order("created_at", { ascending: false })
      .limit(1000)
      .throwOnError(),
    supabase
      .from("logs")
      .select("id, created_at, source, stickers(label)")
      .eq("habit_id", id)
      .gte("created_at", `${day} 00:00 Europe/Oslo`)
      .lt("created_at", `${addDays(day, 1)} 00:00 Europe/Oslo`)
      .order("created_at")
      .throwOnError(),
  ]);
  if (!habit) notFound();

  return (
    <HabitDetail
      view={toDetailView(habit, today, day, taps, recent.map((r) => r.created_at), now)}
      today={today}
      now={osloTime(now)}
      editHref={`/h/${id}/edit`}
      add={addLog}
      remove={removeLog}
      restore={setArchived.bind(null, id, false)}
      addSticker={addSticker.bind(null, id)}
      frame={{ theme: await readTheme(), signOut, signOutEverywhere, addDevice, removeDevice }}
    />
  );
}
