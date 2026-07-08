/**
 * @bodybalance/events — domain events (BLUEPRINT 3.15).
 *
 * Lightweight in-process pub/sub. Two hard rules from the blueprint:
 *  1. Events are emitted AFTER the state change commits — a rolled-back
 *     transaction never announces anything.
 *  2. Delivery is fire-and-forget: a failing subscriber is logged, never
 *     rethrown. Safety-critical logic NEVER depends on event delivery.
 */

export interface EventActor {
  type: "staff_user" | "ai_system" | "patient" | "platform_admin";
  userId?: string;
}

export interface DomainEvents {
  PatientRegistered: {
    organizationId: string;
    patientId: string;
  };
  AppointmentRequested: {
    organizationId: string;
    appointmentId: string;
    patientId: string;
    therapistId: string;
    serviceId: string;
    scheduledStart: string; // ISO
    source: "ai_chat" | "manual";
  };
  AppointmentConfirmed: {
    organizationId: string;
    appointmentId: string;
  };
  AppointmentDeclined: {
    organizationId: string;
    appointmentId: string;
  };
  AppointmentRescheduled: {
    organizationId: string;
    appointmentId: string;
    scheduledStart: string;
  };
  ConversationEnded: {
    organizationId: string;
    chatSessionId: string;
    outcome: "booked" | "escalated_emergency" | "abandoned" | "handed_to_human";
  };
  EmergencyEscalated: {
    organizationId: string;
    chatSessionId?: string;
  };
  KnowledgeUploaded: {
    organizationId: string;
    knowledgeDocumentId: string;
  };
  KnowledgeUpdated: {
    organizationId: string;
    knowledgeDocumentId: string;
  };
}

export type DomainEventName = keyof DomainEvents;

export interface EventEnvelope<N extends DomainEventName = DomainEventName> {
  name: N;
  payload: DomainEvents[N];
  actor: EventActor;
  occurredAt: string; // ISO
}

type Handler<N extends DomainEventName> = (
  event: EventEnvelope<N>,
) => void | Promise<void>;

export interface EventBus {
  on<N extends DomainEventName>(name: N, handler: Handler<N>): void;
  emit<N extends DomainEventName>(
    name: N,
    payload: DomainEvents[N],
    actor: EventActor,
  ): void;
}

export function createEventBus(
  onError: (eventName: string, err: unknown) => void = (name, err) =>
    console.error(`[events] subscriber failed for ${name}:`, err),
): EventBus {
  const handlers = new Map<DomainEventName, Handler<DomainEventName>[]>();

  return {
    on(name, handler) {
      const list = handlers.get(name) ?? [];
      list.push(handler as Handler<DomainEventName>);
      handlers.set(name, list);
    },
    emit(name, payload, actor) {
      const envelope: EventEnvelope = {
        name,
        payload,
        actor,
        occurredAt: new Date().toISOString(),
      };
      for (const handler of handlers.get(name) ?? []) {
        // fire-and-forget: never let a subscriber failure reach the publisher
        void Promise.resolve()
          .then(() => handler(envelope))
          .catch((err) => onError(name, err));
      }
    },
  };
}
