import type { MetadataRoute } from "next";
import { GROUND } from "@/lib/palette";

// Browsers fetch this without cookies, so its colours can't follow the theme pick; the
// theme-color tags in the layout do. Chrome on macOS shapes its Dock icon from the maskable one.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "taplog",
    short_name: "taplog",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: GROUND.light,
    theme_color: GROUND.light,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
