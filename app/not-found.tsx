import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-serif text-4xl">Page not found</h1>
      <Link href="/shop" className="mt-6 inline-block underline hover:text-clay">Back to the shop</Link>
    </div>
  );
}
