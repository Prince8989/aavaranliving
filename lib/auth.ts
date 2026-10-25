import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/enums";
import { loginEmail } from "@/lib/email/templates";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(db as any),
  // Database sessions: revocable server-side, httpOnly + secure cookies set by Auth.js.
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  trustHost: true,
  pages: { signIn: "/login", verifyRequest: "/login/check-email", error: "/login" },
  providers: [
    Resend({
      // Passwordless: one-time links expire after 15 minutes.
      maxAge: 15 * 60,
      from: process.env.EMAIL_FROM ?? "AAVARAN <no-reply@localhost>",
      apiKey: process.env.EMAIL_API_KEY ?? "unused",
      async sendVerificationRequest({ identifier, url }) {
        const allowed = await rateLimit(`login:${identifier.toLowerCase()}`, 5, 60 * 60);
        if (!allowed) throw new Error("Too many sign-in requests. Please try again later.");
        if (process.env.NODE_ENV === "production" && !emailConfigured()) {
          throw new Error("Email delivery is not configured.");
        }
        await sendEmail(loginEmail(identifier, url));
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      session.user.role = (user as unknown as { role: Role }).role;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await db.auditLog.create({ data: { actorId: user.id, action: "auth.sign_in", entity: "User", entityId: user.id } });
      }
    },
  },
});
