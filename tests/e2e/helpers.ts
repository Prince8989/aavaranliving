import crypto from "node:crypto";
import { Client } from "pg";
import type { BrowserContext } from "@playwright/test";

export const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://aavaran:aavaran@localhost:5432/aavaran_test";

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end();
  }
}

/** Signs in by creating a real database session (as Auth.js would after a magic link) and setting its cookie. */
export async function signInAs(context: BrowserContext, email: string, role: "ADMIN" | "CUSTOMER") {
  const id = `e2e_${crypto.randomUUID()}`;
  const [user] = await query<{ id: string }>(
    `INSERT INTO "User" (id, email, role, "emailVerified", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role RETURNING id`,
    [id, email, role]
  );
  const token = crypto.randomBytes(32).toString("hex");
  await query(`INSERT INTO "Session" ("sessionToken", "userId", expires, "updatedAt") VALUES ($1, $2, NOW() + interval '1 day', NOW())`, [token, user.id]);
  await context.addCookies([{ name: "authjs.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return user.id;
}
