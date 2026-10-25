import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AddToCart } from "@/components/AddToCart";
import { getProductBySlug } from "@/lib/supabase";
import { getCurrency } from "@/lib/server-currency";
import { formatPrice, priceFor } from "@/lib/currency";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product ? { title: product.name, description: product.description ?? undefined } : {};
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, currency] = await Promise.all([getProductBySlug(slug), getCurrency()]);
  if (!product) notFound();

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-4">
        {product.images.length > 0 ? (
          product.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={`${product.name} — view ${i + 1}`} className="w-full rounded" />
          ))
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center rounded bg-stone/10 text-stone">
            Image coming soon
          </div>
        )}
      </div>

      <div className="md:sticky md:top-24 md:self-start">
        <h1 className="font-serif text-4xl">{product.name}</h1>
        <p className="mt-3 text-2xl">{formatPrice(priceFor(product, currency), currency)}</p>
        <p className="mt-6 leading-relaxed text-stone">{product.description}</p>

        <dl className="mt-6 grid grid-cols-[auto,1fr] gap-x-6 gap-y-2 text-sm">
          {product.size && (<><dt className="text-stone">Size</dt><dd>{product.size}</dd></>)}
          {product.material && (<><dt className="text-stone">Material</dt><dd>{product.material}</dd></>)}
          {product.weave && (<><dt className="text-stone">Construction</dt><dd>{product.weave}</dd></>)}
        </dl>

        <div className="mt-8">
          <AddToCart product={product} />
        </div>
        <p className="mt-4 text-xs text-stone">Free shipping to the US &amp; Europe. Duties may apply on delivery.</p>
      </div>
    </div>
  );
}
