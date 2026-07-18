import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Email-link landing for BOTH Supabase link styles:
 *  - PKCE (default email templates): ?code=...
 *  - token-hash templates: ?token_hash=...&type=signup|recovery|email
 * Destination: recovery links land on the update-password page; everything
 * else lands on onboarding (which forwards linked users to the dashboard).
 * `next` is honored only as a same-site relative path.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const nextParam = url.searchParams.get("next");

  const fallback = type === "recovery" ? "/update-password" : "/onboarding";
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : fallback;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL("/login?error=verification_failed", request.url),
  );
}
