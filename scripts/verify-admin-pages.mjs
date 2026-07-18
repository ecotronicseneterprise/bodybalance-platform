#!/usr/bin/env node
/**
 * Authenticated page-render smoke (2A polish): signs in a throwaway staff
 * user on the demo org, builds the exact @supabase/ssr cookie the browser
 * would hold, and requests every nav page from a running admin server —
 * asserting each returns 200 and contains its expected heading (i.e. renders
 * real content, not a blank or an error boundary).
 *
 * Usage: node scripts/verify-admin-pages.mjs [baseUrl]   (default :3101)
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const base = process.argv[2] ?? "http://localhost:3101";
const read = (p) => readFileSync(p, "utf8").trim();
const URL_ = "https://cklgjwqhnttrpggnfpgy.supabase.co";
const REF = "cklgjwqhnttrpggnfpgy";
const DEMO_ORG = "00000000-0000-4000-a000-000000000002";

const admin = createClient(URL_, read(".secrets/service-role-key.txt"), {
  auth: { persistSession: false },
});

const email = `pages+test-${randomUUID().slice(0, 8)}@demo-clinic.invalid`;
const password = randomUUID();
let userId;
const results = [];

const PAGES = [
  ["/", "Good"],
  ["/appointments", "Appointments"],
  ["/patients", "Patients"],
  ["/services", "Services"],
  ["/practitioners", "Practitioners"],
  ["/knowledge", "Teach your assistant"],
  ["/ai-assistant", "AI Assistant"],
  ["/clinic-settings", "Clinic Settings"],
  ["/feedback", "Feedback"],
];

try {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr) throw new Error(cErr.message);
  userId = created.user.id;
  const { error: lErr } = await admin.from("users").insert({
    id: userId,
    organization_id: DEMO_ORG,
    role: "owner",
    full_name: "Pages Smoke Bot",
    email,
  });
  if (lErr) throw new Error(lErr.message);

  const anon = createClient(URL_, read(".secrets/anon-key.txt"), {
    auth: { persistSession: false },
  });
  const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (sErr) throw new Error(sErr.message);

  // The exact cookie shape @supabase/ssr reads: sb-<ref>-auth-token,
  // "base64-" + base64url(JSON(session)), chunked at ~3180 chars if needed.
  const raw =
    "base64-" +
    Buffer.from(JSON.stringify(signIn.session)).toString("base64url");
  const CHUNK = 3180;
  const cookies =
    raw.length <= CHUNK
      ? [`sb-${REF}-auth-token=${raw}`]
      : Array.from({ length: Math.ceil(raw.length / CHUNK) }, (_, i) =>
          `sb-${REF}-auth-token.${i}=${raw.slice(i * CHUNK, (i + 1) * CHUNK)}`,
        );
  const cookieHeader = cookies.join("; ");

  for (const [path, expect] of PAGES) {
    const res = await fetch(`${base}${path}`, {
      headers: { cookie: cookieHeader },
      redirect: "manual",
    });
    const body = res.status === 200 ? await res.text() : "";
    const ok = res.status === 200 && body.includes(expect);
    results.push([
      path,
      ok
        ? "OK — 200, renders"
        : `FAIL — status ${res.status}${res.status === 200 ? `, missing "${expect}"` : ""}`,
    ]);
  }
} finally {
  if (userId) {
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

for (const [name, outcome] of results)
  console.log(`${outcome.startsWith("OK") ? "✔" : "✘"} ${name}: ${outcome}`);
if (results.length === 0 || results.some(([, o]) => !o.startsWith("OK")))
  process.exit(1);
console.log("verify-admin-pages: all authenticated pages render; bot removed.");
