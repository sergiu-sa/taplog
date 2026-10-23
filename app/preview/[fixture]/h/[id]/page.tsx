import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addDays } from "@/lib/habits";
import { toDetailView } from "../../../../detail-view";
import { HabitDetail } from "../../../../habit-detail";
import { previewAdd, previewRemove } from "../../../actions";
import { fixtureRecent, fixtures, fixtureTaps, today } from "../../../fixtures";

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
  const asked = (await searchParams).day;
  const day = typeof asked === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asked) && addDays(asked, 0) === asked && asked <= today ? asked : today;

  return (
    <HabitDetail
      view={toDetailView(habit, today, day, fixtureTaps(habit, day), fixtureRecent(habit))}
      today={today}
      now="14:30"
      backHref={`/preview/${fixture}`}
      add={previewAdd}
      remove={previewRemove}
    />
  );
}
