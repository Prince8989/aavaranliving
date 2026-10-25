import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check your email", robots: { index: false, follow: false } };

export default function CheckEmailPage() {
  return (
    <div className="container-site max-w-md py-24 text-center lg:py-32">
      <h1 className="font-serif text-5xl">Check your email</h1>
      <p className="mt-6 leading-relaxed text-muted">
        If the address is valid, a sign-in link is on its way. It expires in 15 minutes and works once. You can close this page.
      </p>
    </div>
  );
}
