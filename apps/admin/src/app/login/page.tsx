"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("Invalid email or password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-base font-bold text-white">
            B
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink">
            BodyBalance
          </span>
        </div>
        <div className="rounded-2xl border border-line bg-white p-8 shadow-card">
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to your clinic dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <a
              href="/reset-password"
              className="block text-center text-sm text-muted hover:text-ink"
            >
              Forgot your password?
            </a>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-muted">
          New clinic?{" "}
          <a href="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </main>
  );
}
