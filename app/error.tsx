"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-5xl">Something went wrong.</h1>
      <p className="mt-4 text-muted">Please try again. If the problem continues, contact us.</p>
      <button type="button" onClick={reset} className="label mt-10 border border-obsidian px-6 py-3 hover:bg-obsidian hover:text-ivory">
        Try again
      </button>
    </main>
  );
}
