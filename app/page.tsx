import type { Metadata } from "next";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { osloDay } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { Dashboard, toHabitView } from "./dashboard";

export const metadata: Metadata = { title: "Today" };

// A Server Action is its own POST endpoint, so the page's auth check doesn't cover it.
async function addLog(habitId: number) {
  "use server";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/login");

  // The argument arrives from the client as whatever it sent, not the declared type.
  if (!Number.isSafeInteger(habitId)) return;
  await supabase.from("logs").insert({ habit_id: habitId, source: "manual" }).throwOnError();
  refresh();
}

export default async function Page() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/login");

  // Loads every logged day per habit. PostgREST caps a response at max_rows
  // (1000 by default); move streaks into SQL before a habit has years of days.
  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, kind, color, daily_counts(day, count), habit_targets(from_day, target)")
    .order("name")
    .throwOnError();

  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const today = osloDay(Date.now());

  return <Dashboard today={today} habits={habits.map((h) => toHabitView(h, today))} add={addLog} />;
}
