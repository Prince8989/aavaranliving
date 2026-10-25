import { execSync } from "node:child_process";
import { Client } from "pg";

/** Resets the e2e test database and loads development sample data. */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://aavaran:aavaran@localhost:5432/aavaran_test";
  if (!url.includes("test")) throw new Error("E2E must run against a test database");
  const client = new Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  await client.end();
  execSync("npx tsx prisma/seed.ts", { env: { ...process.env, DATABASE_URL: url, SEED_SAMPLES: "true" }, stdio: "inherit" });
}
