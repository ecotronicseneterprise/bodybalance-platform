/**
 * BookingService (BLUEPRINT 4.2) — the ONE place booking rules live.
 * Both the AI's create_booking tool (Sprint 4) and the admin dashboard
 * (Sprint 2) call these functions; neither can bypass them.
 *
 * Rules enforced here, once:
 *  - slot must be validated against availability before insert
 *  - an appointment is always created pending_confirmation (DB default; this
 *    code never sets status on insert)
 *  - only explicit staff action moves status; transitions are a fixed map
 *  - events are emitted AFTER the transaction commits, never inside it
 *  - the DB exclusion constraint is the concurrency backstop — a race that
 *    slips past validation surfaces as SlotUnavailableError, not a double booking
 */
import type { DbRunner } from "@bodybalance/shared";
import type { EventBus, EventActor } from "@bodybalance/events";
import {
  computeSlots,
  isSlotAvailable,
  type SlotComputationOptions,
} from "./availability.ts";
import * as repo from "./repositories.ts";

export type BookingErrorCode =
  | "service_not_found"
  | "therapist_not_found"
  | "clinic_not_configured"
  | "slot_unavailable"
  | "invalid_transition";

export class BookingError extends Error {
  readonly code: BookingErrorCode;

  constructor(code: BookingErrorCode, message: string) {
    super(message);
    this.name = "BookingError";
    this.code = code;
  }
}

export interface BookingRequest {
  organizationId: string;
  patient: repo.PatientContact;
  serviceId: string;
  therapistId: string;
  slotStart: Date;
  source: "ai_chat" | "manual";
  chatSessionId?: string;
  qualificationSummary?: Record<string, unknown>;
}

export interface BookingReceipt {
  appointmentId: string;
  patientId: string;
  status: "pending_confirmation";
  scheduledStart: string;
  scheduledEnd: string;
  serviceName: string;
  therapistName: string;
}

interface Deps {
  runner: DbRunner;
  bus: EventBus;
  now?: () => Date;
}

export async function getBookableSlots(
  deps: Pick<Deps, "runner" | "now">,
  therapistId: string,
  serviceId: string,
): Promise<{ slots: Date[]; durationMinutes: number }> {
  return deps.runner(async (db) => {
    const [service, settings, windows] = await Promise.all([
      repo.getActiveService(db, serviceId),
      repo.getClinicSettings(db),
      repo.getAvailabilityWindows(db, therapistId),
    ]);
    if (!service) throw new BookingError("service_not_found", "Unknown or inactive service");
    if (!settings) throw new BookingError("clinic_not_configured", "Clinic settings missing");

    const now = deps.now?.() ?? new Date();
    const to = new Date(now.getTime() + settings.booking_horizon_days * 86_400_000);
    const busy = await repo.getLiveAppointments(db, therapistId, now, to);

    const opts: SlotComputationOptions = {
      timeZone: settings.timezone,
      durationMinutes: service.duration_minutes,
      leadTimeMinutes: settings.booking_lead_time_minutes,
      horizonDays: settings.booking_horizon_days,
      now,
    };
    return { slots: computeSlots(windows, busy, opts), durationMinutes: service.duration_minutes };
  });
}

