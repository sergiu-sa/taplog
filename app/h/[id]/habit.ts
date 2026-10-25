import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Shared by a page and its title; RLS makes someone else's id read as missing. The title
// runs alongside the page's auth check, and anon has no grant on habits, so check first.
export const loadHabit = cache(async (id: number) => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) return null;
  const { data } = await supabase
    .from("habits")
    .select("id, name, kind, color, archived_at, daily_counts(day, count), habit_targets(from_day, target)")
    .eq("id", id)
    .maybeSingle()
    .throwOnError();
  return data;
});
