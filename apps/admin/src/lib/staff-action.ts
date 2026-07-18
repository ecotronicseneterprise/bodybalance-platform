import { assertPermission, PermissionError, type Permission } from "@bodybalance/domain";
import type { UserRole } from "@bodybalance/shared";
import { createClient } from "@/lib/supabase/server";

/**
 * withStaffContext — the ONE gate every admin mutation goes through
 * (SPRINT-2-PLAN 2A). Resolves the caller's staff identity, enforces the
 * platform permission matrix (packages/domain/permissions), then runs the
 * action with the staff context. The matrix is Layer 1 policy (BLUEPRINT
 * 5.5): fixed in code, never clinic-configurable.
 *
 * Split by design: packages/domain owns WHO-MAY-DO-WHAT (framework-free,
 * unit-tested); this file owns the Next.js transport (cookies → session →
 * users row). Server actions call this; nothing mutates without it.
 */

export interface StaffContext {
  userId: string;
  organizationId: string;
  role: UserRole;
  fullName: string;
}

export type StaffActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function withStaffContext<T>(
  permission: Permission,
  action: (ctx: StaffContext) => Promise<T>,
): Promise<StaffActionResult<T>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: staff } = await supabase
    .from("users")
    .select("organization_id, role, full_name")
    .eq("id", user.id)
    .maybeSingle();
  if (!staff) return { ok: false, error: "No clinic linked to this account." };

  try {
    assertPermission(staff.role as UserRole, permission);
  } catch (err) {
    if (err instanceof PermissionError) {
      return { ok: false, error: "You don't have permission to do that." };
    }
    throw err;
  }

  try {
    const data = await action({
      userId: user.id,
      organizationId: staff.organization_id,
      role: staff.role as UserRole,
      fullName: staff.full_name,
    });
    return { ok: true, data };
  } catch (err) {
    console.error(`[staff-action] ${permission} failed:`, err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
