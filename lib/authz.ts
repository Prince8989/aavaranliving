import "server-only";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/generated/prisma/enums";

export type SessionUser = { id: string; role: Role; email?: string | null; name?: string | null };

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
  }
}

/** Pure authorization rule — unit tested. */
export function isAdmin(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN";
}

export function assertAdmin(user: SessionUser | null | undefined): asserts user is SessionUser {
  if (!isAdmin(user)) throw new ForbiddenError();
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser | undefined) ?? null;
}

export async function requireUser(callbackUrl = "/account"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/** For admin pages: unauthenticated → login; authenticated non-admins see a 404 (admin area isn't advertised). */
export async function requireAdminPage(callbackUrl = "/admin"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!isAdmin(user)) notFound();
  return user;
}

/** For admin server actions and route handlers: every mutation re-checks the role. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await currentUser();
  assertAdmin(user);
  return user;
}
