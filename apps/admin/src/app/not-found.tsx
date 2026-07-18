export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          Page not found
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          This page doesn&apos;t exist — it may arrive in a later update.
        </p>
        <a
          href="/"
          className="mt-5 block w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
