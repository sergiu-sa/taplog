"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { MAX_TARGET, minTarget } from "@/lib/habits";
import { PALETTE } from "@/lib/palette";
import { createClient } from "@/lib/supabase/server";

export type Logged = { id: number; createdAt: string };
export type Removed = { habitId: number; createdAt: string };
export type Saved = { error: string } | null;

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

// A new habit when id is null. The database checks the same rules and locks the kind once
// the habit has a tap; these checks only turn a refusal into a sentence.
export async function saveHabit(id: number | null, _prev: Saved, form: FormData): Promise<Saved> {
  const supabase = await signedIn();
  if (id !== null && !Number.isSafeInteger(id)) return { error: "That habit is gone." };
  const name = String(form.get("name") ?? "").trim();
  const kind = form.get("kind");
  const target = Number(form.get("target"));
  const color = form.get("color");
  if (!name || name.length > 40) return { error: "A name needs 1 to 40 characters." };
  if (kind !== "goal" && kind !== "limit") return { error: "Pick goal or limit." };
  if (!Number.isInteger(target) || target < minTarget(kind) || target > MAX_TARGET) {
    return { error: `The target runs from ${minTarget(kind)} to ${MAX_TARGET}.` };
  }
  if (!PALETTE.some((c) => c.hex === color)) return { error: "Pick a colour." };
  const fields = { name, kind, daily_target: target, color: color as string };

  const { data, error } =
    id === null
      ? await supabase.from("habits").insert(fields).select("id").single()
      : await supabase.from("habits").update(fields).eq("id", id).select("id").maybeSingle();
  if (error?.message.includes("kind is locked")) return { error: "The kind is locked after the first tap." };
  if (error) return { error: "Didn't save. Try again." };
  if (!data) return { error: "That habit is gone." };
  landOn(`/h/${data.id}`);
}

// Archive and Restore both land on the habit's page. A sentence comes back only if it failed.
export async function setArchived(id: number, archived: boolean): Promise<string | void> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(id) || typeof archived !== "boolean") return "That habit is gone.";
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return "Didn't save. Try again.";
  landOn(`/h/${id}`);
}

// Its taps and target history go with it; its stickers stay, with no habit.
export async function deleteHabit(id: number): Promise<string | void> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(id)) return "That habit is gone.";
  const { error } = await supabase.from("habits").delete().eq("id", id);
  if (error) return "Didn't save. Try again.";
  landOn("/");
}

// Every page already visited is stale after these, and Back would restore one from the client
// cache (a deleted habit, a coil on an archived one); revalidating refetches them. Replacing
// the editor's entry keeps Back from returning to a form that's been saved.
function landOn(path: string): never {
  revalidatePath("/", "layout");
  redirect(path, RedirectType.replace);
}
