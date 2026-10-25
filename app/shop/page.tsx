import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/supabase";
import { getCurrency } from "@/lib/server-currency";

export const metadata = { title: "Shop" };
export const revalidate = 60;

export default async function ShopPage() {
  const [products, currency] = await Promise.all([getProducts(), getCurrency()]);

  return (
    <>
      <h1 className="mb-8 font-serif text-4xl">All rugs</h1>
      {products.length === 0 ? (
        <p className="text-stone">New pieces are on the way.</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} currency={currency} />
          ))}
        </div>
      )}
    </>
  );
}
