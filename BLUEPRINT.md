# BodyBalance Platform — Product & Technical Blueprint

**Status:** v1.0 — APPROVED. Frozen. Implementation begins against this version.
**Owner:** Clifford (Ecotronics)
**First customer:** Cherry Nwanna, BMR.PT — BodyBalance Physiotherapy Clinic, Lagos
**Date approved:** 2026-07-08

> **This blueprint is frozen as v1.0.** Planning is done — every hour spent re-planning past this point has diminishing returns relative to building. Further changes are real amendments, not drafting: bump to v1.1/v1.2 for additions/clarifications discovered during implementation, v2.0 only for a genuine architectural reversal. Don't keep silently editing v1.0 in place. See section 10 for the sprint plan this version executes against.

**Changelog v4 → v1.0 (approved):** Added the event-driven backbone (3.15) so notifications/analytics/audit/future-automations subscribe to domain events (`AppointmentConfirmed`, `EmergencyEscalated`, etc.) instead of being called inline from booking code. Added `audit_logs` (3.16) — every state change attributable to an actor, write-only, no update/delete path even for platform admins. Added knowledge base versioning (3.17) — `knowledge_documents` edits create `knowledge_document_versions` rows rather than overwriting, so "what did the AI used to say" is always answerable. Added the domain-services layering rule (4.2): the AI's tools call `packages/domain` (BookingService, AvailabilityService, etc.), never `packages/database`/SQL directly — the same enforcement gate the admin dashboard goes through, so a prompt mistake in `packages/ai` cannot bypass a rule enforced one layer down. Renumbered 3.13–3.18 and 4.1–4.5 accordingly. Blueprint approved and frozen; see section 10 for sprint-by-sprint execution order.

**Changelog v3 → v4:** Hardened the Layer 1 (Platform Rules) / Layer 2 (Clinic Personality) split into two named artifacts — `platform_policy` (3.13a, immutable, never clinic-editable, not exposed through any admin UI) and the fully expanded `organization_ai_settings` (3.13, ~20 fields: assistant identity, brand voice, booking style, business hours, follow-up settings, disclaimer flag that cannot be turned off). Added `ai_capabilities` (3.13b) as an explicit feature-flag map — the mechanism behind "create clinic → choose features → done" onboarding and the future Starter/Professional/Enterprise plan tiers (7.2). Added AI Profiles (3.13c) as onboarding presets (Sports Performance, General Physio, Neuro Rehab, Paediatric, Women's Health, Corporate Ergonomics). Rebuilt Clinic Intelligence (3.14) into an explicit 3-layer architecture (SQL facts → deterministic business-rule classification → LLM narration only), added `analytics_snapshots` (3.14a) as the single stable dataset both dashboard and AI narration read from, and named the Weekly AI Brief (3.14b) as the concrete Phase 2 product surface. 5.5/5.6 rewritten to state the one-directional trust rule explicitly: configuration flows from Platform Rules into Clinic Personality, never the reverse, and a capability flag can only make the AI do less, never make it less safe.

**Changelog v1 → v2:** Booking flow made explicit as "in-app, no payment in MVP" (was ambiguous between three options in v1). Patient journey now leads with a structured AI qualification step (pain location, duration, severity, red-flags, impact) that produces a summary and pre-fills booking, rather than treating qualification and booking as loosely connected. `approved_external_sources` upgraded to `approved_resources` — structured by body region/condition, tenant-extensible, so a clinic's own content (e.g. Cherry's videos) can be prioritized over generic third-party sources. Added `search_approved_resources` and `escalate_to_human` to the tool-calling surface. Competitive positioning ("AI front desk for physiotherapy clinics," not a symptom checker, not general ChatGPT) added to section 1.

**Changelog v2 → v3:** Added Clinic Intelligence (3.14) — a deterministic SQL-first analytics layer; the LLM only narrates pre-computed numbers, never derives them (5.6). Added `organization_ai_settings` (3.13) for bounded per-clinic AI customization (tone, verbosity, specialties, etc.), with an explicit immutable boundary (5.5) stating this can never weaken section 5.2/5.3/5.4 platform-level safety guarantees. `knowledge_documents` gained a typed `content_type` enum (faq/exercise/policy/therapist_bio/pricing_note/video/pdf/blog_article/testimonial) instead of a loose category string. `appointments`/`chat_sessions` gained fields (`chat_session_id`, `qualification_summary`, `presenting_complaint`, `presenting_body_region`) that the analytics layer reads from. Minimal admin dashboard moved from Phase 2 into Phase 1 (booking management, services/pricing, knowledge base are launch-blocking; analytics dashboard stays in Phase 2, since it needs real usage data to matter). Added section 7.1, the founder's proposed 8-step implementation order.

> This document is the source of truth. Every implementation decision, every prompt, every schema field must trace back to something written here. If Claude Code (or anyone) is about to make a decision this document doesn't cover, stop and amend this document first — don't decide it inline in code.

---

## 0. What we are actually building

Not a chatbot. Not a clinic website.

**BodyBalance is an AI-powered operating system for physiotherapy clinics** — patient acquisition, qualification, education, booking, and follow-up, delivered as multi-tenant SaaS. Cherry's clinic is tenant #1, not a special case.

Positioning statement (for CV/portfolio/pitch — this is the target, not yet reality):

> BodyBalance is an AI-powered clinic operating system currently helping a physiotherapy practice automate patient education, qualification, appointment booking, and follow-up. The platform is architected as a multi-tenant SaaS with configurable branding, AI knowledge bases, and clinic workflows, making it reusable across healthcare providers.

### Design principle that governs everything below

**The LLM is a communication layer, not a decision-maker.** Every fact the AI states — prices, hours, availability, therapist names, booking confirmations, clinic policy — must be pulled from structured data (Postgres via Supabase) and never composed or asserted by the model from its own "knowledge." The model's only jobs are: (1) understand what the patient is asking, (2) select the right structured data/tool to answer it, (3) phrase the answer warmly, (4) know when to stop and escalate. This is what makes the system deterministic and safe enough to put a real clinic's name behind.

---

## 1. Product

### 1.1 Who it's for

- **Primary buyer (V1–V2):** Independent physiotherapy clinics / solo practitioners who want a 24/7 front door that qualifies and books patients without adding reception staff.
- **End user:** A patient in pain, searching online, uncertain whether physio is right for them, wanting reassurance before committing to book.

### 1.2 Value proposition

