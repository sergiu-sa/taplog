import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoggedUndone } from "../../../../logged/logged-view";
import { fixtures } from "../../../fixtures";

export const metadata: Metadata = { title: "Undone" };

export default async function PreviewUndone({ params }: PageProps<"/preview/[fixture]/logged/undone">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  if (!Object.hasOwn(fixtures, (await params).fixture)) notFound();
  return <LoggedUndone />;
}
