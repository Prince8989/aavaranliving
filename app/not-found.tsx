import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="label text-walnut">404</p>
      <h1 className="mt-6 font-serif text-5xl">This page could not be found.</h1>
      <Link href="/" className="label mt-10 border border-obsidian px-6 py-3 hover:bg-obsidian hover:text-ivory">
        Return home
      </Link>
    </main>
  );
}
