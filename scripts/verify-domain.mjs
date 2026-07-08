#!/usr/bin/env node
/**
 * Live Task 4 verification — the full booking path through the real layers:
 * BookingService -> repositories -> withOrgContext (RLS, app_server) -> DB,
 * with the event bus feeding the audit subscriber.
 *
 * Checks:
 *  1. getBookableSlots returns deterministic slots for the demo therapist
 *  2. requestBooking creates a pending_confirmation appointment
 *  3. same slot again through the SERVICE -> slot_unavailable
 *  4. AI actor cannot transition status (5.2 rule 3, defense in depth)
 *  5. staff confirm succeeds; audit rows written by event subscribers
 * Cleanup: test rows removed with the postgres role (app_server cannot delete).
 */
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { getPool, orgRunner } from "@bodybalance/database";
import { createEventBus } from "@bodybalance/events";
import {
  requestBooking,
  transitionAppointment,
  getBookableSlots,
  registerAuditSubscribers,
  BookingError,
} from "@bodybalance/domain";

const read = (p) => readFileSync(p, "utf8").trim();
const DEMO_ORG = "00000000-0000-4000-a000-000000000002";
const DEMO_THERAPIST = "00000000-0000-4000-b000-000000000002";
const DEMO_SERVICE = "00000000-0000-4000-c000-000000000003";

const dbUrl = `postgresql://postgres.cklgjwqhnttrpggnfpgy:${encodeURIComponent(
  read(".secrets/db-password.txt"),
)}@aws-1-eu-west-2.pooler.supabase.com:5432/postgres`;

const pool = getPool(dbUrl);
const bus = createEventBus();
registerAuditSubscribers(bus, (orgId) => orgRunner(pool, orgId));

const deps = { runner: orgRunner(pool, DEMO_ORG), bus };
const results = [];
let appointmentId, patientId;

try {
  // 1 — deterministic slots
  const { slots } = await getBookableSlots(deps, DEMO_THERAPIST, DEMO_SERVICE);
  results.push(["bookable slots computed", slots.length > 0 ? `OK — ${slots.length} slots, first ${slots[0].toISOString()}` : "FAIL — no slots"]);

  // 2 — booking lands pending
  const receipt = await requestBooking(
    deps,
    {
      organizationId: DEMO_ORG,
      patient: { fullName: "Verify Domain Bot", phone: "+2340000000099" },
      serviceId: DEMO_SERVICE,
      therapistId: DEMO_THERAPIST,
      slotStart: slots[0],
      source: "ai_chat",
      qualificationSummary: { pain_location: "lower back", severity: 5 },
    },
    { type: "ai_system" },
  );
  appointmentId = receipt.appointmentId;
  patientId = receipt.patientId;
  results.push(["booking created pending", receipt.status === "pending_confirmation" ? "OK" : `FAIL — ${receipt.status}`]);

  // 3 — same slot rejected by the service
  try {
    await requestBooking(
      deps,
      {
        organizationId: DEMO_ORG,
        patient: { fullName: "Second Bot", phone: "+2340000000098" },
        serviceId: DEMO_SERVICE,
        therapistId: DEMO_THERAPIST,
        slotStart: slots[0],
        source: "ai_chat",
      },
      { type: "ai_system" },
    );
    results.push(["double-booking via service", "FAIL — accepted"]);
  } catch (err) {
    results.push([
      "double-booking via service",
      err instanceof BookingError && err.code === "slot_unavailable" ? "OK — slot_unavailable" : `FAIL — ${err.message}`,
    ]);
  }

  // 4 — AI actor cannot move status
  try {
    await transitionAppointment(deps, DEMO_ORG, appointmentId, "confirmed", { type: "ai_system" });
    results.push(["AI cannot confirm", "FAIL — transition allowed"]);
  } catch (err) {
    results.push([
      "AI cannot confirm",
      err instanceof BookingError && err.code === "invalid_transition" ? "OK — refused" : `FAIL — ${err.message}`,
    ]);
  }

  // 5 — staff confirm + audit trail via events
  await transitionAppointment(deps, DEMO_ORG, appointmentId, "confirmed", { type: "staff_user" });
  await sleep(1500); // fire-and-forget subscribers
  const auditCount = await deps.runner(async (db) => {
    const { rows } = await db.query(
      `select count(*)::int as n from audit_logs where entity_id = $1`,
      [appointmentId],
    );
    return rows[0].n;
  });
  results.push(["staff confirm + audit trail", auditCount >= 2 ? `OK — ${auditCount} audit rows` : `FAIL — ${auditCount} audit rows`]);
} finally {
  // cleanup as postgres (owner) — test rows only
  if (appointmentId) await pool.query("delete from appointments where id = $1", [appointmentId]);
  if (patientId) await pool.query("delete from patients where id = $1", [patientId]);
  await pool.query("delete from patients where phone = '+2340000000098'");
  await pool.end();
}

for (const [name, outcome] of results) console.log(`${outcome.startsWith("OK") ? "✔" : "✘"} ${name}: ${outcome}`);
if (results.some(([, o]) => !o.startsWith("OK"))) process.exit(1);
console.log("verify-domain: all checks passed; test rows removed.");
