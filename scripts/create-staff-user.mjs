#!/usr/bin/env node
/**
 * Creates a staff account: Supabase Auth user + linked public.users row.
 * Platform-admin operation (service role) — used until self-serve onboarding
 * exists (Sprint 2A). Password is prompted, never passed as an argument
 * (keeps it out of shell history).
 *
 * Usage:
 *   node scripts/create-staff-user.mjs <email> <full name> <org-slug> <role>
 * Example:
 *   node scripts/create-staff-user.mjs cherry@example.com "Cherry Nwanna" bodybalance owner
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";

const [email, fullName, orgSlug, role] = process.argv.slice(2);
if (!email || !fullName || !orgSlug || !role) {
  console.error(
    'Usage: node scripts/create-staff-user.mjs <email> "<full name>" <org-slug> <owner|therapist|receptionist|admin>',
  );
  process.exit(1);
}

const read = (p) => readFileSync(p, "utf8").trim();
const supabase = createClient(
  "https://cklgjwqhnttrpggnfpgy.supabase.co",
  read(".secrets/service-role-key.txt"),
  { auth: { persistSession: false } },
);

let password = process.env.BB_STAFF_PASSWORD;
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  password = await rl.question(`Password for ${email} (min 8 chars): `);
  rl.close();
}
if (password.length < 8) {
  console.error("Password too short.");
  process.exit(1);
}

const { data: org, error: orgError } = await supabase
  .from("organizations")
  .select("id, name")
  .eq("slug", orgSlug)
  .single();
if (orgError || !org) {
  console.error(`Organization '${orgSlug}' not found:`, orgError?.message);
  process.exit(1);
}

const { data: created, error: authError } =
  await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
if (authError) {
  console.error("Auth user creation failed:", authError.message);
  process.exit(1);
}

const { error: linkError } = await supabase.from("users").insert({
  id: created.user.id,
  organization_id: org.id,
  role,
  full_name: fullName,
  email: email.toLowerCase(),
});
if (linkError) {
  console.error("users row insert failed:", linkError.message);
  console.error("Auth user was created; fix and re-insert the users row manually.");
  process.exit(1);
}

console.log(`OK: ${fullName} <${email}> — ${role} at ${org.name} (${orgSlug})`);
