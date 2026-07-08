#!/usr/bin/env node
/**
 * TEST-ONLY staff account creation (founder decision 2026-07-08: real owners
 * are created exclusively through the self-serve signup + onboarding flow).
 *
 * Guard: the email MUST contain '+test' or end in '.invalid' so test users
 * are unmistakable and removable by scripts/cleanup-test-data.mjs.
 *
 * Usage:
 *   node scripts/create-staff-user.mjs <email> "<full name>" <org-slug> <role>
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

if (!email.includes("+test") && !email.endsWith(".invalid")) {
  console.error(
    "REFUSED: this script is TEST-ONLY. Real staff join via signup + onboarding.\n" +
      "Test emails must contain '+test' or end in '.invalid' (cleanable by cleanup-test-data.mjs).",
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
