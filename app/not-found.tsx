import type { Metadata } from "next";
import { Gone } from "./gone";

export const metadata: Metadata = { title: "Not found" };

// Unmatched addresses and every notFound() land here, inside the root layout, so the theme
// cookie's data-theme applies; Next's built-in page only follows the device.
export default function NotFound() {
  return <Gone title="Nothing is wired to this address." />;
}
