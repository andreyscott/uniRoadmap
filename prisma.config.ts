import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env files itself. Load the same files Next.js uses so the CLI
// (migrate, seed, studio) sees identical values. Missing files are fine.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // optional file
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // CLI commands need a direct (non-pooled) connection for migrations. The running app
    // connects through the pooled DATABASE_URL instead (see src/lib/db.ts).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
