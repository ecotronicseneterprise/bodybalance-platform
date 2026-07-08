# Database Decisions — Pre-Migration Architectural Review

Reviewed against a future of 10,000 clinics, 1M patients, millions of
messages/embeddings, multiple AI providers, white-label deployments, billing,
multi-location clinics, multiple countries/languages, and FHIR/EMR integration.
Scope: structural database decisions only. Blueprint (v1.0) is not redesigned.

Permanent rule adopted alongside this review: **migrations are additive-only.
A committed migration is never edited. Changes are always new migrations.**

---

## 1. Frozen forever (changing these later means rewriting the platform)

| # | Decision | Rationale |
|---|---|---|
| F1 | **UUID primary keys, generated in the database** (`gen_random_uuid()`), never serial/bigserial. | Serial ids leak tenant volume, enable cross-tenant enumeration guessing, and break on merge/import (EMR migrations, clinic acquisitions). Retrofit = every FK on the platform. |
| F2 | **`organization_id uuid NOT NULL` on every tenant-scoped table, FK to `organizations`, denormalized even where derivable** (e.g. `messages` carries it despite `chat_session_id`). All tenant indexes lead with `organization_id`. | RLS must never require a join (BLUEPRINT 3.12). Partitioning-by-tenant later requires the column to already be everywhere. |
| F3 | **All timestamps `timestamptz`, always UTC.** Clinic-local time exists only at render, via IANA `clinic_settings.timezone`. Never `timestamp without time zone`. `created_at NOT NULL DEFAULT now()` on every table. | Retrofitting timezone-awareness across countries is one of the most expensive known migrations. |
| F4 | **Money = integer minor units + ISO 4217 code** (`price_amount_minor integer`, `price_currency char(3)` — ₦150,000 stored as `15000000, 'NGN'`). Never floats, never a single global currency assumption. | Multi-country is on the roadmap; float money is unfixable once bookings/payments reference it. |
| F5 | **No native Postgres ENUM types. All enums are `text` + `CHECK` constraint.** | Native enums can't remove/rename values without painful surgery; text+CHECK changes are a single additive migration. Also fully portable. |
| F6 | **Deletion strategy: clinical/booking/audit rows are never hard-deleted.** Content tables (`services`, `therapists`, `knowledge_documents`, `approved_resources`) use `active` (business visibility) and `deleted_at` (soft delete). `patients` get NDPR/GDPR erasure via **anonymization in place** (`anonymized_at` + nulling PII columns), keeping the row skeleton so appointments/analytics history stays consistent. | Hard deletes orphan appointments, break analytics_snapshots reproducibility (BLUEPRINT 3.14), and violate audit expectations for healthcare software. |
| F7 | **`audit_logs` is append-only with NO foreign keys to the entities it describes** (`entity`, `entity_id` are plain values). DB trigger rejects UPDATE/DELETE regardless of role. | FKs would block anonymization/archival of the referenced rows; an editable audit log isn't one (BLUEPRINT 3.16). |
| F8 | **Embeddings carry their model: `embedding vector(1536)` + `embedding_model text NOT NULL`.** A model/provider change is a new column or re-embed job — never a silent reinterpretation of existing vectors. | Vectors from different models are incomparable; without the model column, a provider switch corrupts retrieval invisibly. Supports the multi-provider goal. |
| F9 | **RLS mechanism: every policy resolves the tenant through one function, `app.current_org_id()`** (GUC `app.current_organization_id` for server flows, staff-JWT lookup for dashboard). The only Supabase-specific call (`auth.uid()`) lives inside this single function. | One indirection point = portable to any managed Postgres by reimplementing one function. Policies themselves are pure Postgres. |
| F10 | **`organizations.slug` is unique, lowercase, URL-safe, and treated as immutable** (renames require an explicit redirect strategy, later). | Slugs are in patient-facing URLs, QR codes, and eventually SEO indexes. |
| F11 | **Availability semantics: `time` columns in `therapist_availability` are clinic-local**, interpreted via `clinic_settings.timezone`; `appointments.scheduled_start/end` are `timestamptz` (absolute). | Mixing the two conventions later is a silent-corruption class of bug. Frozen as semantics, not just schema. |
| F12 | **Contact identity formats: phones stored E.164 (`+234...`), emails lowercased.** Enforced by CHECK where cheap. | Dedup, WhatsApp integration, and future patient-matching all depend on canonical formats. |

