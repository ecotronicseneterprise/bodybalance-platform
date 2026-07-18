"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-lavender text-lg font-semibold text-brand-deep">
          !
        </div>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-ink">
          Something went wrong
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          That&apos;s on us, not you. Your data is safe — try again, and if it
          keeps happening, tell us in Feedback.
        </p>
        <button
          onClick={reset}
          className="mt-5 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
