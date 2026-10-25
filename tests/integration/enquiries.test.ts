import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createEnquiry } from "@/lib/enquiries";
import { rateLimit } from "@/lib/rate-limit";
import { resetDb } from "../helpers/db";

beforeEach(resetDb);

describe("enquiry submissions", () => {
  it("stores bespoke enquiries and never sends real email during tests", async () => {
    process.env.ADMIN_EMAIL = "owner@test.local";
    const e = await createEnquiry({
      type: "BESPOKE",
      name: "Asha Rao",
      email: "asha@test.local",
      message: "A 10 × 14 ft carpet in indigo.",
      details: { dimensions: "10 x 14 ft", budget: "5000-10000" },
    });
    const stored = await db.enquiry.findUniqueOrThrow({ where: { id: e.id } });
    expect(stored).toMatchObject({ type: "BESPOKE", status: "NEW" });
    expect(stored.details).toMatchObject({ dimensions: "10 x 14 ft" });
    const logs = await db.emailLog.findMany();
    expect(logs.map((l) => l.template).sort()).toEqual(["admin-enquiry", "enquiry-ack"]);
    expect(logs.every((l) => l.status === "SKIPPED")).toBe(true);
  });
});

describe("rate limiting", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await rateLimit("test:ip", 3, 60));
    expect(results).toEqual([true, true, true, false]);
    expect(await rateLimit("test:other", 3, 60)).toBe(true);
  });
});
