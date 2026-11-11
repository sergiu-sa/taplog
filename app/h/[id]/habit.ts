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
    .select("id, name, kind, period, color, archived_at, spacing_minutes, remind, daily_counts(day, count), habit_targets(from_day, target), stickers(id, label, last_tap_at), logs(created_at)")
    .eq("id", id)
    .order("id", { referencedTable: "stickers" })
    .order("created_at", { referencedTable: "logs", ascending: false })
    .limit(1, { referencedTable: "logs" })
    .maybeSingle()
    .throwOnError();
  return data;
});
