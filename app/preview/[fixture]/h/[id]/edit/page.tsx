import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readTheme } from "@/lib/theme";
import { toEditorView } from "../../../../../detail-view";
import { HabitEditor } from "../../../../../habit-editor";
import { previewDone, previewSave, previewSignOut, previewSignOutEverywhere } from "../../../../actions";
import { fixtures, today } from "../../../../fixtures";

const find = (fixture: string, id: string) => (Object.hasOwn(fixtures, fixture) ? fixtures[fixture].find((h) => h.id === Number(id)) : undefined);

export async function generateMetadata({ params }: PageProps<"/preview/[fixture]/h/[id]/edit">): Promise<Metadata> {
  const { fixture, id } = await params;
  const habit = find(fixture, id);
  return { title: habit ? `Edit ${habit.name}` : "Not found" };
}

// The editor for a fixture habit, for screenshots. Only with DESIGN_PREVIEW=1, like its parent.
export default async function PreviewEdit({ params }: PageProps<"/preview/[fixture]/h/[id]/edit">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture, id } = await params;
  const habit = find(fixture, id);
  if (!habit) notFound();

  return (
    <HabitEditor
      habit={toEditorView(habit, today)}
      color={habit.color}
      backHref={`/preview/${fixture}/h/${id}`}
      newHref={`/preview/${fixture}/new`}
      save={previewSave}
      archive={previewDone}
      remove={previewDone}
      frame={{ theme: await readTheme(), signOut: previewSignOut, signOutEverywhere: previewSignOutEverywhere }}
    />
  );
}
