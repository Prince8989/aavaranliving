import { defineConfig, devices } from "@playwright/test";

const DB = process.env.TEST_DATABASE_URL ?? "postgresql://aavaran:aavaran@localhost:5432/aavaran_test";
const PORT = 3200;

export const E2E_ENV = {
  DATABASE_URL: DB,
  AUTH_SECRET: "e2e-secret-0123456789abcdef0123456789abcdef",
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  ALLOW_SAMPLE_PRODUCTS: "true",
  STORE_CHECKOUT_ENABLED: "true",
  EMAIL_DISABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_e2e_mock",
  STRIPE_WEBHOOK_SECRET: "whsec_e2e_test",
  STRIPE_API_HOST: "http://localhost:12111",
};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/e2e/stripe-mock.mjs", url: "http://localhost:12111/health", reuseExistingServer: false },
    {
      // Requires a prior `npm run build`.
      command: `npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/robots.txt`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: E2E_ENV,
    },
  ],
});
