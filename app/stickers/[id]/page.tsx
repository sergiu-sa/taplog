import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { osloDay } from "@/lib/habits";
import { loginPath } from "@/lib/login";
import { createClient } from "@/lib/supabase/server";
import { readTheme } from "@/lib/theme";
import { addDevice, moveSticker, newLink, removeDevice, removeSticker, renameSticker, setArchived, signOut, signOutEverywhere } from "../../actions";
import { toStickerView } from "../../detail-view";
import { StickerPage } from "../../stickers";

// Shared by the page and its title; RLS makes someone else's sticker read as missing, and
// anon has no grant on stickers, so check first.
const loadSticker = cache(async (id: number) => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) return null;
  const { data } = await supabase.from("stickers").select("id, label, last_tap_at, habit_id").eq("id", id).maybeSingle().throwOnError();
  return data;
});

export async function generateMetadata({ params }: PageProps<"/stickers/[id]">): Promise<Metadata> {
  const id = Number((await params).id);
  const sticker = Number.isSafeInteger(id) ? await loadSticker(id) : null;
  return { title: sticker?.label ?? "Not found" };
}

// Where a tap lands when its sticker has no habit, or an archived one, as well as the page
// the habit's sticker list opens.
export default async function Sticker({ params }: PageProps<"/stickers/[id]">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect(loginPath(`/stickers/${(await params).id}`));

  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [sticker, { data: habits }, { count }] = await Promise.all([
    loadSticker(id),
    supabase.from("habits").select("id, name, kind, period, color, archived_at, habit_targets(from_day, target)").order("name").throwOnError(),
    supabase.from("logs").select("*", { count: "exact", head: true }).eq("sticker_id", id).throwOnError(),
  ]);
  if (!sticker) notFound();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const today = osloDay(Date.now());
  const view = toStickerView({ ...sticker, taps: count ?? 0 }, habits, today);
  const { habit } = view;

  return (
    <StickerPage
      view={view}
      backHref={habit ? `/h/${habit.id}` : "/"}
      newHref="/habits/new"
      move={moveSticker.bind(null, id)}
      rename={renameSticker.bind(null, id)}
      newLink={newLink.bind(null, id)}
      remove={removeSticker.bind(null, id)}
      restore={habit?.archived ? setArchived.bind(null, habit.id, false) : undefined}
      frame={{ theme: await readTheme(), signOut, signOutEverywhere, addDevice, removeDevice }}
    />
  );
}