- For the **clinic**: an AI receptionist that converts website visitors into booked, qualified appointments, and stays configured to the clinic's own brand, prices, and knowledge — no code required to onboard.
- For the **patient**: a fast, judgment-free way to describe pain, get credible educational guidance, and book with a real licensed physiotherapist — without diagnosing themselves via random internet searches.

### 1.3 What it is explicitly NOT

- Not a diagnostic tool.
- Not a replacement for clinical assessment.
- Not a general health chatbot — every conversation is scoped to one clinic (tenant) and steers toward booking that clinic's services.

### 1.4 Competitive framing

Worth stating explicitly so the product doesn't drift toward competing with the wrong things:

- **Not competing with ChatGPT/Claude/Gemini** — those give great general advice but know nothing about a specific clinic, its prices, its therapists, or its calendar, and cannot book anything.
- **Not competing with symptom checkers** (Ada Health, K Health, WebMD, Buoy) — those triage in the abstract and don't convert a visitor into a booked, paying patient anywhere.
- **Not another "ChatGPT wrapped in a widget"** clinic chatbot — the category most existing clinic AI falls into, and the reason most of it is forgettable.
- **What we are:** the AI front desk for physiotherapy clinics — qualifies, educates, reassures, and books, scoped entirely to one clinic's own data and voice.

### 1.5 Patient journey (MVP / Phase 1)

The AI's first job is a structured **qualification pass**, not an open-ended chat — this is what makes the AI feel valuable rather than acting as a thin booking widget, and it's what lets the booking form arrive pre-filled instead of asking the patient to repeat themselves to Cherry.

```
Google / social / referral
        ↓
Landing page (clinic-branded)
        ↓
AI qualification (structured, in order):
   1. Where is the pain?
   2. How long has it lasted?
   3. Severity (1–10)
   4. Any red-flag symptoms? (checked continuously, not just here — see 5.3)
   5. Impact on daily activities
        ↓
AI produces a plain-language summary + recommended service
   "Based on what you've shared, an Initial Assessment is recommended."
        ↓
Booking flow, pre-filled from the qualification summary:
   select service (pre-selected) → choose therapist → choose available time → confirm contact details
        ↓
Booking stored as "Pending Confirmation" — patient sees
   "I've requested your preferred appointment" — never "confirmed"
        ↓
Clinic dashboard: Cherry sees patient, complaint, duration, suggested service, preferred time
        ↓
Cherry accepts / reschedules / declines
        ↓
Patient notified via WhatsApp + email — only now does "confirmed" language appear
        ↓
Appointment happens
        ↓
Follow-up (Phase 3) → Review → Referral
```

