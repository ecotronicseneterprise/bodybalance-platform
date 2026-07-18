#!/usr/bin/env node
/**
 * Live password-reset verification (2A Step 2).
 * Exercises the exact server-side path the browser flow uses:
 *  1. throwaway user created (marked +test, cleanable)
 *  2. recovery link generated (same tokens the reset email carries)
 *  3. token verified with the ANON key (what /auth/confirm does)
 *  4. password updated on the recovery session (what /update-password does)
 *  5. sign-in with NEW password succeeds; OLD password fails
 * The only leg not covered is SMTP delivery of the email itself — that's
 * Supabase's built-in mailer, confirmed separately in the founder walkthrough.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const read = (p) => readFileSync(p, "utf8").trim();
const URL = "https://cklgjwqhnttrpggnfpgy.supabase.co";
const anonKey = read(".secrets/anon-key.txt");
const admin = createClient(URL, read(".secrets/service-role-key.txt"), {
  auth: { persistSession: false },
});

const email = `reset+test-${randomUUID().slice(0, 8)}@demo-clinic.invalid`;
const oldPassword = randomUUID();
const newPassword = randomUUID();
const results = [];
let userId;

try {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password: oldPassword,
    email_confirm: true,
  });
  if (cErr) throw new Error(cErr.message);
  userId = created.user.id;

  // 2 — the same token the reset email would carry
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  results.push(["recovery link generated", lErr ? `FAIL: ${lErr.message}` : "OK"]);

  // 3 — /auth/confirm equivalent: verify with anon key
  const anon = createClient(URL, anonKey, { auth: { persistSession: false } });
  const { data: session, error: vErr } = await anon.auth.verifyOtp({
    type: "recovery",
    token_hash: link.properties.hashed_token,
  });
  results.push(["recovery token verified (anon)", vErr ? `FAIL: ${vErr.message}` : "OK"]);

  // 4 — /update-password equivalent: update password on the recovery session
  // (browser equivalent: the ssr client holds this session via cookies)
  const recovered = createClient(URL, anonKey, { auth: { persistSession: false } });
  await recovered.auth.setSession({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  });
  const { error: uErr } = await recovered.auth.updateUser({ password: newPassword });
  results.push(["password updated on recovery session", uErr ? `FAIL: ${uErr.message}` : "OK"]);

  // 5 — new password works, old one doesn't
  const { error: newErr } = await anon.auth.signInWithPassword({ email, password: newPassword });
  results.push(["sign-in with NEW password", newErr ? `FAIL: ${newErr.message}` : "OK"]);
  const { error: oldErr } = await anon.auth.signInWithPassword({ email, password: oldPassword });
  results.push(["sign-in with OLD password rejected", oldErr ? "OK — rejected" : "FAIL — still valid"]);
} finally {
  if (userId) await admin.auth.admin.deleteUser(userId);
}

for (const [name, outcome] of results)
  console.log(`${outcome.startsWith("OK") ? "✔" : "✘"} ${name}: ${outcome}`);
if (results.some(([, o]) => !o.startsWith("OK"))) process.exit(1);
console.log("verify-password-reset: all checks passed; throwaway user removed.");
