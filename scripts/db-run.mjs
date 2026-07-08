#!/usr/bin/env node
/**
 * Ops script: run a SQL file or inline query against the linked Supabase
 * database. Dev/ops use only — application code NEVER uses this path
 * (BLUEPRINT 4.2: apps go through domain services -> packages/database).
 *
 * Usage:
 *   node scripts/db-run.mjs supabase/seed/seed.sql
 *   node scripts/db-run.mjs --query "select count(*) from public.organizations"
 *
 * Credentials: reads .secrets/db-password.txt (gitignored). Tries the direct
 * host first, then the IPv4 session pooler.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const PROJECT_REF = "cklgjwqhnttrpggnfpgy";
const REGION = "eu-west-2";

const password = readFileSync(".secrets/db-password.txt", "utf8").trim();

const candidates = [
  { host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: "postgres" },
  { host: `aws-0-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_REF}` },
  { host: `aws-1-${REGION}.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_REF}` },
];

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/db-run.mjs <file.sql> | --query \"<sql>\"");
  process.exit(1);
}
const sql =
  arg === "--query" ? process.argv[3] : readFileSync(arg, "utf8");

async function connect() {
  let lastErr;
  for (const c of candidates) {
    const client = new pg.Client({
      ...c,
      database: "postgres",
      password,
      // Ops script only: Supabase requires TLS; CA pinning is not set up for
      // this dev path. Application traffic uses supabase-js over HTTPS.
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10_000,
    });
    try {
      await client.connect();
      console.error(`connected via ${c.host}`);
      return client;
    } catch (err) {
      lastErr = err;
      console.error(`failed ${c.host}: ${err.code ?? err.message}`);
    }
  }
  throw lastErr;
}

const client = await connect();
try {
  const result = await client.query(sql);
  const results = Array.isArray(result) ? result : [result];
  for (const r of results) {
    if (r.rows?.length) console.log(JSON.stringify(r.rows, null, 2));
    else console.log(`${r.command}: ${r.rowCount ?? 0} rows`);
  }
} finally {
  await client.end();
}