Payment is **deferred to Phase 2** (deliberate: maximize booking conversion during early validation — don't add friction before the funnel itself is proven). WhatsApp is a **notification/communication channel**, not the booking mechanism — a WhatsApp-handoff funnel loses patients to reply-time lag ("Cherry replies 3 hours later, patient already booked elsewhere"); booking must complete inside the platform.

The qualification summary (pain location, duration, severity, red-flag check result, impact, recommended service) is what gets passed into the booking tool call as pre-fill data — it is never re-typed by the patient and never silently discarded.

### 1.6 Pricing (of the platform itself, to clinics — not to be confused with a clinic's own service pricing)

Not finalized. Founder note on record from earlier planning: pilot idea was "free 14-day pilot → paid monthly after." Revisit once Phase 1 is live with Cherry — don't design the schema around a specific price point, but `organizations` must support a `plan` / `billing_status` field so this is addable later without a migration.

---

## 2. Multi-tenancy model

Built in from day one, per decision above. Every clinic is a **tenant** (an `organizations` row). Cherry is tenant #1. Nothing in the schema, prompt system, or booking flow may assume there is only one clinic.

### 2.1 Tenant isolation rule (non-negotiable)

> The AI must only retrieve knowledge, pricing, services, therapists, appointments, and patient data belonging to the active organization. Enforced at two independent layers:
> 1. **Application logic** — every query, every tool call the AI can invoke, every retrieval call is parameterized by `organization_id` derived from the session/request context, never from user input or model output.
> 2. **Database RLS** — every tenant-scoped table has Postgres Row-Level Security enabled, policy keyed on `organization_id` matching the authenticated context. This is the backstop if application logic has a bug — it must be impossible to leak cross-tenant data even with a broken query.

No table that stores clinic-specific or patient data may omit `organization_id`. This is checked at schema-design time (section 3), not left to convention.

---

## 3. Data model (Supabase / Postgres)

This section defines tables at the level Claude Code should implement directly — names, key columns, relationships, RLS posture. Exact column types/constraints get finalized in the actual migration, but the shape below is fixed.

### 3.1 `organizations`
The clinic/tenant. Root of all isolation.
- `id` (uuid, pk)
- `slug` (unique, used in URLs — e.g. `bodybalance`)
- `name`
- `plan`, `billing_status` (for future Phase 3 subscriptions — nullable/default for now)
- `created_at`

### 3.2 `clinic_settings`
1:1 with `organizations`. Everything a clinic can configure without touching code.
- `organization_id` (fk, unique)
- `logo_url`, `brand_color_primary`, `brand_color_secondary`
- `whatsapp_number`
- `emergency_contact_number` (used by guardrails escalation copy)
- `opening_hours` (structured, e.g. jsonb keyed by day)
- `address`, `city`, `country`
- `timezone`
- `booking_lead_time_minutes`, `booking_horizon_days` (how soon / how far ahead patients can book)

### 3.3 `users`
Staff accounts. Roles scoped to one organization each (a user working at two clinics = two rows, or a join table if we ever need that — not needed for V1).
- `id` (uuid, pk — matches Supabase Auth user id)
- `organization_id` (fk)
- `role` (enum: `owner`, `therapist`, `receptionist`, `admin`)
- `full_name`, `email`

### 3.4 `therapists`
- `id` (pk)
- `organization_id` (fk)
- `user_id` (fk to `users`, nullable if therapist isn't a login-having staff member yet)
- `display_name`, `credentials` (e.g. "BMR.PT"), `bio`, `photo_url`
- `active` (bool)

### 3.5 `services`
What a clinic offers — the things patients book.
- `id` (pk)
- `organization_id` (fk)
- `name` (e.g. "Initial Assessment", "Sports Rehab", "Virtual Consultation")
- `description`
- `duration_minutes`
- `price_amount`, `price_currency`
- `active` (bool)
- **This table is the only legitimate source of prices the AI may ever state.**

### 3.6 `therapist_availability`
Deterministic bookable slots — this is what makes booking real instead of a link.
- `id` (pk)
- `organization_id` (fk)
- `therapist_id` (fk)
- `day_of_week` or explicit `date` (recurring weekly rule + date-specific overrides/blocks — exact recurrence model to be finalized at implementation time, but must support both a weekly pattern and one-off exceptions e.g. holidays)
- `start_time`, `end_time`
- `is_blocked` (for manual clinic-side blackouts)

### 3.7 `patients`
- `id` (pk)
- `organization_id` (fk)
- `full_name`, `phone`, `email`
- `created_at`
- No clinical/diagnostic free-text stored here beyond what's needed for booking context (see 3.9 on chat data minimization).

### 3.8 `appointments`
- `id` (pk)
- `organization_id` (fk)
- `patient_id` (fk)
- `therapist_id` (fk)
- `service_id` (fk)
- `scheduled_start`, `scheduled_end`
- `status` (enum: `pending_confirmation`, `confirmed`, `declined`, `rescheduled`, `completed`, `cancelled`, `no_show`)
- `source` (e.g. `ai_chat`, `manual`) — useful later for measuring AI conversion
- `chat_session_id` (fk to `chat_sessions`, nullable) — links a booking back to the qualification conversation that produced it
- `qualification_summary` (jsonb: pain location, duration, severity 1–10, impact on daily activities, red_flag_detected bool) — the structured output of the AI qualification pass (section 1.5), shown to clinic staff on the dashboard so Cherry never has to re-ask what the patient already said
- `notes` (staff-facing only, never AI-facing free text from patient claims)
- `created_at`, `confirmed_at`

**Booking write rule:** the AI never inserts into `appointments` directly via free-form generation. It calls a deterministic booking tool/function with structured arguments (`service_id`, `therapist_id`, `slot_start`) validated server-side against `therapist_availability` before insert. The row is always created as `pending_confirmation` — the AI can never set `confirmed`.

### 3.9 `knowledge_documents`
The RAG corpus, now per-tenant instead of one global JSONL file, and typed rather than one undifferentiated text blob — so retrieval can prefer the right kind of source for the question (a pricing question should hit `pricing`/structured data, not a fuzzy match against a testimonial).
- `id` (pk)
- `organization_id` (fk)
- `title`
- `content` (chunked text)
- `content_type` (enum: `faq`, `exercise`, `policy`, `therapist_bio`, `pricing_note`, `video`, `pdf`, `blog_article`, `testimonial`) — supersedes the looser `category` field from v1; drives which retrieval/render path is used (e.g. `exercise` renders as a structured card per the existing `Exercise` UI pattern in the current app, `testimonial` is never used to answer a clinical question, only surfaced contextually)
- `source_type` (`clinic_provided`, `approved_external_link`)
- `embedding` (vector column, pgvector)
- `active` (bool)

Note: pricing itself is never sourced from here for anything the AI states as fact (that's still `services`, per 5.2 rule 4) — a `pricing_note` document is for *context/explanation* ("what's included in an Initial Assessment") only, never the number itself.

### 3.10 `approved_resources`
The whitelist referenced in the AI safety decision (section 5) — trusted resources (YouTube channels/videos, clinical body pages, PDFs) the AI may reference when clinic knowledge doesn't cover a question. Structured for matching, not just a flat domain list, and tenant-extensible so a clinic's own published content naturally outranks generic third-party sources.
- `id` (pk)
- `organization_id` (fk, **nullable** — null means a platform-level default available to every tenant, e.g. NHS/Physiotutors/Bob & Brad; non-null means a clinic-specific addition, e.g. Cherry's own YouTube channel)
- `title`
- `url`
- `type` (`video`, `article`, `pdf`)
- `body_region` (e.g. `neck`, `lower_back`, `knee`)
- `condition` (nullable, e.g. `sciatica`)
- `approved_by` (staff/admin user id who whitelisted it — nothing enters this table unreviewed)
- `active`
- `created_at`

Matching/ranking rule: when the AI calls `search_approved_resources` (5.4), results scoped to the active `organization_id` (clinic's own content) rank above `organization_id IS NULL` platform defaults for the same `body_region`/`condition`. The AI never free-searches YouTube or the web — only this table.

### 3.11 `chat_sessions`
- `id` (pk)
- `organization_id` (fk)
- `patient_id` (fk, nullable until identified)
- `started_at`, `ended_at`
- `outcome` (e.g. `booked`, `escalated_emergency`, `abandoned`, `handed_to_human`)
- `presenting_complaint` (nullable, short text — e.g. "lower back pain") and `presenting_body_region` (nullable, normalized enum matching `approved_resources.body_region`) — captured from the qualification pass (1.5), used by the analytics layer (3.14) to compute "most common complaint" / "conversion rate by body region" without ever re-parsing raw message text

### 3.12 `messages`
- `id` (pk)
- `chat_session_id` (fk)
- `organization_id` (fk — denormalized deliberately, so RLS doesn't require a join to enforce isolation)
- `role` (`patient`, `ai`, `system`)
- `content`
- `created_at`

Data retention/privacy note carried over from the current app's design intent: minimize what's stored (e.g. BMI as bucketed category, not raw height/weight, as already implemented) — this principle extends to `messages`: don't let the AI collect and store more patient detail than the booking/qualification flow actually needs.

### 3.13 `organization_ai_settings` — Layer 2: Clinic Personality (configurable)
1:1 with `organizations`. This is what lets the AI "feel like the clinic" without every clinic needing its own system prompt written by hand. Everything in this table is presentation, scope, and feature toggling — **never safety**. Nothing safety-related is allowed to live here; that lives in `platform_policy` (3.13a), which this table cannot reference or override.

- `organization_id` (fk, unique)
- `assistant_name`, `assistant_avatar_url` — lets the AI have a name/face distinct from "BodyBalance AI" for white-label clinics
- `clinic_description`, `brand_voice` (free text guidance layered under `tone`)
- `tone` (e.g. `warm`, `clinical`, `concise`, `formal`) — phrasing style only, not a change to what facts/rules apply
- `verbosity` (e.g. `brief`, `detailed`)
- `supported_languages` (array, default `['en']`)
- `specialties` (array, e.g. `sports`, `paediatric`, `neuro_rehab`, `womens_health`, `corporate_ergonomics`, `orthopaedics`) — affects which `services`/`knowledge_documents` are foregrounded, which onboarding/qualification examples are used, and — only via the explicit, documented exception in 5.2 rule 9 — lifts the pediatric-case restriction *for that organization only* when `paediatric` is declared
- `booking_style` (enum: `book_immediately`, `assessment_first`, `call_first`) — changes the CTA/flow shape, never the underlying safety-relevant booking-confirmation rule (5.2 rule 3 always holds regardless of style)
- `booking_preferences` (jsonb — e.g. default appointment buffer, preferred confirmation channel)
- `business_hours` (denormalized read view of `clinic_settings.opening_hours` for prompt convenience — `clinic_settings` remains the source of truth, this is not a second place to edit hours)
- `follow_up_enabled` (bool), `follow_up_days` (int) — Phase 3 feature, field exists now so schema doesn't need a migration later
- `welcome_message`, `fallback_message`, `default_cta` — clinic-authored copy, never model-authored
- `show_disclaimer` (bool, **cannot be set to false** — see 5.5; field exists for future per-locale disclaimer wording, not to remove it)
- `ai_capabilities` (jsonb feature-flag map — see 3.13b)
- `ai_profile` (nullable fk/enum reference — see 3.13c)
- `created_at`, `updated_at`

**Immutable boundary (restated from 5.5):** nothing in this table can alter the hard rules in 5.2, the emergency escalation logic in 5.3, the fixed tool-calling surface in 5.4, or RLS/tenant isolation. Those are platform code, not data this table can influence. If an implementation detail would let `organization_ai_settings` reach into any of those, that's a bug against this blueprint, not a valid customization.

### 3.13a `platform_policy` — Layer 1: Platform Rules (immutable, platform-managed only)
Not a per-organization table — a single platform-scoped source (can be implemented as versioned config in code/a platform-only table with no `organization_id` column and no clinic-facing write path at all, not even via the admin dashboard). Exists as a named artifact specifically so "safety lives in code, personality lives in data" is enforceable, not just a convention.

Contains: the red-flag pattern list (5.3), the hard-rule set (5.2), the fixed tool-calling surface definition (5.4), RLS policy definitions, PII/data-minimization rules (section 6), audit-logging requirements. Edited only by platform engineering, versioned, changes reviewed against this blueprint — never exposed through `apps/admin` in any form, because if a clinic can reach it through any UI, it has stopped being immutable regardless of what the schema says.

### 3.13b `ai_capabilities` (feature-flag shape, stored inside `organization_ai_settings.ai_capabilities`)
Each clinic's plan/config turns platform features on or off — this is what makes onboarding "create clinic → choose features → done" instead of a code change per clinic, and is the natural seam for a future Starter/Professional/Enterprise plan structure (7.2).

```
patient_education:      bool  (default true)
booking:                 bool  (default true)
exercise_library:        bool  (default true)
faq:                      bool  (default true)
pain_assessment:          bool  (default true)
whatsapp_notifications:   bool  (default true)
video_recommendations:    bool  (gates search_approved_resources for type=video)
blog_recommendations:     bool  (gates search_approved_resources for type=article)
insurance:                bool  (default false — Phase 3+)
payments:                 bool  (default false — Phase 2+)
telehealth:                bool  (default false — not yet designed)
prescription_upload:       bool  (default false — not yet designed, likely never without a clinical review process)
voice_calls:                bool  (default false — not yet designed)
```
A flag being off means the corresponding tool/UI surface is not offered to the AI or the patient at all for that org — not "offered but told not to use it." Flags never gate anything in `platform_policy` (3.13a); there is no flag that can turn off emergency escalation or tenant isolation.

### 3.13c AI Profiles (onboarding accelerator, not a new table — a preset applied to `organization_ai_settings` at creation time)
Rather than asking a new clinic to hand-configure ~20 fields, onboarding offers a starting profile that pre-fills `tone`, `specialties`, `ai_capabilities`, retrieval priorities, and suggested `services`/qualification questions. The clinic can then edit any field afterward — a profile is a starting point, not a lock-in.

Initial profile set: **Sports Performance**, **General Physiotherapy** (Cherry's profile), **Neurological Rehabilitation**, **Paediatric Physiotherapy**, **Women's Health**, **Corporate Ergonomics**. Stored as seed data (`supabase/seed/`), not hardcoded logic — adding a new profile later is a data change, not a code change.

### 3.14 Clinic Intelligence (analytics layer — 3-layer architecture)

Governing rule, stated as strictly as possible: **the LLM never computes a metric, and never reads raw session/message rows to produce one.** SQL measures, deterministic business rules classify, the LLM only narrates. Every number a clinic sees must be independently reproducible by re-running the SQL — nothing about a number's value is only visible on the LLM's side of the boundary.

**Layer 1 — SQL (facts).** Deterministic aggregation via `COUNT`/`AVG`/`GROUP BY`/window functions over `chat_sessions`, `messages`, `appointments`, `services`, `therapists`. Representative views (exact set finalized at implementation time, shape is fixed):
- `v_weekly_conversion_stats` — sessions count, bookings count, conversion rate, avg first-response latency, scoped by `organization_id` and date range
- `v_complaint_frequency` — count of `chat_sessions` grouped by `presenting_body_region`/`presenting_complaint`
- `v_booking_funnel_by_region` — for each `presenting_body_region`, sessions vs. bookings (e.g. "knee pain: 32% booking rate vs. 61% clinic average")
- `v_abandonment_points` — where in the qualification/booking flow a session ended with `outcome = abandoned`, and what step it abandoned at (e.g. after pricing was discussed)
- `v_therapist_service_popularity` — bookings grouped by therapist and by service
- `v_peak_booking_times` — booking volume by hour-of-day/day-of-week

**Layer 2 — Business rules (deterministic classification, still no LLM).** Plain conditional logic run in the same aggregation job, not a model call — e.g. classifying a computed `conversion_rate` into `status: "poor" | "average" | "excellent"` against fixed thresholds, or flagging a `v_booking_funnel_by_region` row as an "opportunity" when its conversion is more than N points above/below the clinic average. This layer decides *what's worth mentioning*; the LLM never makes that judgment either.

**Layer 3 — Narrator (LLM, explanation only).** Receives only the Layer 1/2 output as structured input — e.g. `{"conversion_rate": 24.3, "status": "average", "most_common_condition": "Lower Back Pain", "abandonment_after_pricing": 31.4, "top_service": "Initial Assessment"}` — and is not given any tool, retrieval, or database access. Its only job is to phrase this into prose ("Lower back pain was the most common reason patients contacted the clinic this week. Around one-third of visitors left after viewing pricing...") and, bounded by the same input, suggest a business action. It is structurally unable to introduce a number that wasn't already in its input.

### 3.14a `analytics_snapshots`
Daily and weekly aggregates generated by a scheduled job (cron/Supabase scheduled function), not computed live on every dashboard load or every AI Brief generation. This is the stable, audited dataset both the admin dashboard and the Layer 3 narrator read from — a dashboard number and an AI-narrated number can never disagree, because they're reading the same snapshot row.
- `id` (pk)
- `organization_id` (fk)
- `period_type` (`daily`, `weekly`)
- `period_start`, `period_end`
- `metrics` (jsonb — the full Layer 1 + Layer 2 output for that period: conversion rate, status classification, complaint frequency, funnel-by-region, abandonment points, peak times, top therapist/service, etc.)
- `generated_at`

Historical reporting (e.g. "conversion rate over the last 12 weeks") reads a range of `analytics_snapshots` rows — it does not re-aggregate raw events on demand.

### 3.14b Product surface: the Weekly AI Brief (Phase 2)
The concrete product built on top of 3.14/3.14a — Cherry logs in (or receives a scheduled WhatsApp/email digest) and sees a Layer-3-narrated summary of the most recent `analytics_snapshots` row(s): patients, bookings, conversion rate, most common complaint, most booked therapist/service, peak booking time, response latency, and a short "Opportunities" list (e.g. "visitors asking about knee pain converted 52% better than average; consider promoting that service"). Every figure in the Brief traces to a specific `analytics_snapshots.metrics` value — this is the enforcement mechanism for the "AI only narrates" rule, not just a description of intent. An always-on, proactive version of this (an "AI Executive Assistant" digest) is a plausible Phase 3+ extension once the Brief itself is validated, not committed to yet.

### 3.15 Domain events (event-driven backbone)

Rather than notifications, analytics, and future automations each being called directly and separately from wherever a state change happens (booking code calling WhatsApp *and* email *and* touching analytics *and* writing an audit row, all inline), significant state changes are published as domain events that interested subscribers react to independently. This is what keeps `create_booking`/`confirm_appointment`/etc. from accumulating a growing pile of "also call X" side effects as the platform grows — a new subscriber (a future CRM sync, an SMS channel) is additive, not a change to booking code.

Core event set (named, not exhaustive — new events are added as needed, following this shape):
```
PatientRegistered
AppointmentRequested      → emitted by create_booking, status = pending_confirmation
AppointmentConfirmed      → emitted only by clinic staff action (admin dashboard), never by the AI
AppointmentDeclined / AppointmentRescheduled
ConversationEnded         → carries chat_sessions.outcome
EmergencyEscalated        → emitted by the guardrail short-circuit itself (5.3), highest-priority event in the system
KnowledgeUploaded / KnowledgeUpdated
```

Subscriber examples (illustrative, not a commitment to build all of these in Phase 1): `AppointmentConfirmed` → WhatsApp notification + email notification + analytics counter + audit log entry, each as an independent subscriber rather than four inline calls in the booking code. `EmergencyEscalated` → audit log (mandatory) + optional future subscriber (e.g. an alert to clinic staff), but the guardrail's own short-circuit behavior (5.3) never depends on a subscriber succeeding — event delivery is fire-and-forget with respect to the safety-critical path, not a dependency of it.

Implementation note (not blocking the blueprint): for Phase 1 scale (one clinic), this can be a lightweight in-process event emitter or Supabase's own realtime/webhook mechanisms rather than a dedicated message broker — the architectural commitment is "state changes are published as events with named subscribers," not a specific piece of infrastructure. Revisit the transport mechanism, not the pattern, if/when multi-clinic (Phase 3) load requires it.

### 3.16 `audit_logs`

Every meaningful state change — not just AI actions — is attributable to an actor. This is table-stakes for healthcare-adjacent software and is a genuine gap without it: "who changed the price of an Initial Assessment, and when" must always be answerable.

- `id` (pk)
- `organization_id` (fk)
- `actor_type` (enum: `staff_user`, `ai_system`, `patient`, `platform_admin`)
- `user_id` (fk to `users`, nullable — null when `actor_type = ai_system` or an unauthenticated patient action)
- `action` (e.g. `booking.confirmed`, `service.price_updated`, `knowledge_document.updated`, `emergency.escalated`)
- `entity`, `entity_id` (what was acted on)
- `before`, `after` (jsonb — state diff, nullable for pure-create/read actions)
- `ip_address`
- `created_at`

Populated primarily via domain-event subscribers (3.15) — an `AppointmentConfirmed` event always writes an audit row, rather than every call site remembering to write one manually. RLS-scoped like every other table (3.18); additionally, **write-only from application code — no update/delete path exists**, even for platform admins, since an editable audit log isn't one.

### 3.17 Knowledge base versioning

`knowledge_documents` rows are never overwritten in place. Edits create a new version; the document's content history is preserved and queryable.

- `knowledge_document_versions` — `id` (pk), `knowledge_document_id` (fk), `organization_id` (fk), `content`, `content_type`, `embedding`, `version_number`, `edited_by` (fk to `users`), `created_at`
- `knowledge_documents` retains its current fields (3.9) as the live/active version; retrieval always queries the current version. `knowledge_document_versions` exists for history/audit ("the AI didn't used to say this — what changed, and when") and potential future rollback, not for retrieval.
- A `knowledge_document_versions` row is written on every edit via the same audit-event pattern as 3.15/3.16 — not a separate manual step an admin-panel author has to remember.

### 3.18 RLS posture (applies to every table above; `approved_resources` policy allows `organization_id IS NULL` rows to be readable by all tenants, in addition to their own)

Every table has RLS **enabled by default**. Policy shape:
```
organization_id = current_setting('app.current_organization_id')::uuid
```
(or Supabase Auth JWT claim equivalent). No table is queried without this filter active. This is enforced at migration-review time — a migration that adds a tenant-scoped table without an RLS policy is a blocking defect, not a follow-up.

---

## 4. Architecture

### 4.1 Target stack

```
apps/
    web/        — Next.js: public site + patient-facing AI chat + booking UI
    admin/       — Next.js: clinic dashboard (appointments, patients, knowledge mgmt, settings)
packages/
    ai/          — LLM orchestration: prompt templates, RAG, guardrails, tool/function definitions (calls domain/ only — see 4.2)
    domain/      — Domain services + repositories: BookingService, AvailabilityService, PatientService, KnowledgeService, etc. (see 4.2)
    events/      — Domain event definitions + publish/subscribe (see 3.15)
    ui/          — Shared component library (brand-configurable via clinic_settings)
    database/    — Supabase client, generated types, low-level query layer (used only by packages/domain, never called directly by packages/ai or apps/*)
    shared/      — Types, constants, validation schemas shared across apps
supabase/
    migrations/
    seed/        — seed data for Cherry's clinic (tenant #1) + demo tenant for dev
docs/
```

Backend logic (booking writes, guardrail enforcement, tool execution) lives in **server-side code only** — API routes in `apps/web`/`apps/admin` or a dedicated FastAPI service if we need Python-specific AI tooling (LangChain) that's awkward in Node. **Open question for implementation phase, not blocking the blueprint:** whether the AI orchestration layer (`packages/ai`) runs as a Python service (reusing the existing well-guardrailed `chains.py`/`guardrails.py` logic, ported) or is rewritten in TypeScript to stay in one language. Recommendation: port the Python RAG/guardrail logic's *design* (it's good) into TypeScript to avoid running two runtimes for a small team — but this is a call to make explicitly at kickoff, not silently.

### 4.2 Layering rule: AI never touches SQL directly

The AI's tool-calling surface (5.4) is a thin layer over `packages/domain`, never over `packages/database` directly:

```
AI (packages/ai)
     ↓  calls
Domain Services (packages/domain)  — BookingService, AvailabilityService, PatientService, KnowledgeService, ClinicSettingsService
     ↓  calls
Repositories (packages/domain, or a repository sub-layer within it)
     ↓  calls
packages/database (Supabase client)
```

Concretely: the `create_booking` tool (5.4) does not run an `INSERT` itself — it calls `BookingService.createBooking(...)`, which calls `AvailabilityService.validateSlot(...)` before writing through an `AppointmentRepository`. Business rules (a slot must be validated against `therapist_availability` before insert, a booking must always start `pending_confirmation`, an event must be published on creation) live once, inside the domain service — not duplicated between the AI tool handler and the admin dashboard's own booking-edit code path, both of which call the same `BookingService`.

This has a direct safety benefit beyond code reuse: it means the hard rules in 5.2 that are "enforced in code, not just prompt" (rules 3, 4, 12 especially) are enforced at the domain-service layer, where both the AI and the admin UI are forced through the same gate — a prompt-engineering mistake in `packages/ai` cannot bypass a rule that's structurally enforced one layer down.

### 4.3 What survives from the current codebase

- The **guardrails-fire-before-LLM** pattern from `src/core/guardrails.py` — port the regex red-flag list and the "short-circuit, don't even call the model" behavior directly.
- The **structured output schema** discipline from `src/core/chains.py` (Pydantic `ClinicResponse`) — becomes a TypeScript/Zod equivalent, tool-call/function-calling based rather than parsed free text.
- The **BMI-bucket-not-raw-data** privacy pattern.
- The **knowledge base content** in `data/knowledge_base.jsonl` — migrate into `knowledge_documents` for the `bodybalance` organization as seed data.

### 4.4 What gets discarded

- Streamlit entirely.
- `src/core/data_loader.py`, `src/utils/config.py`, `src/utils/logger.py` (orphaned, unused).
- `templates/` (broken imports, superseded by real apps).
- `tests/test_chatbot_engine.py` (tests a class that no longer exists).
- `README_NEW.md`, `app.py_new`, `codebase_review.md`, `implemenation_plan.md` as "docs" — their useful content (the Q&A about original intent, the pricing note) has been folded into this blueprint; the files themselves can be archived or deleted once this blueprint is approved.
- `config.yaml`, `.env.example` (legacy config surface, superseded by `clinic_settings` table + real env vars for the new stack).

### 4.5 Immediate operational fix (independent of the rebuild)

A live OpenAI API key is committed in plaintext at `.streamlit/secrets.toml` on disk. **Rotate this key** regardless of timeline for the rebuild — flagged in the audit, not yet acted on.

---

## 5. AI behavior specification

This is the most important section for "deterministic, safe, least room to hallucinate." Everything here becomes the actual system prompt + tool definitions + guardrail code. Nothing here is a suggestion.

### 5.1 Grounding policy — Hybrid Clinical Safety Architecture

1. For anything about **the clinic itself** — prices, hours, therapists, services, availability, policies — the AI **must** use structured tool calls against the data in section 3. It is never allowed to generate these facts from prompt context or model knowledge, even if it "remembers" them from earlier in the conversation. Every price/hours/availability statement traces to a tool call in the transcript.
2. For **clinical/educational questions** (what is sciatica, what helps with a stiff neck, etc.):
   - First, retrieve from `knowledge_documents` scoped to the active `organization_id`. If relevant content is found, answer grounded in that content, and cite it as coming from the clinic's own guidance.
   - If nothing relevant is retrieved, the AI **may** provide general, clearly-labeled educational information from trusted medical knowledge — explicitly framed as general education, not clinic-specific guidance, not a diagnosis, not a treatment plan. It must not present this as clinic-endorsed content.
   - If a patient would benefit from an external resource (e.g. a demonstration video), the AI may only reference sources present in `approved_resources`, via the `search_approved_resources` tool. Never link, describe, or free-search content outside that table — no live YouTube/web search, ever.
3. If a question is outside what either (1) or (2) can safely answer, the AI states the limitation explicitly and routes to booking / human follow-up. It does not guess.

### 5.2 Hard rules (enforced in system prompt AND, where possible, in code — not prompt-only)

The AI must never:

1. **Name a diagnosis.** May describe symptoms/possibilities in general terms; must never assert or imply a specific diagnosis.
2. **Recommend medication or dosage.** No drug names, no dosing, ever — redirect to a licensed professional.
3. **Confirm a booking itself.** Booking writes go through the deterministic tool call described in 3.8; the row is always created `pending_confirmation`; the AI's language must reflect "pending," never "confirmed," until a system/staff action changes status.
4. **Quote a price it composed.** All prices come from `services` via tool call only.
5. **Discourage or delay emergency care.** On red-flag detection (see 5.3), the AI stops the current flow immediately and issues the escalation message. No "let's finish this question first."
6. **Fabricate clinical knowledge.** If ungrounded and unsafe to answer generally, say so and route to a licensed physiotherapist — never invent an answer.
7. **Contradict or override structured clinic policy.** Hours, availability, services, pricing, insurance, policies always come from data, never from the model's phrasing choices.
8. **Override a therapist's stated treatment plan.** If a patient reports clinician instructions (e.g. "Cherry told me to stop exercising"), the AI defers to that instruction and redirects to a follow-up assessment rather than contradicting it. Canonical response pattern:
   > "Please follow the treatment plan provided by your physiotherapist. If your symptoms have changed, let's book a follow-up assessment."
9. **Provide a treatment plan for high-risk patients.** Recent surgery, fractures, suspected spinal cord injury, pregnancy-related complications, neurological emergencies, and pediatric cases (unless the clinic explicitly declares `paediatric` in `organization_ai_settings.specialties`, per 3.13/5.5) route immediately to clinician review — no exercises, no self-care suggestions.
10. **Claim certainty.** Avoid "this will fix your pain." Use hedged, honest framing: "Many people with similar symptoms may benefit from...", "Depending on the underlying cause...".
11. **Act outside scope.** The AI may educate, explain, reassure, qualify, and recommend booking. It may never diagnose, prescribe, clear someone for sport/work/surgery, or replace professional assessment.
12. **Access or disclose another organization's data.** Every retrieval and tool call is scoped to the active `organization_id`, enforced at both application and RLS layers (section 2.1). This is a security rule as much as a safety rule — it's foundational to being trustworthy as a multi-tenant platform.

### 5.3 Emergency escalation (red-flag guardrail)

Ported and extended from the existing `src/core/guardrails.py` regex list (chest pain, stroke symptoms, can't-breathe, anaphylaxis, etc. — extend list to also cover: sudden weakness, loss of bladder/bowel control, major trauma, severe chest pain, fever with neurological symptoms, suspected stroke).

- Checked **before** any LLM call, on every patient message, not just the first.
- On match: short-circuit immediately, do not call the model for a "response" to the flagged message — return a hardcoded, clinic-configurable emergency message directing to emergency services / `emergency_contact_number` from `clinic_settings`.
- The conversation is marked `outcome = escalated_emergency` on `chat_sessions` regardless of what happens after.
- This check cannot be disabled per-tenant. It is platform-level, not clinic-configurable.

### 5.4 Tool/function-calling surface (replaces free-text generation of facts)

The AI's only way to touch structured data is through a fixed set of server-executed tools, each automatically scoped by `organization_id` from session context (never a parameter the model supplies):

- `get_services()` → returns active `services` for this org
- `get_therapists()` → returns active `therapists`
- `get_availability(therapist_id, service_id, date_range)` → returns bookable slots from `therapist_availability`
- `create_booking(patient_info, service_id, therapist_id, slot_start, qualification_summary)` → inserts `appointments` row as `pending_confirmation` with the qualification summary attached (section 1.5), returns confirmation-pending receipt
- `search_knowledge(query)` → vector search against `knowledge_documents` scoped to org
- `search_approved_resources(body_region, condition)` → returns matches from `approved_resources`, org-specific results ranked above platform-default results (3.10) — the AI's only route to referencing any external content
- `get_clinic_settings()` → hours, address, WhatsApp, emergency contact
- `escalate_to_human()` → ends AI-led flow, marks `chat_sessions.outcome = handed_to_human`, surfaces the conversation on the clinic dashboard for staff follow-up. Called both for red-flag escalation (5.3, always) and voluntarily whenever the AI determines a question is outside what it can safely answer (5.1.3).

No other write access exists from the AI's side. This is the mechanism that makes "the LLM has less room to hallucinate" concrete rather than aspirational — it structurally cannot assert a fact that didn't come from one of these calls, because these are the only calls it has.

### 5.5 Per-clinic AI configuration boundary — two layers, one direction of trust

The platform draws a hard line between two layers, and configuration only ever flows from Layer 1 into Layer 2 — never the reverse:

- **Layer 1 — Platform Rules (`platform_policy`, 3.13a).** The hard rules (5.2), emergency escalation (5.3), the fixed tool-calling surface (5.4), tenant isolation/RLS (2.1), audit logging, and privacy handling (section 6). Owned exclusively by BodyBalance the platform, never Cherry, never any clinic, never exposed through `apps/admin` in any form. Versioned and reviewed against this blueprint when changed.
- **Layer 2 — Clinic Personality (`organization_ai_settings`, 3.13).** Branding, tone, verbosity, language, specialties, booking style/preferences, `ai_capabilities` feature flags, AI Profile selection. This is the extent of what a clinic (or platform admin acting on its behalf) can configure.

No config value, prompt template variable, or feature flag in Layer 2 may weaken, disable, or reinterpret anything in Layer 1. The one place Layer 2 is allowed to touch Layer 1's behavior is the single documented exception in 5.2 rule 9 (`specialties` containing `paediatric` lifts the pediatric-treatment-plan restriction for that org only) — and that exception exists *because* it's written explicitly into this blueprint, not because `organization_ai_settings` has general authority to do so. The default assumption for any new setting, now or later, is "cannot touch section 5.2/5.3/5.4/3.13a" unless this document is amended to say otherwise. A feature flag in `ai_capabilities` being false means a capability is withheld, never that a safety rule is relaxed — turning capabilities off can only make the AI do less, never make it less safe.

### 5.6 Analytics narrative rule

Per section 3.14's three-layer architecture, any AI-generated business insight ("consider a discounted knee assessment campaign," the Weekly AI Brief in 3.14b) is produced exclusively from **Layer 1 (SQL) and Layer 2 (deterministic business-rule classification) output already written to `analytics_snapshots`** — never from raw session/message data, and never computed by the LLM itself. The Layer 3 narrator prompt receives only pre-aggregated, pre-classified numbers as input and is given no tool, retrieval, or database access to compute or look up anything further. This keeps "the AI helps Cherry run her business" from becoming a second, less-guarded hallucination surface alongside the patient-facing chat — and guarantees a number on the dashboard and the same number narrated in a Brief can never disagree, since both read the same `analytics_snapshots` row.

---

## 6. Safety, compliance, and privacy carryovers

- Continue the **data minimization** pattern already in the current app (BMI bucket, not raw values) — extend as a general principle: don't store patient-reported clinical detail beyond what's needed to qualify and book.
- Clear, persistent disclaimer in the UI: this is an AI assistant, not a medical professional, and does not replace clinical assessment.
- GDPR/NDPR-style posture (Nigeria's NDPR is the more directly applicable regime given the target market) should be revisited explicitly once patient data is actually persisted (it currently is not, by design, in the Streamlit app — this changes with `patients`/`appointments`/`messages` tables, so data handling policy needs a real pass before Phase 1 ships, not after).

---

## 7. Roadmap

### Phase 1 — MVP (Cherry live)
- Multi-tenant schema live in Supabase (all tables in section 3, RLS enforced) — Cherry's clinic seeded as the first `organizations` row.
- **Minimal `apps/admin` dashboard included in Phase 1, not deferred to Phase 2** — without it, every price change, service edit, or knowledge upload requires a developer, which defeats the "no code required to onboard" value proposition from day one. Minimal scope: confirm/decline/reschedule bookings (with qualification summary visible per booking), manage services/pricing, manage therapists, edit `clinic_settings`, add/edit `knowledge_documents` and `approved_resources`. Analytics/Clinic Intelligence (3.14) is explicitly *not* in this minimal scope — it needs real usage data to be meaningful and belongs in Phase 2.
- Next.js public site: landing page → AI qualification chat → in-app booking (no payment).
- AI orchestration with the full guardrail/tool-calling model from section 5, including per-org `organization_ai_settings` (3.13, 5.5).
- Deploy (target: Vercel for `apps/web`/`apps/admin`, Supabase hosted).
- Cherry using it for real patients.

### Phase 2 — Clinic operations at scale
- Clinic Intelligence: `analytics_snapshots` generation job (3.14a), admin dashboard views, and the Weekly AI Brief product surface (3.14b) — conversion stats, complaint frequency, booking funnel by body region, abandonment points, AI-narrated recommendations (5.6).
- Payments (Stripe/Paystack) — deposit at booking time.
- Email + WhatsApp notifications wired to booking status changes — "confirmed" language only ever sent after Cherry's action, never generated by the AI itself.

### Phase 3 — Multi-clinic SaaS
- Self-serve onboarding for a second/third clinic (org creation, AI Profile selection (3.13c), branding, `organization_ai_settings`/`ai_capabilities` config, knowledge upload flow).
- Subscription billing (`organizations.plan`/`billing_status` activated) — natural point to introduce plan tiers (Starter: AI chat/booking/FAQ; Professional: + analytics/knowledge management; Enterprise: multi-location/API/white-label) implemented purely as `ai_capabilities` flag presets per plan, not new code paths.
- Follow-up/retention flows, review requests.

### Phase 4 — Marketplace
- Patient-facing clinic discovery (search by condition/location), cross-clinic AI recommendation, referral system. Deliberately last — depends on having enough real clinics on the platform for a marketplace to mean anything.

### 7.1 Plan tiers (not committed, directional only)
Flagged here so `ai_capabilities` (3.13b) is designed with this in mind, without pretending pricing/packaging is decided: Starter (AI chat, booking, FAQ), Professional (+ analytics/Weekly AI Brief, knowledge base management), Enterprise (+ multi-location, API access, white-label branding). Because capabilities are already a flag map rather than hardcoded per-clinic logic, a plan tier is just a named preset of that map — no architecture change required when this is actually decided.

Implementation is executed sprint-by-sprint against this frozen blueprint — see section 10. The step-by-step order once given here is superseded by the sprint plan; do not treat them as two separate sequences.

---

## 8. Open items requiring a decision before implementation starts

These are flagged, not resolved, so nothing gets silently decided in code:

1. **AI orchestration runtime** — TypeScript-native vs. ported Python service (section 4.1). Recommendation given, not yet confirmed.
2. **Availability recurrence model** for `therapist_availability` — weekly recurring rule + exception dates is the intent; exact implementation (e.g. `rrule`-style vs. explicit generated slot rows) needs a decision at schema-build time.
3. **Auth provider** — assumed Supabase Auth for `users`; not yet explicitly confirmed.
4. **Platform pricing to clinics** — noted as "revisit post-Phase-1," not blocking, but shouldn't be forgotten.
5. **NDPR/privacy review** — needs a real pass once `patients`/`messages` persist data, flagged in section 6, not yet done.
6. **Exact `v_*` analytics view definitions** (3.14) — representative set given, final SQL written at implementation time against real Phase 1 usage data; not blocking since analytics is Phase 2.
7. **`organization_ai_settings` field list finality** (3.13) — shape and boundary are fixed; whether to add more fields later goes through this document first, not ad hoc.

---

## 9. What happens to the current repo

Once this blueprint is approved:
- Archive (don't silently delete) `templates/`, `tests/test_chatbot_engine.py`, `README_NEW.md`, `app.py_new`, `codebase_review.md`, `implemenation_plan.md`, `config.yaml`, `.env.example`, `src/core/data_loader.py`, `src/utils/config.py`, `src/utils/logger.py` — e.g. move to a `legacy/` folder in one commit, with a message referencing this blueprint, rather than deleting history. `data/knowledge_base.jsonl` is the one legacy file that is NOT archived — it migrates into `knowledge_documents` seed data (4.3).
- Rotate the exposed OpenAI key immediately, independent of the rebuild timeline.
- The current Streamlit app can keep running for Cherry as-is until Phase 1 of the new stack is ready to cut over — no reason to take her offline mid-rebuild.

---

## 10. Execution plan — sprints

This blueprint is executed one sprint at a time, not as a single "build BodyBalance" request. Each sprint is a checkpoint: review what was built against this document before starting the next one. This is deliberate — it's what keeps implementation traceable back to a specific section here instead of drifting.

### Sprint 1 — Foundation
Monorepo scaffold (4.1) · Next.js apps · Supabase project + full schema (section 3, all tables through 3.18) · RLS policies · auth (Supabase Auth, org context resolution) · seed data (Cherry's org + dev demo org) · `packages/domain` skeleton + repositories (4.2) · `packages/events` skeleton (3.15) · `audit_logs` wired to event subscribers (3.16).

### Sprint 2 — Admin
Clinic onboarding flow (including AI Profile selection, 3.13c) · therapists · services/pricing · availability management · knowledge base management (with versioning, 3.17) · `organization_ai_settings`/`ai_capabilities` editing UI — with `platform_policy` (3.13a) fields confirmed absent from every admin screen.

### Sprint 3 — Patient experience
Landing page (tenant-aware via `clinic_settings`) · AI qualification flow (1.5) · in-app booking (pending-confirmation flow, qualification-summary pre-fill) · notifications (WhatsApp + email, wired to `AppointmentConfirmed`/etc. events, never AI-generated "confirmed" language).

### Sprint 4 — AI
Guardrails (5.3, ported from `src/core/guardrails.py`) · RAG/retrieval (5.1, `search_knowledge`) · full tool-calling surface (5.4) routed through `packages/domain` only (4.2) · qualification flow logic (1.5) · `search_approved_resources` (3.10) · `escalate_to_human`.

### Sprint 5 — Polish
Deployment (Vercel + Supabase) · Clinic Intelligence (3.14, `analytics_snapshots` job, Weekly AI Brief) if pulled forward from Phase 2, otherwise deferred · testing · SEO · performance · cutover from the existing Streamlit app (section 9) once parity with Cherry's current live app is confirmed.

Each sprint's output is reviewed against this document, not against "did it seem to work" — a feature that works but bypasses a rule in section 5 (e.g. an AI tool that writes to `appointments` without going through `BookingService`) is a defect against this blueprint, not a shippable variance.
