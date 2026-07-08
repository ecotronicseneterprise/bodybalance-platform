/**
 * @bodybalance/shared — cross-cutting types and constants (BLUEPRINT 4.1).
 *
 * Tenant identity is a branded type so an arbitrary string can never be passed
 * where an organization id is required (BLUEPRINT 2.1 — organization_id always
 * derives from session/request context, never from user input or model output).
 */

export type OrganizationId = string & { readonly __brand: "OrganizationId" };

export type UserRole = "owner" | "therapist" | "receptionist" | "admin";

export type AppointmentStatus =
  | "pending_confirmation"
  | "confirmed"
  | "declined"
  | "rescheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export type ChatOutcome =
  | "booked"
  | "escalated_emergency"
  | "abandoned"
  | "handed_to_human";

export type ContentType =
  | "faq"
  | "exercise"
  | "policy"
  | "therapist_bio"
  | "pricing_note"
  | "video"
  | "pdf"
  | "blog_article"
  | "testimonial";

export type BookingStyle = "book_immediately" | "assessment_first" | "call_first";

/**
 * Minimal database client surface shared between @bodybalance/database
 * (which produces it from a pg connection) and @bodybalance/domain
 * repositories (which consume it). Keeps domain free of a direct pg
 * dependency (BLUEPRINT 4.2 layering).
 */
export interface DbClient {
  query(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: unknown[]; rowCount: number | null }>;
}

/** Runs a function inside an RLS-enforced, org-scoped transaction. */
export type DbRunner = <T>(fn: (client: DbClient) => Promise<T>) => Promise<T>;
