# Sprint 2 — Implementation Plan (APPROVED, rev 2)

**Status:** Approved by founder 2026-07-11; rev 2 incorporates founder's mockup-review feedback (same date).
**Baseline:** commit `f5cd845d` (Sprint 1 + 1.5 deployed), BLUEPRINT.md v1.1, engineering audit.

**Rev 2 design rulings (founder mockup review):**
1. **AI page = employee, not settings.** The AI Assistant page leads with an
   identity card — "Meet your AI receptionist": name, working hours (24/7),
   languages, knowledge count, status — with honest placeholder stats
   ("live once your assistant starts work") until Sprint 4. Configuration
   sits below the identity, not instead of it.
2. **Knowledge = training.** Page framing is "Teach your assistant", not
   document management. 2B ships typed text documents; PDF/DOCX/website/voice
   ingestion are recorded as later-sprint formats (framing now, formats later).
3. **Appointments = cards, not tables.** Clinics think in people, not rows.
   Card-per-appointment queues; DataTable remains in packages/ui for genuinely
   tabular data (audit log, services list).
4. **Patients = timeline, not CRM.** Chronological patient view (appointments
   now; AI chats/notes/communication as those exist). No CRM fields.
5. **Notifications are transport-decoupled by contract.** NotificationService
   + channel adapters (WhatsAppAdapter first — may literally be a wa.me link
   generator initially; Cloud API/Twilio later). Never couple domain logic to
   a transport. (Confirms Sprint 3 architecture; recorded as a standing rule.)
6. **Unified Communication inbox** (WhatsApp/SMS/email/AI conversations in one
   place) — recorded as a top-level product object for a post-Sprint-4 sprint,
   once AI conversations exist to populate it. Not built in Sprint 2.
7. **Dashboard personality** — the "Good morning Cherry, Emily booked 4
   appointments overnight" narrative header becomes real in Sprint 4 when the
   assistant works overnight; the 2C dashboard keeps the operational layout
   and grows the narrative line when the data exists.
8. **North star (recorded):** reduced cognitive load — the owner should feel
   like one competent assistant is quietly running the clinic. ChatGPT × 
   Linear calm, not ERP. Every screen: one primary action, minimal clutter.

> **Prime directive (founder):** Every new page must be deployable. Every sprint
> must end in software that Cherry can immediately use. Avoid building
> infrastructure that produces no visible user value within the sprint.

---

## Phases

Strict order: **2A → 2B → 2C**. Each independently deployable and Cherry-testable.

### Sprint 2A — Design system, app shell, auth floor

Objective: every future screen assembles from a branded, responsive component
system; no user can act beyond their role; no user can be locked out.

- shadcn/ui + design tokens as CSS variables. Platform brand: purple `#6D4AFF`
  primary, white surfaces, soft-gray cards, soft lavender accent, rounded
  corners, spacious. (Patient site will render each clinic's own
  `clinic_settings` colors — platform tokens and tenant tokens stay separate.)
  **No dark mode** (founder ruling — finish the product first).
- `packages/ui` components: Button, FormField (Input/Select/Textarea), Card,
  DataTable, Dialog/ConfirmDialog, Badge, Toast, PageHeader, StatCard,
  **EmptyState (first-class requirement: every page ships with a designed
  empty state + primary action)**, Skeleton, **SetupProgress** (clinic
  completion checklist), AppShell (collapsible sidebar, mobile nav,
  active-route state).
- Final sidebar navigation (founder-specified):
  `Dashboard · Appointments · Patients · Services · Practitioners · Knowledge · AI Assistant · Clinic Settings · Feedback`
- Restyle all 5 existing pages with the new system (exit criterion for the
  design system — not pixel perfection).
- `loading.tsx` / `error.tsx` / `not-found.tsx` conventions on all routes.
- **Password reset** (request page → email → update-password page).
- **Permission matrix** in `packages/domain` (platform-level, BLUEPRINT 5.5):
  owner/admin/receptionist/therapist → actions; enforced once via a
  `withStaffContext(permission, action)` server-action wrapper. Unit-tested.
- Fold the feedback write into the same wrapper (closes the one
  domain-bypassing write).
- Remove `SUPABASE_SERVICE_ROLE_KEY` from apps/web env.

DB changes: none. Rollback: Vercel promote-previous. Complexity: medium-high
volume, low risk.

### Sprint 2B — Clinic configuration ("no developer needed")

Objective: everything a clinic *is* becomes editable, vertical-neutrally.

