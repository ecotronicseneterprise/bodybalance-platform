import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.gen";

/**
 * Service-role client — SERVER ONLY, bypasses RLS. Used exclusively for
 * platform operations that legitimately cross tenant rows (auth admin,
 * analytics jobs). Never used for patient/AI request flows — those go through
 * withOrgContext() so RLS stays enforced (BLUEPRINT 2.1).
 */
export function createServiceClient(
  url: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
