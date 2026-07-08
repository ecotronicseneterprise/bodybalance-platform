/**
 * @bodybalance/events — domain events (BLUEPRINT 3.15).
 *
 * Core event names are fixed by the blueprint. The in-process emitter and
 * subscriber wiring (audit log, notifications, analytics) are implemented in
 * Task 4. Event delivery is fire-and-forget with respect to safety-critical
 * paths: the emergency guardrail short-circuit (BLUEPRINT 5.3) never waits on
 * or depends on a subscriber.
 */

export type DomainEventName =
  | "PatientRegistered"
  | "AppointmentRequested"
  | "AppointmentConfirmed"
  | "AppointmentDeclined"
  | "AppointmentRescheduled"
  | "ConversationEnded"
  | "EmergencyEscalated"
  | "KnowledgeUploaded"
  | "KnowledgeUpdated";
