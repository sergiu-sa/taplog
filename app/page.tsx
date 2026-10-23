import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { osloDay } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { addLog, removeLog } from "./actions";
import { Dashboard, toHabitView } from "./dashboard";

export const metadata: Metadata = { title: "Today" };

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

  return <Dashboard today={today} habits={habits.map((h) => toHabitView(h, today))} add={addLog} remove={removeLog} />;
}
