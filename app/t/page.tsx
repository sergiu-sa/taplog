import type { Metadata } from "next";
import { notFound } from "next/navigation";

// Here, not on not-found.tsx: only the root not-found takes metadata, and a nested one's
// title is replaced by this page's once the browser loads.
export const metadata: Metadata = { title: "Unknown sticker" };

// Where /t/ sends a sticker link that logs nothing. A route handler can't render a page, so
// this one only throws, and the not-found page beside it says why, with a 404.
export default function UnknownSticker() {
  notFound();
}