## 2. Safe to evolve later (explicitly not decided now)

| # | Area | Why deferral is safe |
|---|---|---|
| E1 | **Partitioning** of `messages`, `audit_logs`, `analytics_snapshots`. | F2+F3 (org column + created_at everywhere, composite indexes) keep partition migration mechanical. Not worth the complexity below tens of millions of rows. |
| E2 | **Multi-location clinics.** | An additive `locations` table + nullable `appointments.location_id` later. `clinic_settings.address` remains "primary location" until then. |
| E3 | **Full-text/hybrid search** alongside pgvector. | `tsvector` columns/indexes are purely additive. |
| E4 | **UUIDv7 for index locality** at high write volume. | Changing a column DEFAULT is trivial; existing v4 keys remain valid. |
| E5 | **FHIR/EMR mapping.** | Additive `external_refs jsonb` or mapping tables when a real integration exists. Stable UUIDs (F1) are the only prerequisite, already met. |
| E6 | **Custom domains / white-label routing.** | Additive table keyed by organization_id. Slug (F10) stays the canonical internal handle. |
| E7 | **Storage buckets.** | Created via migration in Sprint 2 when the first upload feature (logos) exists. Convention frozen in spirit: store bucket+path, generate signed URLs at read — never persist full URLs for platform-managed files. |
| E8 | **`v_*` analytics views** (BLUEPRINT 3.14, open item #6). | Views are replaceable objects; `analytics_snapshots` (created now) is the durable contract. |

## 3. Strongly recommended before the first migration (applied in Task 2)

| # | Recommendation | Notes |
|---|---|---|
| R1 | **`knowledge_documents.language text NOT NULL DEFAULT 'en'`** (BCP-47). | Adding the column later is cheap; backfilling unknown languages across tenants is not. Multi-language is in `organization_ai_settings.supported_languages` already — content needs the same axis. |
| R2 | **Database-level double-booking prevention**: exclusion constraint on `appointments` (`therapist_id` overlap over `tstzrange(scheduled_start, scheduled_end)` for statuses `pending_confirmation`/`confirmed`), via `btree_gist`. | BookingService validates first (BLUEPRINT 4.2), but the DB guarantee holds even under concurrent requests — determinism at the layer that can actually promise it. |
| R3 | **Knowledge versioning enforced by trigger, not application discipline** — every INSERT/content-UPDATE on `knowledge_documents` auto-writes a `knowledge_document_versions` row. | BLUEPRINT 3.17 says versioning must not be a manual step; a trigger is the deterministic reading of that. |
| R4 | **1:1 tables use `organization_id` as their PRIMARY KEY** (`clinic_settings`, `organization_ai_settings`) instead of a separate id + unique FK. | Structurally guarantees 1:1; one less index; blueprint-compatible ("fk, unique"). |
| R5 | **`platform_policy` (BLUEPRINT 3.13a) is implemented as versioned code/config, NOT a database table.** | The blueprint allows either; code is the stronger guarantee that no data-write path (including a future admin bug) can ever touch it. Recorded here so nobody "helpfully" adds the table later. |
| R6 | **Seed data uses fixed, documented UUIDs and is idempotent** (`on conflict do nothing`). | Re-runnable in every environment; Cherry's org id never differs between dev/staging/prod. |
| R7 | **`appointments.status` transitions guarded in the domain layer, with DB default `'pending_confirmation'`** — no INSERT can create a confirmed appointment without explicitly claiming it, and the AI's tool path never sets status at all. | Complements BLUEPRINT 5.2 rule 3 at the storage layer without moving business logic into triggers. |

## Open blueprint item resolved here (was §8 item 2)

**Availability recurrence model:** single `therapist_availability` table, one row per
weekly-recurring window (`day_of_week`) **or** date-specific window/block
(`specific_date` + `is_blocked`), CHECK-enforced exactly-one-of. No rrule
strings, no pre-generated slot rows. Slot computation happens in
AvailabilityService (Task 4) from these rows + existing appointments.
Rationale: rrule is overkill for clinic hours; pre-generated slots create a
sync problem the blueprint's deterministic reading forbids. This is the
smallest model that supports "weekly pattern + holiday exceptions" (BLUEPRINT 3.6).
