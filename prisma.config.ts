import { defineConfig } from "prisma/config";

// Migrations use a direct (non-pooled) connection when available; the app itself uses DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL ?? "",
  },
});
