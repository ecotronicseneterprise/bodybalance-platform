/**
 * @bodybalance/domain — domain services and repositories (BLUEPRINT 4.2).
 * The only layer that touches @bodybalance/database. Both the AI tool
 * handlers and the admin dashboard call through here.
 */

export {
  requestBooking,
  transitionAppointment,
  getBookableSlots,
  BookingError,
  type BookingRequest,
  type BookingReceipt,
} from "./booking.ts";
export {
  computeSlots,
  isSlotAvailable,
  wallTimeToUtc,
  localDateISO,
  type AvailabilityWindow,
  type BusyInterval,
  type SlotComputationOptions,
} from "./availability.ts";
export { registerAuditSubscribers } from "./audit.ts";
export {
  PERMISSIONS,
  hasPermission,
  assertPermission,
  PermissionError,
  type Permission,
} from "./permissions.ts";
export * as repositories from "./repositories.ts";
