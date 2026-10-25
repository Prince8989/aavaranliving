import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/authz";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const { callbackUrl, error } = await searchParams;
  if (await currentUser()) redirect(callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "/account");
  return (
    <div className="container-site max-w-md py-24 lg:py-32">
      <h1 className="font-serif text-5xl">Sign in</h1>
      <p className="mt-4 leading-relaxed text-muted">
        Enter your email and we&apos;ll send you a secure, one-time sign-in link. No password needed. New here? The same link creates your account.
      </p>
      {error && (
        <p role="alert" className="mt-6 bg-red-50 px-4 py-3 text-sm text-red-800">
          That sign-in link is invalid or has expired. Please request a new one.
        </p>
      )}
      <div className="mt-10">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
