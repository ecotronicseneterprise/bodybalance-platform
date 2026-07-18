import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PERMISSIONS,
  hasPermission,
  assertPermission,
  PermissionError,
} from "./permissions.ts";

test("owner and admin hold every permission", () => {
  for (const p of PERMISSIONS) {
    assert.equal(hasPermission("owner", p), true, `owner missing ${p}`);
    assert.equal(hasPermission("admin", p), true, `admin missing ${p}`);
  }
});

test("receptionist can run the front desk but not configure the clinic", () => {
  assert.equal(hasPermission("receptionist", "confirm_appointments"), true);
  assert.equal(hasPermission("receptionist", "create_bookings"), true);
  assert.equal(hasPermission("receptionist", "view_patients"), true);
  assert.equal(hasPermission("receptionist", "manage_services"), false);
  assert.equal(hasPermission("receptionist", "manage_ai_settings"), false);
  assert.equal(hasPermission("receptionist", "view_audit"), false);
});

test("therapist manages availability but cannot confirm bookings or edit config", () => {
  assert.equal(hasPermission("therapist", "manage_availability"), true);
  assert.equal(hasPermission("therapist", "view_patients"), true);
  assert.equal(hasPermission("therapist", "confirm_appointments"), false);
  assert.equal(hasPermission("therapist", "manage_services"), false);
  assert.equal(hasPermission("therapist", "manage_clinic_settings"), false);
});

test("everyone can submit feedback", () => {
  for (const role of ["owner", "admin", "receptionist", "therapist"] as const) {
    assert.equal(hasPermission(role, "submit_feedback"), true, role);
  }
});

test("assertPermission throws a typed error with role and permission attached", () => {
  assert.doesNotThrow(() => assertPermission("owner", "manage_services"));
  try {
    assertPermission("therapist", "confirm_appointments");
    assert.fail("should have thrown");
  } catch (err) {
    assert.ok(err instanceof PermissionError);
    assert.equal(err.role, "therapist");
    assert.equal(err.permission, "confirm_appointments");
  }
});