- **Terminology model (founder Change 1):** DB table stays `therapists`
  forever; domain concept is **Practitioner**; UI labels come from
  `clinic_settings.terminology` jsonb with vertical presets
  (Physiotherapy → "Physiotherapists", Dental → "Dentists", General →
  "Practitioners", Veterinary → "Veterinarians"…). No physiotherapy strings
  hardcoded anywhere in UI copy.
- **Clinic Settings = ONE page with tabs (founder Change 2):**
  `General · Branding · Business Hours · Appointment Settings · Notification Settings (placeholder)`.
  Branding is a tab, not a page. AI Assistant is NOT here — it has its own
  nav entry.
- **Services**: DataTable CRUD (name, description, duration, price in minor
  units + currency, active). Empty state: "You haven't created any services
  yet. [Add first service]".
- **Practitioners**: CRUD (display name, credentials, bio, photo, active).
- **Availability**: per-practitioner weekly windows + date overrides/blackouts
  (feeds the live-tested slot engine unchanged).
- **Knowledge** (nav position ABOVE AI Assistant — founder Change 3: knowledge
  feeds AI): typed document CRUD, version history viewer (reads
  `knowledge_document_versions`), status chip "AI indexing arrives with the
  assistant". No embeddings yet.
- **AI Assistant page (founder Changes 4 + naming):** named "AI Assistant",
  not "AI Settings". Contains: assistant name, greeting (welcome message),
  tone, verbosity, languages, specialties, booking style, capabilities
  toggles (read-only where not yet functional), AI Profile preset selection
  (consumes `supabase/seed/ai_profiles.json`), locked disclaimer with
  explanation — plus an **AI Preview card** showing the configured assistant
  identity with the note "AI features arrive in Sprint 4". The settings are
  real; the model isn't wired yet.
- Logo upload: first Supabase Storage bucket, created via migration (E7),
  public-read logos, everything else denied.
- All mutations via `withStaffContext` + domain services; events → audit rows.

DB changes (additive): storage bucket + policies; `clinic_settings.terminology`
jsonb. Complexity: high volume, low-medium risk.

### Sprint 2C — Operations dashboard

Objective: a clinic runs its day in the product.

- **Dashboard home (founder Change 5): operational, not statistical.**
  Layout: *Today's Clinic* — pending-confirmation queue (primary action),
  today's appointments, upcoming appointments, recent activity (from
  audit_logs), quick actions (new booking, add service…), and the
  SetupProgress checklist until configuration is complete. The six stat cards
  are replaced; deep numbers wait for Clinic Intelligence (Phase 2).
- **Appointments**: Pending / Upcoming / History queues; detail view with
  qualification summary; confirm / decline / reschedule via
  `transitionAppointment`; ConfirmDialogs + toasts. Empty state: "No
  appointments today."
- **Manual booking**: staff flow via `getBookableSlots` → `requestBooking`
  (`source: "manual"`) — phone/walk-in capture, and how 2C is testable before
  the patient funnel exists.
- **Patients**: list + detail (contact, appointment history), data-minimal.
- **Audit viewer**: filterable, owner/admin only.
- **Feedback management**: status transitions (open → planned/done/dismissed).

DB changes: none expected. Complexity: medium.

---

## Explicitly deferred (unchanged from approved plan)

Charts/analytics dashboards · staff invitations (Sprint 5 or first multi-staff
clinic) · notification delivery (Sprint 3 — event bus already emits; nothing
consumes) · payments · patient accounts · telehealth · multi-location ·
embedding pipeline (Sprint 4) · dark mode (post-product).

## Success criteria

On the production URL, from a phone, an owner can: reset a forgotten password;
configure services, practitioners, availability, hours, branding, terminology,
AI assistant personality, and knowledge with zero developer involvement;
create and confirm a manual booking; see it in recent activity and the audit
log — while a therapist-role account provably cannot edit services or confirm
bookings. All verify suites green; migrations additive; RUNBOOK/TODO current.

## Cherry testing plan

- **After 2A:** phone login, password reset, look & feel — trust check.
- **After 2B:** one-hour real-configuration session (her actual services,
  prices, hours, bio, AI tone, first knowledge entries). Friction → Feedback.
- **After 2C:** simulated week of phone bookings — the "could this replace my
  notebook?" test; first honest signal on the two-week metric.

## Design direction reference

Founder-approved mockups (Dashboard, Appointments, Clinic Settings, Knowledge)
produced 2026-07-11 before 2A implementation — purple/white/lavender, Linear ×
Stripe × Notion quality bar, clinic-first and calm. Empty states and
SetupProgress are part of the design language, not afterthoughts.
