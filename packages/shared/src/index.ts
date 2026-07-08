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
