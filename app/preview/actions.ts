"use server";

import type { Logged, Removed, Saved } from "../actions";

// The preview's actions save nothing. The pause stands in for the round trip to the database,
// so the pending lock can be exercised, and the log line counts how often each ran.
const pause = () => new Promise((resolve) => setTimeout(resolve, 600));

export async function previewAdd(habitId: number, at?: string): Promise<Logged | null> {
  if (process.env.DESIGN_PREVIEW !== "1") return null;
  await pause();
  console.log(`preview +1 ${habitId}${at ? ` at ${at}` : ""}`);
  return { id: -Date.now(), createdAt: new Date().toISOString() };
}

export async function previewRemove(id: number): Promise<Removed | null> {
  if (process.env.DESIGN_PREVIEW !== "1") return null;
  await pause();
  console.log(`preview -1 ${id}`);
  return { habitId: 0, createdAt: new Date().toISOString() };
}

// Save, Archive, Restore and Delete in the preview: nothing to save and nowhere to go.
export async function previewSave(_prev: Saved, form: FormData): Promise<Saved> {
  if (process.env.DESIGN_PREVIEW !== "1") return null;
  await pause();
  console.log(`preview save ${form.get("name")} ${form.get("kind")} ${form.get("target")} ${form.get("color")}`);
  return null;
}

export async function previewDone(): Promise<string | void> {
  if (process.env.DESIGN_PREVIEW !== "1") return;
  await pause();
  console.log("preview archive, restore or delete");
}
