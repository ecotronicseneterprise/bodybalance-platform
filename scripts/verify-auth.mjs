#!/usr/bin/env node
/**
 * Live auth + org-context verification (Task 3).
 * 1. Creates a throwaway staff user on the DEMO org (service role).
 * 2. Signs in with the ANON key — the exact path the admin browser uses.
 * 3. Asserts the RLS-scoped users query resolves the demo org context.
 * 4. Asserts Cherry's organization rows are NOT visible to this staff user.
 * 5. Deletes the throwaway user.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const read = (p) => readFileSync(p, "utf8").trim();
const URL = "https://cklgjwqhnttrpggnfpgy.supabase.co";
const DEMO_ORG = "00000000-0000-4000-a000-000000000002";
const CHERRY_ORG = "00000000-0000-4000-a000-000000000001";

const admin = createClient(URL, read(".secrets/service-role-key.txt"), {
  auth: { persistSession: false },
});

const email = `verify-${randomUUID().slice(0, 8)}@demo-clinic.invalid`;
const password = randomUUID();

const results = [];
let userId;

try {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr) throw new Error(`createUser: ${cErr.message}`);
  userId = created.user.id;

  const { error: lErr } = await admin.from("users").insert({
    id: userId,
    organization_id: DEMO_ORG,
    role: "admin",
    full_name: "Verify Bot",
    email,
  });
  if (lErr) throw new Error(`users insert: ${lErr.message}`);

  // --- browser-equivalent path: anon key + password sign-in
  const anon = createClient(URL, read(".secrets/anon-key.txt"), {
    auth: { persistSession: false },
  });
  const { data: session, error: sErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  results.push([
    "password sign-in with anon key",
    sErr ? `FAIL: ${sErr.message}` : "OK",
  ]);

  const authed = createClient(URL, read(".secrets/anon-key.txt"), {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${session.session.access_token}` },
    },
  });

  const { data: staff } = await authed
    .from("users")
    .select("full_name, role, organization_id, organizations(name, slug)")
    .eq("id", userId)
    .maybeSingle();
  results.push([
    "org context resolution (RLS-scoped users query)",
    staff?.organizations?.slug === "demo-clinic"
      ? `OK — resolved to ${staff.organizations.name}`
      : `FAIL — got ${JSON.stringify(staff)}`,
  ]);

  const { data: cherryAi } = await authed
    .from("organization_ai_settings")
    .select("organization_id")
    .eq("organization_id", CHERRY_ORG);
  results.push([
    "cross-tenant isolation (Cherry ai_settings invisible)",
    (cherryAi ?? []).length === 0 ? "OK — 0 rows" : `FAIL — ${cherryAi.length} rows leaked`,
  ]);

  const { data: cherryPatients } = await authed
    .from("patients")
    .select("id")
    .eq("organization_id", CHERRY_ORG);
  results.push([
    "cross-tenant isolation (Cherry patients invisible)",
    (cherryPatients ?? []).length === 0 ? "OK — 0 rows" : "FAIL — leaked",
  ]);
} finally {
  if (userId) {
    await admin.from("users").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
}

for (const [name, outcome] of results) console.log(`${outcome.startsWith("OK") ? "✔" : "✘"} ${name}: ${outcome}`);
if (results.some(([, o]) => !o.startsWith("OK"))) process.exit(1);
console.log("verify-auth: all checks passed; throwaway user removed.");
