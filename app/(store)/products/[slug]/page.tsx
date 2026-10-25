import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getProductBySlug, getRedirectForSlug, getRelatedProducts } from "@/lib/catalog";
import { availabilityMap } from "@/lib/inventory";
import { getCurrency } from "@/lib/preferences";
import { formatDimensions, formatWeight } from "@/lib/units";
import { absoluteUrl } from "@/lib/site";
import { ProductGallery } from "@/components/product/ProductGallery";
import { VariantPicker } from "@/components/product/VariantPicker";
import { ProductGrid } from "@/components/product/ProductCard";
import { JsonLd } from "@/components/ui/JsonLd";
import { ButtonLink } from "@/components/ui/Button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const img = p.images[0];
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? p.description.slice(0, 155),
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: { title: p.name, description: p.description.slice(0, 155), images: img ? [{ url: img.url, alt: img.alt }] : undefined },
    robots: p.isSample ? { index: false, follow: false } : undefined,
  };
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-ink/10 py-3 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    const target = await getRedirectForSlug(slug);
    if (target) permanentRedirect(`/products/${target}`);
    notFound();
  }

  const currency = await getCurrency();
  const availability = await availabilityMap(product.variants.map((v) => v.id));
  const variants = product.variants.map((v) => ({
    id: v.id,
    label: v.label,
    dimensions: formatDimensions(v.lengthCm, v.widthCm),
    weight: formatWeight(v.weightGrams),
    price: v.prices.find((p) => p.currency === currency)?.amount ?? null,
    available: availability.get(v.id) ?? 0,
  }));
  const collection = product.collections[0]?.collection;
  const related = await getRelatedProducts(product.id, product.collections.map((c) => c.collectionId), currency);
  const handmade = /hand/i.test(product.construction ?? "") || /flatweave|dhurrie|kilim/i.test(product.construction ?? "");

  const usdOffers = product.variants
    .map((v) => ({ v, amount: v.prices.find((p) => p.currency === "USD")?.amount }))
    .filter((x) => x.amount != null);

  return (
    <div className="container-site py-12 lg:py-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            sku: product.sku,
            description: product.description,
            image: product.images.map((i) => i.url),
            brand: { "@type": "Brand", name: "AAVARAN" },
            material: product.material ?? undefined,
            color: product.colour ?? undefined,
            countryOfOrigin: product.countryOfOrigin ?? undefined,
            offers: usdOffers.map(({ v, amount }) => ({
              "@type": "Offer",
              sku: v.sku,
              name: v.label,
              price: (amount! / 100).toFixed(2),
              priceCurrency: "USD",
              availability: (availability.get(v.id) ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: absoluteUrl(`/products/${product.slug}`),
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
              ...(collection ? [{ "@type": "ListItem", position: 2, name: collection.name, item: absoluteUrl(`/collections/${collection.slug}`) }] : []),
              { "@type": "ListItem", position: collection ? 3 : 2, name: product.name, item: absoluteUrl(`/products/${product.slug}`) },
            ],
          },
        ]}
      />

      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link href="/" className="hover:text-ink">Home</Link> /
          </li>
          {collection && (
            <li>
              <Link href={`/collections/${collection.slug}`} className="hover:text-ink">{collection.name}</Link> /
            </li>
          )}
          <li aria-current="page" className="text-ink">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <ProductGallery images={product.images.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind }))} name={product.name} />

        <div className="lg:sticky lg:top-28 lg:self-start">
          {product.isSample && (
            <p className="label mb-4 inline-block bg-sandstone px-3 py-1.5 text-walnut">Sample product — not genuine inventory</p>
          )}
          {collection && <p className="label text-walnut">{collection.name}</p>}
          <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-6 leading-relaxed text-muted">{product.description}</p>

          <div className="mt-10">
            <VariantPicker productId={product.id} productName={product.name} variants={variants} currency={currency} />
          </div>

          <dl className="mt-12">
            <Detail label="Material" value={product.material} />
            <Detail label="Construction" value={product.construction} />
            <Detail label="Country of origin" value={product.countryOfOrigin} />
            <Detail label="Colour" value={product.colour} />
            <Detail label="Pattern" value={product.pattern} />
            <Detail label="Pile height" value={product.pileHeightMm ? `${product.pileHeightMm} mm (${(product.pileHeightMm / 25.4).toFixed(2)} in)` : null} />
            <Detail label="Weight" value={variants.length === 1 ? variants[0].weight : null} />
          </dl>

          <div className="mt-10 space-y-2">
            <details className="group border-b border-ink/10 py-4" open>
              <summary className="label cursor-pointer list-none text-walnut">Delivery &amp; duties</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Shipping costs for your destination are shown in your bag before payment. For deliveries outside the country of dispatch, import duties and
                taxes are not prepaid unless stated at checkout and may be payable by the recipient. See our{" "}
                <Link href="/policies/shipping" className="underline underline-offset-4">Shipping Policy</Link>.
              </p>
            </details>
            {product.careInstructions && (
              <details className="border-b border-ink/10 py-4">
                <summary className="label cursor-pointer list-none text-walnut">Care</summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{product.careInstructions}</p>
              </details>
            )}
            {handmade && (
              <details className="border-b border-ink/10 py-4">
                <summary className="label cursor-pointer list-none text-walnut">Made by hand</summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Handcrafted carpets carry natural variations in colour, texture and dimension. Slight tonal shifts (abrash) and small differences in size
                  are characteristics of handwork, not defects.
                </p>
              </details>
            )}
          </div>

          <div className="mt-10 bg-sandstone/50 p-6">
            <p className="font-serif text-xl">Need a different size or colour?</p>
            <p className="mt-2 text-sm text-muted">This design may be available made to your specification.</p>
            <ButtonLink href={`/bespoke?product=${product.slug}`} variant="ghost" className="mt-3">
              Bespoke enquiry →
            </ButtonLink>
          </div>
        </div>
      </div>

      {product.videoUrl && (
        <section className="mt-28 grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-20" aria-labelledby="film-heading">
          <div>
            <p className="label text-walnut">The making</p>
            <h2 id="film-heading" className="mt-3 font-serif text-4xl">From yarn to {product.name}</h2>
            <p className="mt-6 max-w-md leading-relaxed text-muted">
              Every carpet is drawn, tufted, backed and finished by hand by our artisans in Bhadohi. A short film of this piece being made.
            </p>
          </div>
          <video
            className="mx-auto aspect-[9/16] w-full max-w-sm bg-obsidian object-cover"
            src={product.videoUrl}
            poster={product.videoPoster ?? undefined}
            controls
            muted
            loop
            playsInline
            preload="none"
            aria-label={`Film: the making of ${product.name}`}
          />
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-32">
          <h2 className="mb-12 font-serif text-4xl">You may also consider</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