export async function requestBooking(
  deps: Deps,
  req: BookingRequest,
  actor: EventActor,
): Promise<BookingReceipt> {
  let patientCreated = false;

  const receipt = await deps.runner(async (db) => {
    const [service, therapist, settings] = await Promise.all([
      repo.getActiveService(db, req.serviceId),
      repo.getActiveTherapist(db, req.therapistId),
      repo.getClinicSettings(db),
    ]);
    if (!service) throw new BookingError("service_not_found", "Unknown or inactive service");
    if (!therapist) throw new BookingError("therapist_not_found", "Unknown or inactive therapist");
    if (!settings) throw new BookingError("clinic_not_configured", "Clinic settings missing");

    const now = deps.now?.() ?? new Date();
    const windows = await repo.getAvailabilityWindows(db, req.therapistId);
    const to = new Date(now.getTime() + settings.booking_horizon_days * 86_400_000);
    const busy = await repo.getLiveAppointments(db, req.therapistId, now, to);

    const opts: SlotComputationOptions = {
      timeZone: settings.timezone,
      durationMinutes: service.duration_minutes,
      leadTimeMinutes: settings.booking_lead_time_minutes,
      horizonDays: settings.booking_horizon_days,
      now,
    };
    if (!isSlotAvailable(req.slotStart, windows, busy, opts)) {
      throw new BookingError("slot_unavailable", "Requested slot is not available");
    }

    const [patientId, created] = await repo.findOrCreatePatient(
      db,
      req.organizationId,
      req.patient,
    );
    patientCreated = created;

    const scheduledEnd = new Date(
      req.slotStart.getTime() + service.duration_minutes * 60_000,
    );

    let appointmentId: string;
    try {
      appointmentId = await repo.insertPendingAppointment(db, {
        organizationId: req.organizationId,
        patientId,
        therapistId: req.therapistId,
        serviceId: req.serviceId,
        scheduledStart: req.slotStart,
        scheduledEnd,
        source: req.source,
        chatSessionId: req.chatSessionId,
        qualificationSummary: req.qualificationSummary,
      });
    } catch (err) {
      // 23P01 = exclusion_violation: a concurrent request won the slot
      if ((err as { code?: string }).code === "23P01") {
        throw new BookingError("slot_unavailable", "Slot was just taken");
      }
      throw err;
    }

    return {
      appointmentId,
      patientId,
      status: "pending_confirmation" as const,
      scheduledStart: req.slotStart.toISOString(),
      scheduledEnd: scheduledEnd.toISOString(),
      serviceName: service.name,
      therapistName: therapist.display_name,
    };
  });

  // AFTER commit only (BLUEPRINT 3.15)
  if (patientCreated) {
    deps.bus.emit(
      "PatientRegistered",
      { organizationId: req.organizationId, patientId: receipt.patientId },
      actor,
    );
  }
  deps.bus.emit(
    "AppointmentRequested",
    {
      organizationId: req.organizationId,
      appointmentId: receipt.appointmentId,
      patientId: receipt.patientId,
      therapistId: req.therapistId,
      serviceId: req.serviceId,
      scheduledStart: receipt.scheduledStart,
      source: req.source,
    },
    actor,
  );

  return receipt;
}

/** Allowed status transitions — staff actions only (BLUEPRINT 3.8). */
const TRANSITIONS: Record<string, string[]> = {
  pending_confirmation: ["confirmed", "declined"],
  confirmed: ["rescheduled", "cancelled", "completed", "no_show"],
  rescheduled: ["confirmed", "cancelled"],
};

export async function transitionAppointment(
  deps: Deps,
  organizationId: string,
  appointmentId: string,
  toStatus: "confirmed" | "declined" | "rescheduled" | "cancelled" | "completed" | "no_show",
  actor: EventActor,
): Promise<void> {
  if (actor.type === "ai_system") {
    // Defense in depth for BLUEPRINT 5.2 rule 3 — the AI can never move status.
    throw new BookingError("invalid_transition", "AI may not change appointment status");
  }

  await deps.runner(async (db) => {
    const current = await repo.getAppointmentStatus(db, appointmentId);
    if (!current || !TRANSITIONS[current]?.includes(toStatus)) {
      throw new BookingError(
        "invalid_transition",
        `Cannot move appointment from '${current}' to '${toStatus}'`,
      );
    }
    await repo.updateAppointmentStatus(db, appointmentId, toStatus, toStatus === "confirmed");
  });

  if (toStatus === "confirmed") {
    deps.bus.emit("AppointmentConfirmed", { organizationId, appointmentId }, actor);
  } else if (toStatus === "declined") {
    deps.bus.emit("AppointmentDeclined", { organizationId, appointmentId }, actor);
  }
}
