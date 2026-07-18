/**
 * Repositories — the ONLY code that writes SQL for business data
 * (BLUEPRINT 4.2: AI → domain services → repositories → database).
 * Every function takes an org-scoped DbClient from withOrgContext(); RLS is
 * live underneath every query here.
 */
import type { DbClient } from "@bodybalance/shared";
import type { AvailabilityWindow, BusyInterval } from "./availability.ts";

export interface ServiceRow {
  id: string;
  name: string;
  duration_minutes: number;
  price_amount_minor: number;
  price_currency: string;
  active: boolean;
}

export interface PractitionerRow {
  id: string;
  display_name: string;
  credentials: string | null;
  active: boolean;
}

export interface ClinicSettingsRow {
  timezone: string;
  booking_lead_time_minutes: number;
  booking_horizon_days: number;
  whatsapp_number: string | null;
}

export async function getActiveService(
  db: DbClient,
  serviceId: string,
): Promise<ServiceRow | null> {
  const { rows } = await db.query(
    `select id, name, duration_minutes, price_amount_minor, price_currency, active
       from services
      where id = $1 and active and deleted_at is null`,
    [serviceId],
  );
  return (rows[0] as ServiceRow | undefined) ?? null;
}

export async function getActivePractitioner(
  db: DbClient,
  practitionerId: string,
): Promise<PractitionerRow | null> {
  const { rows } = await db.query(
    `select id, display_name, credentials, active
       from therapists
      where id = $1 and active and deleted_at is null`,
    [practitionerId],
  );
  return (rows[0] as PractitionerRow | undefined) ?? null;
}

export async function getClinicSettings(db: DbClient): Promise<ClinicSettingsRow | null> {
  const { rows } = await db.query(
    `select timezone, booking_lead_time_minutes, booking_horizon_days, whatsapp_number
       from clinic_settings
      where organization_id = app.current_org_id()`,
  );
  return (rows[0] as ClinicSettingsRow | undefined) ?? null;
}

export async function getAvailabilityWindows(
  db: DbClient,
  practitionerId: string,
): Promise<AvailabilityWindow[]> {
  const { rows } = await db.query(
    `select day_of_week, to_char(specific_date, 'YYYY-MM-DD') as specific_date,
            to_char(start_time, 'HH24:MI') as start_time,
            to_char(end_time, 'HH24:MI') as end_time,
            is_blocked
       from therapist_availability
      where therapist_id = $1`,
    [practitionerId],
  );
  return rows as AvailabilityWindow[];
}

export async function getLiveAppointments(
  db: DbClient,
  practitionerId: string,
  from: Date,
  to: Date,
): Promise<BusyInterval[]> {
  const { rows } = await db.query(
    `select scheduled_start, scheduled_end
       from appointments
      where therapist_id = $1
        and status in ('pending_confirmation', 'confirmed')
        and scheduled_end > $2 and scheduled_start < $3`,
    [practitionerId, from.toISOString(), to.toISOString()],
  );
  return (rows as { scheduled_start: string; scheduled_end: string }[]).map((r) => ({
    start: new Date(r.scheduled_start),
    end: new Date(r.scheduled_end),
  }));
}

export interface PatientContact {
  fullName: string;
  phone?: string;
  email?: string;
}

/** Find a patient by phone/email within the org, or create one.
 * Returns [patientId, created]. */
export async function findOrCreatePatient(
  db: DbClient,
  organizationId: string,
  contact: PatientContact,
): Promise<[string, boolean]> {
  const { rows: existing } = await db.query(
    `select id from patients
      where anonymized_at is null
        and ((phone is not null and phone = $1) or (email is not null and email = $2))
      limit 1`,
    [contact.phone ?? null, contact.email?.toLowerCase() ?? null],
  );
  const found = existing[0] as { id: string } | undefined;
  if (found) return [found.id, false];

  const { rows } = await db.query(
    `insert into patients (organization_id, full_name, phone, email)
     values ($1, $2, $3, $4)
     returning id`,
    [
      organizationId,
      contact.fullName,
      contact.phone ?? null,
      contact.email?.toLowerCase() ?? null,
    ],
  );
  return [(rows[0] as { id: string }).id, true];
}

export interface NewAppointment {
  organizationId: string;
  patientId: string;
  practitionerId: string;
  serviceId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  source: "ai_chat" | "manual";
  chatSessionId?: string;
  qualificationSummary?: Record<string, unknown>;
}

export async function insertPendingAppointment(
  db: DbClient,
  a: NewAppointment,
): Promise<string> {
  // status is intentionally NOT a parameter: DB default = pending_confirmation
  // (BLUEPRINT 5.2 rule 3, DB-DECISIONS R7).
  const { rows } = await db.query(
    `insert into appointments
       (organization_id, patient_id, therapist_id, service_id,
        scheduled_start, scheduled_end, source, chat_session_id, qualification_summary)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [
      a.organizationId,
      a.patientId,
      a.practitionerId,
      a.serviceId,
      a.scheduledStart.toISOString(),
      a.scheduledEnd.toISOString(),
      a.source,
      a.chatSessionId ?? null,
      a.qualificationSummary ? JSON.stringify(a.qualificationSummary) : null,
    ],
  );
  return (rows[0] as { id: string }).id;
}

export async function getAppointmentStatus(
  db: DbClient,
  appointmentId: string,
): Promise<string | null> {
  const { rows } = await db.query(`select status from appointments where id = $1`, [
    appointmentId,
  ]);
  return (rows[0] as { status: string } | undefined)?.status ?? null;
}

export async function updateAppointmentStatus(
  db: DbClient,
  appointmentId: string,
  status: string,
  setConfirmedAt: boolean,
): Promise<void> {
  await db.query(
    `update appointments
        set status = $2,
            confirmed_at = case when $3 then now() else confirmed_at end
      where id = $1`,
    [appointmentId, status, setConfirmedAt],
  );
}

export async function insertAuditLog(
  db: DbClient,
  entry: {
    organizationId: string;
    actorType: string;
    userId?: string;
    action: string;
    entity: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  await db.query(
    `insert into audit_logs
       (organization_id, actor_type, user_id, action, entity, entity_id, before, after)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.organizationId,
      entry.actorType,
      entry.userId ?? null,
      entry.action,
      entry.entity,
      entry.entityId ?? null,
      entry.before ? JSON.stringify(entry.before) : null,
      entry.after ? JSON.stringify(entry.after) : null,
    ],
  );
}
