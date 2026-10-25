import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { freeColor } from "@/lib/palette";
import { HabitEditor } from "../../../habit-editor";
import { previewSave } from "../../actions";
import { fixtures, today } from "../../fixtures";

export const metadata: Metadata = { title: "New habit" };

// The editor from fixtures, for screenshots. Only with DESIGN_PREVIEW=1, like its parent.
export default async function PreviewNew({ params }: PageProps<"/preview/[fixture]/new">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture } = await params;
  if (!Object.hasOwn(fixtures, fixture)) notFound();

  return <HabitEditor habit={null} today={today} color={freeColor(fixtures[fixture])} backHref={`/preview/${fixture}`} save={previewSave} />;
}
