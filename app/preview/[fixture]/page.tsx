import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard, toHabitView } from "../../dashboard";
import { previewAdd, previewRemove } from "../actions";
import { fixtures, today } from "../fixtures";

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
      habits={fixtures[fixture].map((h) => toHabitView(h, today))}
      habitHref={`/preview/${fixture}/h/`}
      add={previewAdd}
      remove={previewRemove}
    />
  );
}
