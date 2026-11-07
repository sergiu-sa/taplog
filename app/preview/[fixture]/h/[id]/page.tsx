import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readTheme } from "@/lib/theme";
import { pickDay, toDetailView } from "../../../../detail-view";
import { HabitDetail } from "../../../../habit-detail";
import { previewAdd, previewRemove, previewDone, previewSignOut, previewSignOutEverywhere, previewToken } from "../../../actions";
import { fixtureRecent, fixtures, fixtureTaps, today, withNewest } from "../../../fixtures";

export async function generateMetadata({ params }: PageProps<"/preview/[fixture]/h/[id]">): Promise<Metadata> {
  const { fixture, id } = await params;
  return { title: (Object.hasOwn(fixtures, fixture) && fixtures[fixture].find((h) => h.id === Number(id))?.name) || "Not found" };
}

// The habit page from fixtures, for screenshots. Only with DESIGN_PREVIEW=1, like its parent.
export default async function PreviewHabit({ params, searchParams }: PageProps<"/preview/[fixture]/h/[id]">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture, id } = await params;
  const habit = Object.hasOwn(fixtures, fixture) ? fixtures[fixture].find((h) => h.id === Number(id)) : undefined;
  if (!habit) notFound();
  const day = pickDay((await searchParams).day, today);
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <HabitDetail
      view={toDetailView(withNewest(habit, now), today, day, fixtureTaps(habit, day), fixtureRecent(habit), now)}
      today={today}
      now="14:30"
      backHref={`/preview/${fixture}`}
      editHref={`/preview/${fixture}/h/${id}/edit`}
      stickerHref={`/preview/${fixture}/stickers/`}
      newHref={`/preview/${fixture}/new`}
      add={previewAdd}
      remove={previewRemove}
      restore={previewDone}
      addSticker={previewToken}
      frame={{ theme: await readTheme(), signOut: previewSignOut, signOutEverywhere: previewSignOutEverywhere }}
    />
  );
}
