#!/usr/bin/env node
/**
 * Live onboarding verification — the real self-serve path a clinic owner
 * takes (email click simulated via pre-verified test user):
 *  1. new auth user, no users row
 *  2. sign in with anon key (browser path)
 *  3. rpc onboard_organization → clinic created, caller becomes owner
 *  4. org context resolves via the users row (what the dashboard shows)
 *  5. second onboarding attempt refused
 *  6. anon (logged-out) caller refused
 * Cleanup via scripts/cleanup-test-data.mjs conventions (+test marker).
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const read = (p) => readFileSync(p, "utf8").trim();
const URL = "https://cklgjwqhnttrpggnfpgy.supabase.co";
const anonKey = read(".secrets/anon-key.txt");

const admin = createClient(URL, read(".secrets/service-role-key.txt"), {
  auth: { persistSession: false },
});

const email = `onboard+test-${randomUUID().slice(0, 8)}@demo-clinic.invalid`;
const password = randomUUID();
const results = [];
let userId, orgId;

const db = new pg.Client({
  host: "aws-1-eu-west-2.pooler.supabase.com",
  port: 5432,
  user: "postgres.cklgjwqhnttrpggnfpgy",
  database: "postgres",
  password: read(".secrets/db-password.txt"),
  ssl: { rejectUnauthorized: false },
});
await db.connect();

try {
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // simulates the verified-email click
  });
  if (cErr) throw new Error(cErr.message);
  userId = created.user.id;

  const anon = createClient(URL, anonKey, { auth: { persistSession: false } });
  const { data: session, error: sErr } = await anon.auth.signInWithPassword({ email, password });
  results.push(["sign-in as new user", sErr ? `FAIL: ${sErr.message}` : "OK"]);

  const authed = createClient(URL, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  });

  // 3 — onboarding RPC
  const { data: onboard, error: oErr } = await authed.rpc("onboard_organization", {
    p_clinic_name: "Verify Test Clinic",
    p_full_name: "Onboard Test Owner",
    p_city: "Lagos",
    p_whatsapp: "+2340000000097",
  });
  orgId = onboard?.organization_id;
  results.push([
    "onboard_organization RPC",
    oErr ? `FAIL: ${oErr.message}` : `OK — org ${onboard.slug}`,
  ]);

  // 4 — owner context resolves (dashboard query)
  const { data: staff } = await authed
    .from("users")
    .select("role, organizations(name, slug)")
    .eq("id", userId)
    .maybeSingle();
  results.push([
    "first user becomes owner",
    staff?.role === "owner" && staff.organizations?.name === "Verify Test Clinic"
      ? "OK — owner of Verify Test Clinic"
      : `FAIL — ${JSON.stringify(staff)}`,
  ]);

  // settings rows created?
  const { rows } = await db.query(
    `select
       (select count(*)::int from clinic_settings where organization_id = $1) as cs,
       (select count(*)::int from organization_ai_settings where organization_id = $1) as ai,
       (select count(*)::int from audit_logs where organization_id = $1 and action = 'organization.onboarded') as audit`,
    [orgId],
  );
  results.push([
    "defaults + audit created",
    rows[0].cs === 1 && rows[0].ai === 1 && rows[0].audit === 1
      ? "OK — clinic_settings, ai_settings, audit row"
      : `FAIL — ${JSON.stringify(rows[0])}`,
  ]);

  // 5 — double onboarding refused
  const { error: dupErr } = await authed.rpc("onboard_organization", {
    p_clinic_name: "Second Clinic",
    p_full_name: "Onboard Test Owner",
  });
  results.push([
    "second onboarding refused",
    dupErr ? "OK — refused" : "FAIL — allowed twice",
  ]);

  // 6 — anonymous caller refused
  const { error: anonErr } = await anon.rpc("onboard_organization", {
    p_clinic_name: "Anon Clinic",
    p_full_name: "Nobody",
  });
  results.push(["anonymous onboarding refused", anonErr ? "OK — refused" : "FAIL — allowed"]);
} finally {
  // cleanup: test org + user (audit trigger disabled only for this purge)
  if (orgId) {
    await db.query("alter table audit_logs disable trigger audit_logs_immutable");
    try {
      await db.query("delete from audit_logs where organization_id = $1", [orgId]);
      await db.query("delete from users where organization_id = $1", [orgId]);
      await db.query("delete from organization_ai_settings where organization_id = $1", [orgId]);
      await db.query("delete from clinic_settings where organization_id = $1", [orgId]);
      await db.query("delete from organizations where id = $1", [orgId]);
    } finally {
      await db.query("alter table audit_logs enable trigger audit_logs_immutable");
    }
  }
  if (userId) await admin.auth.admin.deleteUser(userId);
  await db.end();
}

for (const [name, outcome] of results)
  console.log(`${outcome.startsWith("OK") ? "✔" : "✘"} ${name}: ${outcome}`);
if (results.some(([, o]) => !o.startsWith("OK"))) process.exit(1);
console.log("verify-onboarding: all checks passed; test data removed.");
