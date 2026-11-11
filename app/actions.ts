"use server";

import { isAuthApiError, isAuthSessionMissingError } from "@supabase/supabase-js";
import { refresh, revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { MAX_TARGET, minTarget, SPACINGS } from "@/lib/habits";
import { PALETTE } from "@/lib/palette";
import { createClient } from "@/lib/supabase/server";

export type Logged = { id: number; createdAt: string };
export type Removed = { habitId: number; createdAt: string };
export type Saved = { error: string } | null;
// A new sticker link, returned once, or why there isn't one.
export type Made = { link: string } | { error: string };

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

// A new habit when id is null. The database checks the same rules and locks kind and period once
// the habit has a tap; these checks only turn a refusal into a sentence.
export async function saveHabit(id: number | null, _prev: Saved, form: FormData): Promise<Saved> {
  const supabase = await signedIn();
  if (id !== null && !Number.isSafeInteger(id)) return { error: "That habit is gone." };
  const name = cleanName(form.get("name"));
  const kind = form.get("kind");
  const period = form.get("period");
  const target = Number(form.get("target"));
  const color = form.get("color");
  // The editor sends none for a goal (the database refuses one) or a limit of 0.
  const spacing = kind === "limit" && form.get("spacing") ? Number(form.get("spacing")) : null;
  if (!name) return { error: "A name needs 1 to 40 characters." };
  if (kind !== "goal" && kind !== "limit") return { error: "Pick goal or limit." };
  if (period !== "day" && period !== "week") return { error: "Pick a day or a week." };
  if (!Number.isInteger(target) || target < minTarget(kind) || target > MAX_TARGET) {
    return { error: `The target runs from ${minTarget(kind)} to ${MAX_TARGET}.` };
  }
  if (!PALETTE.some((c) => c.hex === color)) return { error: "Pick a colour." };
  if (spacing !== null && !SPACINGS.includes(spacing)) return { error: "Pick a spacing." };
  // daily_target holds the target per period, a week's too.
  const fields = { name, kind, period, daily_target: target, color: color as string, spacing_minutes: spacing, remind: form.get("remind") !== "off" };

  const { data, error } =
    id === null
      ? await supabase.from("habits").insert(fields).select("id").single()
      : await supabase.from("habits").update(fields).eq("id", id).select("id").maybeSingle();
  if (error?.message.includes("kind and period are locked")) return { error: "The kind and period are locked after the first tap." };
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

// Habit names and sticker labels: the database checks the same rule.
function cleanName(name: unknown) {
  const v = typeof name === "string" ? name.trim() : "";
  return v.length >= 1 && v.length <= 40 ? v : null;
}

// A tag keeps its link for good, so the link names production even when the sticker is made on
// a preview deployment. Locally there's only the server that was asked.
async function linkTo(token: string) {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return `${host ? `https://${host}` : (await headers()).get("origin")}/t/${token}`;
}

// The database keeps only the token's hash, so this is the one time the token is seen.
export async function addSticker(habitId: number, label: string): Promise<Made> {
  const supabase = await signedIn();
  const clean = cleanName(label);
  if (!Number.isSafeInteger(habitId)) return { error: "That habit is gone." };
  if (!clean) return { error: "A name needs 1 to 40 characters." };
  // new_sticker() raises no_data_found for a habit that's gone, someone else's or archived.
  const { data, error } = await supabase.rpc("new_sticker", { habit_id: habitId, label: clean });
  if (error?.code === "P0002") return { error: "That habit is gone." };
  if (error) return { error: "Didn't save. Try again." };
  revalidatePath("/", "layout");
  return { link: await linkTo(data) };
}

export async function renameSticker(id: number, label: string): Promise<string | void> {
  const supabase = await signedIn();
  const clean = cleanName(label);
  if (!Number.isSafeInteger(id)) return "That sticker is gone.";
  if (!clean) return "A name needs 1 to 40 characters.";
  return updateSticker(supabase, id, { label: clean });
}

// The policy refuses a habit that isn't the session's own.
export async function moveSticker(id: number, habitId: number): Promise<string | void> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(id) || !Number.isSafeInteger(habitId)) return "That sticker is gone.";
  return updateSticker(supabase, id, { habit_id: habitId });
}

async function updateSticker(supabase: Awaited<ReturnType<typeof signedIn>>, id: number, fields: { label?: string; habit_id?: number }) {
  const { data, error } = await supabase.from("stickers").update(fields).eq("id", id).select("id").maybeSingle();
  // The habit it was moved to was deleted after the page loaded.
  if (error?.code === "23503") return "That habit is gone.";
  if (error) return "Didn't save. Try again.";
  if (!data) return "That sticker is gone.";
  revalidatePath("/", "layout");
}

// The old link stops at once, so the sticker logs nothing until it holds the new one.
export async function newLink(id: number): Promise<Made> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(id)) return { error: "That sticker is gone." };
  const { data, error } = await supabase.rpc("new_link", { sticker_id: id });
  if (error?.code === "P0002") return { error: "That sticker is gone." };
  if (error) return { error: "Didn't save. Try again." };
  return { link: await linkTo(data) };
}

// Its taps stay, with no sticker, and read "Sticker" on their day.
export async function removeSticker(id: number): Promise<string | void> {
  const supabase = await signedIn();
  if (!Number.isSafeInteger(id)) return "That sticker is gone.";
  const { data, error } = await supabase.from("stickers").delete().eq("id", id).select("habit_id").maybeSingle();
  if (error) return "Didn't save. Try again.";
  if (!data) return "That sticker is gone.";
  landOn(data.habit_id ? `/h/${data.habit_id}` : "/");
}

// This browser only; the home-screen app keeps its own session. With an expired token and Auth
// out of reach, signOut() gives up before clearing anything, so then the cookies go by hand.
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) await forget();
  redirect("/login", RedirectType.replace);
}

const ALREADY = "This browser was already signed out, so other devices weren't. Sign out, sign in again, then try again.";

// One POST /logout?scope=global, this session included. admin.signOut() sends it without touching
// the cookies and passes every refusal on, where auth.signOut() clears them either way and reports
// a 401, 403 or 404 (this browser's session already ended) as done. So any failure leaves this
// browser signed in to say so. Auth checks the token itself, so the session is only read here.
export async function signOutEverywhere(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error: unread } = await supabase.auth.getSession();
  if (unread) return "Didn't sign out. Try again.";
  if (!data.session) return ALREADY;
  const { error } = await supabase.auth.admin.signOut(data.session.access_token, "global");
  // A 403 session_not_found arrives as a session-missing error, not an API error.
  if (isAuthSessionMissingError(error) || (isAuthApiError(error) && [401, 403, 404].includes(error.status))) return ALREADY;
  if (error) return "Didn't sign out. Try again.";
  await forget();
  redirect("/login", RedirectType.replace);
}

// Every Supabase cookie is named sb-<project>-auth-token…; theme is the app's only other one.
async function forget() {
  const jar = await cookies();
  for (const { name } of jar.getAll()) if (name.startsWith("sb-")) jar.delete(name);
}

// Every page already visited is stale after these, and Back would restore one from the client
// cache (a deleted habit, a coil on an archived one); revalidating refetches them. Replacing
// the editor's entry keeps Back from returning to a form that's been saved.
function landOn(path: string): never {
  revalidatePath("/", "layout");
  redirect(path, RedirectType.replace);
}
