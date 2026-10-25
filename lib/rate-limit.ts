import { db } from "@/lib/db";

/**
 * Fixed-window rate limiter backed by Postgres (works across serverless instances).
 * Returns true when the action is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${windowStart} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 1) <= limit;
}
