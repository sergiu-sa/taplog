import type { MetadataRoute } from "next";

// Only the guide may be fetched, so a shared /guide link gets its preview card. Every page,
// the guide included, still asks not to be indexed (the root layout's metadata).
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/guide", disallow: "/" } };
}
