import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { addDays, osloDay, osloTime } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { addLog, removeLog } from "../../actions";
import { toDetailView } from "../../detail-view";
import { HabitDetail } from "../../habit-detail";

// One query per request for the title and the page. RLS hides other people's habits, so
// someone else's id reads as missing. The title runs alongside the page's own auth check,
// and anon has no grant on habits, so signed out it must not query at all.
const loadHabit = cache(async (id: number) => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) return null;
  const { data } = await supabase
    .from("habits")
    .select("id, name, kind, color, daily_counts(day, count), habit_targets(from_day, target)")
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/h/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const habit = Number.isSafeInteger(id) ? await loadHabit(id) : null;
  return { title: habit?.name ?? "Not found" };
}

// A day the stepper or the heatmap asked for: a real date, never after today.
function pickDay(asked: string | string[] | undefined, today: string) {
  return typeof asked === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asked) && addDays(asked, 0) === asked && asked <= today ? asked : today;
}

export default async function HabitPage({ params, searchParams }: PageProps<"/h/[id]">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/login");

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const today = osloDay(now);
  const day = pickDay((await searchParams).day, today);

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
      view={toDetailView(habit, today, day, taps, recent.map((r) => r.created_at))}
      today={today}
      now={osloTime(now)}
      add={addLog}
      remove={removeLog}
    />
  );
}
