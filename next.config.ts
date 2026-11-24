import type { NextConfig } from "next";
import { assertNoExposedSecrets } from "./src/lib/env-guard";

// Refuse to start or build if a Supabase secret key is in a NEXT_PUBLIC_ variable, which would
// ship it to every browser. Next.js has already loaded .env files by the time this runs.
assertNoExposedSecrets();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
