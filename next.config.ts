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
    // Vercel restores .next/cache before every build, and a restored Turbopack
    // cache once shipped an old globals.css with no error.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
