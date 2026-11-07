import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { freeColor } from "@/lib/palette";
import { readTheme } from "@/lib/theme";
import { HabitEditor } from "../../../habit-editor";
import { previewSave, previewSignOut, previewSignOutEverywhere } from "../../actions";
import { fixtures } from "../../fixtures";

export const metadata: Metadata = { title: "New habit" };

// The editor from fixtures, for screenshots. Only with DESIGN_PREVIEW=1, like its parent.
export default async function PreviewNew({ params }: PageProps<"/preview/[fixture]/new">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture } = await params;
  if (!Object.hasOwn(fixtures, fixture)) notFound();

  return (
    <HabitEditor
      habit={null}
      color={freeColor(fixtures[fixture])}
      backHref={`/preview/${fixture}`}
      newHref={`/preview/${fixture}/new`}
      save={previewSave}
      frame={{ theme: await readTheme(), signOut: previewSignOut, signOutEverywhere: previewSignOutEverywhere }}
    />
  );
}
