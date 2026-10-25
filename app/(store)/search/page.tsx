import type { Metadata } from "next";
import { CatalogListing, type SearchParams } from "@/components/product/CatalogListing";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim();
  return (
    <div className="container-site py-16 lg:py-24">
      <h1 className="mb-14 font-serif text-5xl">{q ? <>Results for “{q}”</> : "Search carpets"}</h1>
      <CatalogListing basePath="/search" searchParams={sp} />
    </div>
  );
}
