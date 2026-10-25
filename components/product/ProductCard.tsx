import Image from "next/image";
import Link from "next/link";
import type { ProductCardData } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { Motif } from "@/components/ui/Motif";

export function ProductCard({ product, priority = false, index = 0 }: { product: ProductCardData; priority?: boolean; index?: number }) {
  return (
    <article className="group" data-testid="product-card">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-sandstone">
          {product.image ? (
            <>
              <Image
                src={product.image.url}
                alt={product.image.alt}
                fill
                priority={priority}
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-[1.2s] ease-luxe group-hover:scale-[1.04]"
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage.url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover opacity-0 transition-opacity duration-700 ease-luxe group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <Motif className="h-full w-full transition-transform duration-[1.2s] ease-luxe group-hover:scale-[1.04]" tone={index % 3 === 1 ? "walnut" : "dark"} seed={index} label={`${product.name} — photography forthcoming`} />
          )}
          {product.isSample && (
            <span className="label absolute left-3 top-3 bg-ivory/90 px-2.5 py-1 text-[0.6rem] text-walnut">Sample product</span>
          )}
          {!product.available && (
            <span className="label absolute right-3 top-3 bg-obsidian/85 px-2.5 py-1 text-[0.6rem] text-ivory">Enquire</span>
          )}
        </div>
        <div className="mt-4 space-y-1">
          {product.collection && <p className="label text-[0.6rem] text-walnut">{product.collection}</p>}
          <h3 className="font-serif text-xl leading-snug transition-colors group-hover:text-walnut">{product.name}</h3>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-muted">
            <span>{product.sizeLabel}</span>
            <span className="text-ink">
              {product.fromPrice != null
                ? `${product.sizeLabel?.includes("sizes") ? "From " : ""}${formatMoney(product.fromPrice, product.currency)}`
                : "Price on request"}
            </span>
          </div>
          <p className="text-xs text-muted">{product.available ? "Available" : "Currently unavailable"}</p>
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} priority={i < 2} />
      ))}
    </div>
  );
}
