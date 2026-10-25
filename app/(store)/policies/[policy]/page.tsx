import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SimpleMarkdown } from "@/components/ui/SimpleMarkdown";
import { db } from "@/lib/db";

const POLICIES = {
  shipping: "Shipping Policy",
  returns: "Return Policy",
  privacy: "Privacy Policy",
  terms: "Terms and Conditions",
} as const;
type Key = keyof typeof POLICIES;

export async function generateMetadata({ params }: { params: Promise<{ policy: string }> }): Promise<Metadata> {
  const { policy } = await params;
  const title = POLICIES[policy as Key];
  return title ? { title, alternates: { canonical: `/policies/${policy}` } } : {};
}

export default async function PolicyPage({ params }: { params: Promise<{ policy: string }> }) {
  const { policy } = await params;
  const title = POLICIES[policy as Key];
  if (!title) notFound();
  // Policy text is business/legal content managed in /admin/content (key "policy-<name>"). Nothing is invented here.
  const block = await db.contentBlock.findUnique({ where: { key: `policy-${policy}` } }).catch(() => null);
  const body = (block?.value as { body?: string } | null)?.body;

  return (
    <div className="container-site max-w-3xl py-20 lg:py-28">
      <h1 className="font-serif text-5xl">{title}</h1>
      <div className="mt-12">
        {body ? (
          <SimpleMarkdown source={body} />
        ) : (
          <div className="border border-ink/15 bg-sandstone/40 p-8" role="note">
            <p className="font-serif text-2xl">This policy is being finalised.</p>
            <p className="mt-4 leading-relaxed text-muted">
              Our {title.toLowerCase()} will be published here before online orders open. In the meantime, please contact us with any questions before
              placing an order.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
