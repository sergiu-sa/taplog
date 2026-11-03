import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { habitStatus } from "@/lib/habits";
import { toHabitView } from "../../../../dashboard";
import { LoggedView, sinceLine } from "../../../../logged/logged-view";
import { UndoButton } from "../../../../logged/undo-button";
import { previewUndo } from "../../../actions";
import { fixtures, fixtureTaps, today, withNewest } from "../../../fixtures";

export const metadata: Metadata = { title: "Logged" };

// /logged from fixtures: the habit's newest tap today as just logged, or already counted
// with ?dup=1. Only with DESIGN_PREVIEW=1, like its parent.
export default async function PreviewLogged({ params, searchParams }: PageProps<"/preview/[fixture]/logged/[id]">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture, id } = await params;
  const habit = Object.hasOwn(fixtures, fixture) ? fixtures[fixture].find((h) => h.id === Number(id)) : undefined;
  if (!habit) notFound();
  // Server Components render once per request, so this is just the request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const v = toHabitView(withNewest(habit, now), today, now);
  const taps = fixtureTaps(habit, today);
  const created = Date.parse(taps.at(-1)?.created_at ?? `${today}T12:00:00Z`);

  return (
    <LoggedView
      dup={(await searchParams).dup === "1"}
      fresh
      name={v.name}
      kind={v.kind}
      color={v.color}
      when={v.period === "week" ? "This week" : "Today"}
      count={v.count}
      target={v.target}
      status={habitStatus(v.kind, v.count, v.target)}
      since={v.kind === "limit" ? sinceLine(created, taps.at(-2)?.created_at) : null}
      next={v.next}
      undo={<UndoButton id="0" sig="" action={previewUndo} />}
    />
  );
}
