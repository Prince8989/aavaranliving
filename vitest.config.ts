import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // React Server-only marker: a no-op outside the Next.js runtime.
      "server-only": path.resolve(__dirname, "tests/helpers/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    // Integration tests share one database, so files run sequentially.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://aavaran:aavaran@localhost:5432/aavaran_test",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      AUTH_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
      EMAIL_DISABLED: "true",
    },
    testTimeout: 20_000,
  },
});
