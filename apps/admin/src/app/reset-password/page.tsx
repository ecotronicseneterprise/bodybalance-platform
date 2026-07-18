"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    // Always report success — never reveal whether an email is registered.
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-card">
        {sent ? (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Check your email</h1>
            <p className="mt-2 text-sm text-muted">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent
              a link to reset your password. The link is valid for one hour.
            </p>
            <a
              href="/login"
              className="mt-6 block text-center text-sm font-medium text-brand hover:underline"
            >
              Back to sign in
            </a>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-muted">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/60 focus:border-brand focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <a
              href="/login"
              className="mt-4 block text-center text-sm text-muted hover:text-ink"
            >
              Back to sign in
            </a>
          </>
        )}
      </div>
    </main>
  );
}
