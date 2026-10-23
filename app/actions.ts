"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Logged = { id: number; createdAt: string };
export type Removed = { habitId: number; createdAt: string };

// "Add one at" sends an Oslo wall time; Undo after a removal sends the removed row's exact time.
const WALL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

// A Server Action is its own POST endpoint, so the page's auth check doesn't cover it.
async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) redirect("/login");
  return supabase;
}

// Arguments arrive as whatever the client sent, not the declared types, so each is checked.
export async function addLog(habitId: number, at?: string): Promise<Logged | null> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(habitId)) return null;
  let created_at: string | undefined;
  if (at !== undefined) {
    if (typeof at !== "string") return null;
    // Postgres resolves the zone name, DST included. The insert policy refuses a future time.
    if (WALL.test(at)) created_at = `${at.replace("T", " ")} Europe/Oslo`;
    else if (INSTANT.test(at)) created_at = at;
    else return null;
  }
  const { data } = await supabase
    .from("logs")
    .insert({ habit_id: habitId, source: "manual", created_at })
    .select("id, created_at")
    .single()
    .throwOnError();
  refresh();
  return { id: data.id, createdAt: data.created_at };
}

// RLS only lets a session delete its own rows; anyone else's id deletes nothing.
export async function removeLog(id: number): Promise<Removed | null> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(id)) return null;
  const { data } = await supabase.from("logs").delete().eq("id", id).select("habit_id, created_at").maybeSingle().throwOnError();
  refresh();
  return data && { habitId: data.habit_id, createdAt: data.created_at };
}
