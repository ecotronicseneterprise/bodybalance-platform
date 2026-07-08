/**
 * @bodybalance/domain — domain services and repositories (BLUEPRINT 4.2).
 *
 * All business rules live here, once:
 *  - a booking slot must be validated against therapist_availability before insert
 *  - an appointment is always created as pending_confirmation; only clinic
 *    staff actions may set confirmed (BLUEPRINT 3.8, 5.2 rule 3)
 *  - every state change publishes a domain event (BLUEPRINT 3.15)
 *
 * Both the AI tool handlers (@bodybalance/ai) and the admin dashboard call
 * through these services — neither may reach @bodybalance/database directly.
 *
 * Implemented in Task 4 (domain layer + event bus).
 */

export const DOMAIN_PACKAGE_READY = false as const;
