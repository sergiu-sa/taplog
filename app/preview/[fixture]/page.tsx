import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readTheme } from "@/lib/theme";
import { Dashboard, splitHabits } from "../../dashboard";
import { previewAdd, previewRemove } from "../actions";
import { fixtures, fixtureStickers, today } from "../fixtures";

export const metadata: Metadata = { title: "Today" };

// Pages rendered from fixtures, for screenshots of states a signed-out browser can't reach.
// Only when DESIGN_PREVIEW=1 is set in the shell that builds and starts the server.
export default async function Preview({ params }: PageProps<"/preview/[fixture]">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture } = await params;
  if (!Object.hasOwn(fixtures, fixture)) notFound();

  return (
    <Dashboard
      today={today}
      {...splitHabits(fixtures[fixture], today)}
      loose={fixtureStickers.filter((s) => s.habit_id === null).map((s) => ({ id: s.id, name: s.label }))}
      habitHref={`/preview/${fixture}/h/`}
      stickerHref={`/preview/${fixture}/stickers/`}
      newHref={`/preview/${fixture}/new`}
      add={previewAdd}
      remove={previewRemove}
      theme={await readTheme()}
    />
  );
}
