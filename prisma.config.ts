import { defineConfig } from "prisma/config";

// DATABASE_URL is read from the environment (Vercel env vars, or .env.local loaded by your shell).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
