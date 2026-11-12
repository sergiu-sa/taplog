import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // Vercel restores .next/cache between builds, and a build from that restored
    // Turbopack cache once shipped an old globals.css without any error.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
