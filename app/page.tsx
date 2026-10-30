import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { osloDay } from "@/lib/habits";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { addLog, removeLog } from "./actions";
import { Dashboard, splitHabits } from "./dashboard";

export const metadata: Metadata = { title: "Today" };

export default async function Page() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/login");

  // Loads every logged day per habit. PostgREST caps a response at max_rows
  // (1000 by default); move streaks into SQL before a habit has years of days.
  const [{ data: habits }, { data: loose }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, kind, color, archived_at, daily_counts(day, count), habit_targets(from_day, target)")
      .order("name")
      .throwOnError(),
    supabase.from("stickers").select("id, name:label").is("habit_id", null).order("id").throwOnError(),
  ]);

  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const today = osloDay(Date.now());

  return <Dashboard today={today} {...splitHabits(habits, today)} loose={loose} add={addLog} remove={removeLog} theme={await readTheme()} />;
}
