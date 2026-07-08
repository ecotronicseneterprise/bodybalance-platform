#!/usr/bin/env node
/**
 * Returns the database to a clean state (founder rule: test data must be
 * clearly marked and easily removable).
 *
 * Default: removes TEST USERS ONLY — auth users whose email contains '+test'
 * or ends in '.invalid', plus their users rows and any organizations they
 * created through onboarding (only if that org has no other staff).
 *
 * --wipe-demo : additionally removes the seeded demo org's transactional
 *   data (appointments, patients, chat sessions/messages) and, with
 *   --wipe-demo=all, the demo organization itself. Run before launch.
 *
 * Never touches Cherry's production organization data.
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const read = (p) => readFileSync(p, "utf8").trim();
const DEMO_ORG = "00000000-0000-4000-a000-000000000002";
const wipeDemoArg = process.argv.find((a) => a.startsWith("--wipe-demo"));

const admin = createClient(
  "https://cklgjwqhnttrpggnfpgy.supabase.co",
  read(".secrets/service-role-key.txt"),
  { auth: { persistSession: false } },
);

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
  // ---- 1. test auth users
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = data.users.filter(
    (u) => u.email && (u.email.includes("+test") || u.email.endsWith(".invalid")),
  );
  console.log(`test users found: ${testUsers.length}`);

  for (const u of testUsers) {
    const { rows } = await db.query(
      "select organization_id, role from users where id = $1",
      [u.id],
    );
    const staff = rows[0];
    await db.query("delete from users where id = $1", [u.id]);

    if (staff) {
      const { rows: others } = await db.query(
        "select count(*)::int as n from users where organization_id = $1",
        [staff.organization_id],
      );
      if (others[0].n === 0 && staff.organization_id !== DEMO_ORG) {
        // org created purely by a test onboarding run — remove it entirely
        await purgeOrganization(staff.organization_id);
        console.log(`  removed test org ${staff.organization_id}`);
      }
    }
    await admin.auth.admin.deleteUser(u.id);
    console.log(`  removed ${u.email}`);
  }

  // ---- 2. demo org
  if (wipeDemoArg) {
    console.log("wiping demo org transactional data…");
    await db.query("delete from appointments where organization_id = $1", [DEMO_ORG]);
    await db.query("delete from messages where organization_id = $1", [DEMO_ORG]);
    await db.query("delete from chat_sessions where organization_id = $1", [DEMO_ORG]);
    await db.query("delete from patients where organization_id = $1", [DEMO_ORG]);
    if (wipeDemoArg === "--wipe-demo=all") {
      await purgeOrganization(DEMO_ORG);
      console.log("demo organization fully removed.");
    }
  }

  console.log("cleanup complete.");
} finally {
  await db.end();
}

async function purgeOrganization(orgId) {
  // FK-safe order; audit/version rows have delete-blocking triggers, so
  // disable them for this platform-admin purge (test/demo data only).
  await db.query("alter table audit_logs disable trigger audit_logs_immutable");
  await db.query(
    "alter table knowledge_document_versions disable trigger knowledge_document_versions_immutable",
  );
  try {
    for (const t of [
      "audit_logs",
      "analytics_snapshots",
      "appointments",
      "messages",
      "chat_sessions",
      "patients",
      "knowledge_document_versions",
      "knowledge_documents",
      "approved_resources",
      "therapist_availability",
      "therapists",
      "services",
      "organization_ai_settings",
      "clinic_settings",
      "users",
    ]) {
      await db.query(`delete from ${t} where organization_id = $1`, [orgId]);
    }
    await db.query("delete from organizations where id = $1", [orgId]);
  } finally {
    await db.query("alter table audit_logs enable trigger audit_logs_immutable");
    await db.query(
      "alter table knowledge_document_versions enable trigger knowledge_document_versions_immutable",
    );
  }
}
