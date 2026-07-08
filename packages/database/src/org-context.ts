import pg from "pg";
import type { DbRunner, OrganizationId } from "@bodybalance/shared";

/**
 * RLS-enforced server data path (BLUEPRINT 2.1, migration 20260708150000).
 *
 * Queries run inside a transaction as the non-owner `app_server` role with
 * the tenant GUC set, so Postgres RLS enforces the organization boundary even
 * if application code has a bug. app_server has no DELETE grant — hard
 * deletes are impossible through this path (docs/DB-DECISIONS.md F6).
 *
 * This is the ONLY sanctioned write path for patient/AI server flows.
 * Repositories in @bodybalance/domain are its only intended consumers.
 */

let pool: pg.Pool | undefined;

export function getPool(connectionString: string): pg.Pool {
  pool ??= new pg.Pool({
    connectionString,
    max: 5, // serverless-friendly; Supabase session pooler handles the rest
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

/** Convenience: a reusable org-scoped runner for domain services. */
export function orgRunner(pool: pg.Pool, organizationId: OrganizationId): DbRunner {
  return (fn) => withOrgContext(pool, organizationId, (client) => fn(client));
}

export async function withOrgContext<T>(
  pool: pg.Pool,
  organizationId: OrganizationId,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    // set_config(..., true) + SET LOCAL are transaction-scoped: role and
    // tenant GUC reset automatically at commit/rollback.
    await client.query("select set_config('app.current_organization_id', $1, true)", [
      organizationId,
    ]);
    await client.query("set local role app_server");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
