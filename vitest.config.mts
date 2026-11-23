import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path("./src"),
      // Next.js provides "server-only" itself; tests run outside Next, so stub it out.
      "server-only": path("./tests/stubs/server-only.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
