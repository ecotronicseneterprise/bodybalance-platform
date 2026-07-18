#!/usr/bin/env node
/**
 * Generates .env.local for apps/admin and apps/web from .secrets/ files.
 * Secrets never pass through chat, git, or shell history.
 * Re-run any time a key rotates. (RUNBOOK.md → Environment variables)
 */
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8").trim();

const PROJECT_REF = "cklgjwqhnttrpggnfpgy";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const anonKey = read(".secrets/anon-key.txt");
const serviceKey = read(".secrets/service-role-key.txt");
const dbPassword = read(".secrets/db-password.txt");

// IPv4 session pooler (direct host does not resolve on this network — RUNBOOK)
const databaseUrl = `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(
  dbPassword,
)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`;

const publicVars = `NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
`;

const serverVars = `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}
DATABASE_URL=${databaseUrl}
`;

writeFileSync("apps/admin/.env.local", publicVars + serverVars);
// apps/web gets PUBLIC vars only (2A audit item): no service-role key, no
// DATABASE_URL until the patient site actually needs a server data path
// (Sprint 3) — least privilege by default.
writeFileSync("apps/web/.env.local", publicVars);

console.log("Wrote apps/admin/.env.local (full) and apps/web/.env.local (public only).");
