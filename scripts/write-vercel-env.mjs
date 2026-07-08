#!/usr/bin/env node
/** Writes .secrets/vercel-env-admin.txt — paste its contents into Vercel's
 * environment variables screen (it accepts .env-format bulk paste).
 * Gitignored; regenerate after any key rotation. */
import { readFileSync, writeFileSync } from "node:fs";

const read = (p) => readFileSync(p, "utf8").trim();
const REF = "cklgjwqhnttrpggnfpgy";
const dbUrl = `postgresql://postgres.${REF}:${encodeURIComponent(
  read(".secrets/db-password.txt"),
)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`;

writeFileSync(
  ".secrets/vercel-env-admin.txt",
  [
    `NEXT_PUBLIC_SUPABASE_URL=https://${REF}.supabase.co`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${read(".secrets/anon-key.txt")}`,
    `SUPABASE_SERVICE_ROLE_KEY=${read(".secrets/service-role-key.txt")}`,
    `DATABASE_URL=${dbUrl}`,
    "",
  ].join("\n"),
);
console.log("wrote .secrets/vercel-env-admin.txt (gitignored)");
