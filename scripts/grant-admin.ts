/**
 * Secure first-admin provisioning. There is no default admin account or password.
 * Run from a machine with DATABASE_URL access:
 *
 *   npm run admin:grant -- you@example.com
 *
 * The user then signs in at /login with a one-time email link and can open /admin.
 *
 * On Vercel, set INITIAL_ADMIN_EMAIL and the build runs this automatically (`--from-env`).
 */
import { db } from "../lib/db";

async function main() {
  const fromEnv = process.argv[2] === "--from-env";
  const email = (fromEnv ? process.env.INITIAL_ADMIN_EMAIL : process.argv[2])?.trim().toLowerCase();
  if (fromEnv && !email) {
    console.log("INITIAL_ADMIN_EMAIL not set — skipping admin bootstrap.");
    return;
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("Usage: npm run admin:grant -- <email>");
    process.exit(1);
  }
  const user = await db.user.upsert({
    where: { email },
    create: { email, role: "ADMIN" },
    update: { role: "ADMIN" },
  });
  await db.auditLog.create({ data: { action: "admin.granted_via_cli", entity: "User", entityId: user.id, data: { email } } });
  console.log(`${email} now has admin access.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
