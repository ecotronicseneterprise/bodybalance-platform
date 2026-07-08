/**
 * Audit subscriber (BLUEPRINT 3.16): every domain event writes an immutable
 * audit row via its own org-scoped transaction. Registered on the event bus —
 * publishers never write audit rows inline, and a failing audit write never
 * breaks the action that emitted the event (fire-and-forget, 3.15).
 */
import type { DbRunner } from "@bodybalance/shared";
import type { EventBus, EventEnvelope } from "@bodybalance/events";
import { insertAuditLog } from "./repositories.ts";

export function registerAuditSubscribers(
  bus: EventBus,
  getRunner: (organizationId: string) => DbRunner,
): void {
  const record =
    (action: string, entity: string, entityIdKey: string) =>
    async (event: EventEnvelope) => {
      const payload = event.payload as Record<string, unknown>;
      const organizationId = payload.organizationId as string;
      await getRunner(organizationId)(async (db) => {
        await insertAuditLog(db, {
          organizationId,
          actorType: event.actor.type,
          userId: event.actor.userId,
          action,
          entity,
          entityId: payload[entityIdKey] as string | undefined,
          after: payload,
        });
      });
    };

  bus.on("PatientRegistered", record("patient.registered", "patients", "patientId"));
  bus.on("AppointmentRequested", record("booking.requested", "appointments", "appointmentId"));
  bus.on("AppointmentConfirmed", record("booking.confirmed", "appointments", "appointmentId"));
  bus.on("AppointmentDeclined", record("booking.declined", "appointments", "appointmentId"));
  bus.on("AppointmentRescheduled", record("booking.rescheduled", "appointments", "appointmentId"));
  bus.on("ConversationEnded", record("conversation.ended", "chat_sessions", "chatSessionId"));
  bus.on("EmergencyEscalated", record("emergency.escalated", "chat_sessions", "chatSessionId"));
  bus.on("KnowledgeUploaded", record("knowledge.uploaded", "knowledge_documents", "knowledgeDocumentId"));
  bus.on("KnowledgeUpdated", record("knowledge.updated", "knowledge_documents", "knowledgeDocumentId"));
}
