import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readTheme } from "@/lib/theme";
import { toStickerView } from "../../../../detail-view";
import { StickerPage } from "../../../../stickers";
import { previewDone, previewSignOut, previewSignOutEverywhere, previewToken } from "../../../actions";
import { fixtures, fixtureStickers, today } from "../../../fixtures";

const find = (id: string) => fixtureStickers.find((s) => s.id === Number(id));

export async function generateMetadata({ params }: PageProps<"/preview/[fixture]/stickers/[id]">): Promise<Metadata> {
  return { title: find((await params).id)?.label ?? "Not found" };
}

// A sticker's page from fixtures, for screenshots. Only with DESIGN_PREVIEW=1, like its parent.
export default async function PreviewSticker({ params }: PageProps<"/preview/[fixture]/stickers/[id]">) {
  if (process.env.DESIGN_PREVIEW !== "1") notFound();
  const { fixture, id } = await params;
  const sticker = find(id);
  if (!Object.hasOwn(fixtures, fixture) || !sticker) notFound();
  const view = toStickerView(sticker, fixtures[fixture], today);

  return (
    <StickerPage
      view={view}
      backHref={view.habit ? `/preview/${fixture}/h/${view.habit.id}` : `/preview/${fixture}`}
      newHref={`/preview/${fixture}/new`}
      move={previewDone}
      rename={previewDone}
      newLink={previewToken}
      remove={previewDone}
      restore={previewDone}
      frame={{ theme: await readTheme(), signOut: previewSignOut, signOutEverywhere: previewSignOutEverywhere }}
    />
  );
}
