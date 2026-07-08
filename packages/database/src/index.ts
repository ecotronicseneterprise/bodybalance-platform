/**
 * @bodybalance/database — Supabase clients + generated types (BLUEPRINT 4.1).
 *
 * LAYERING RULE (BLUEPRINT 4.2): business data access goes through
 * @bodybalance/domain repositories only. Apps may import auth-related client
 * factories for session handling; they never query business tables directly.
 */

export type { Database, Tables, TablesInsert, TablesUpdate } from "./types.gen";
export { createServiceClient } from "./service-client";
export { getPool, withOrgContext } from "./org-context";
