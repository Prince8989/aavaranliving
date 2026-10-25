import Link from "next/link";
import { formatPrice, priceFor } from "@/lib/currency";
import type { Currency, Product } from "@/lib/types";

export function ProductCard({ product, currency }: { product: Product; currency: Currency }) {
  const image = product.images[0];
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-[4/5] overflow-hidden rounded bg-stone/10">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone">Image coming soon</div>
        )}
      </div>
      <h3 className="mt-3 font-serif text-lg">{product.name}</h3>
      <p className="text-sm text-stone">{product.size}</p>
      <p className="mt-1">{formatPrice(priceFor(product, currency), currency)}</p>
    </Link>
  );
}
