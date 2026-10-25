/**
 * Secure first-admin provisioning. There is no default admin account or password.
 * Run from a machine with DATABASE_URL access:
 *
 *   npm run admin:grant -- you@example.com
 *
 * The user then signs in at /login with a one-time email link and can open /admin.
 */
import { db } from "../lib/db";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
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
