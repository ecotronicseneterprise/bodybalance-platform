/**
 * Permission matrix (SPRINT-2-PLAN 2A; BLUEPRINT 5.5 — platform-level).
 * This is Layer 1 policy: fixed in code, identical for every tenant, never
 * clinic-configurable. RLS enforces WHICH clinic's data a staff member can
 * touch; this matrix enforces WHAT they may do inside their clinic.
 *
 * Kept deliberately simple (Linear, not SAP): one flat list of actions and
 * one grant table. Extend by adding an action here + a test — nothing else.
 */
import type { UserRole } from "@bodybalance/shared";

export const PERMISSIONS = [
  "manage_services",
  "manage_practitioners",
  "manage_availability",
  "manage_clinic_settings",
  "manage_ai_settings",
  "manage_knowledge",
  "confirm_appointments",
  "create_bookings",
  "view_patients",
  "view_audit",
  "submit_feedback",
  "manage_feedback",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const ROLE_GRANTS: Record<UserRole, readonly Permission[]> = {
  owner: ALL,
  admin: ALL,
  receptionist: [
    "confirm_appointments",
    "create_bookings",
    "view_patients",
    "submit_feedback",
  ],
  therapist: ["manage_availability", "view_patients", "submit_feedback"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_GRANTS[role].includes(permission);
}

export class PermissionError extends Error {
  readonly role: UserRole;
  readonly permission: Permission;

  constructor(role: UserRole, permission: Permission) {
    super(`Role '${role}' does not have permission '${permission}'`);
    this.name = "PermissionError";
    this.role = role;
    this.permission = permission;
  }
}

/** Throws PermissionError unless the role holds the permission. */
export function assertPermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError(role, permission);
  }
}
