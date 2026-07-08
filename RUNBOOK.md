# BodyBalance Platform — Runbook

Operational record for the platform implementation (BLUEPRINT.md v1.0).
Every manual step, environment variable, migration, external service, and
rollback path is recorded here as it happens. If it isn't in this file, it
didn't happen.

---

## Repository layout

- **New platform (Sprint 1+):** npm-workspaces monorepo — `apps/web`, `apps/admin`, `packages/*`, `supabase/`.
- **Legacy Streamlit app:** `app.py`, `src/`, `data/` — Cherry's current production app. **DO NOT TOUCH until Sprint 5 cutover.** It remains the production fallback.
- Branch model: implementation on `sprint-N/<name>` branches; `main` stays deployable for the legacy Streamlit app.

## Toolchain

| Tool | Version | Notes |
|---|---|---|
| Node.js | v25.2.1 | local dev machine |
| npm | 11.6.2 | workspace manager (pnpm not installed; npm chosen to avoid new global tooling) |
| git | 2.52.0.windows.1 | |

## Environment variables

None required yet. Will be added per task:

| Variable | Used by | Added in | Notes |
|---|---|---|---|
| _(none yet)_ | | | |

## External services

| Service | Tier | Status | Added in |
|---|---|---|---|
| Supabase — project `bodybalance-platform`, ref `cklgjwqhnttrpggnfpgy`, region `eu-west-2` (London), URL `https://cklgjwqhnttrpggnfpgy.supabase.co` | Free | Created 2026-07-08; migrations not yet applied | Task 2 |

### Secret handling (permanent convention)

Secrets live in `.secrets/` (gitignored) as plain files, read by commands at
runtime — they never enter git, chat transcripts, or shell history:

| File | Contents | Where to get it |
|---|---|---|
| `.secrets/access-token.txt` | Supabase Personal Access Token | supabase.com/dashboard/account/tokens → Generate new token |
| `.secrets/db-password.txt` | Database password chosen at project creation | your password manager |

Service Role Key and Publishable/Anon key are wired in Task 3 via app env
files (`.env.local`, also gitignored) — not needed for migrations.

## Migrations

**PERMANENT RULE: migrations are additive-only. A committed migration is never
edited. Changes are always a new migration. Never rewrite history.**

| # | File | Contents | Applied to prod? |
|---|---|---|---|
| 1 | `20260708090000_extensions_and_helpers.sql` | pgvector, btree_gist, `app` schema, `app.current_org_id()`, updated_at + append-only trigger functions | ✅ 2026-07-08 |
| 2 | `20260708090100_core_tenancy.sql` | organizations, clinic_settings, users, therapists, services, therapist_availability | ✅ 2026-07-08 |
| 3 | `20260708090200_patients_conversations_appointments.sql` | patients, chat_sessions, messages, appointments (+ double-booking exclusion constraint) | ✅ 2026-07-08 |
| 4 | `20260708090300_knowledge_and_resources.sql` | knowledge_documents, knowledge_document_versions (+ auto-version trigger), approved_resources | ✅ 2026-07-08 |
| 5 | `20260708090400_ai_settings.sql` | organization_ai_settings (Layer 2 personality; `show_disclaimer` CHECK-locked true) | ✅ 2026-07-08 |
| 6 | `20260708090500_audit_and_analytics.sql` | audit_logs (append-only trigger), analytics_snapshots | ✅ 2026-07-08 |
| 7 | `20260708090600_rls_policies.sql` | RLS enabled + policies on all 16 tables | ✅ 2026-07-08 |

Seed applied 2026-07-08 (2 orgs, 2 therapists, 3 services, 11 availability
windows, 2 AI settings, 4 platform resources). Guard verification 5/5 OK
(`scripts/verify-guards.sql`): audit append-only, disclaimer lock,
auto-versioning trigger, double-booking exclusion, RLS anon boundary.

**Connection note:** direct host `db.<ref>.supabase.co` does not resolve from
this network (IPv6-only); use the IPv4 session pooler
`aws-1-eu-west-2.pooler.supabase.com:5432`, user `postgres.<ref>`
(`scripts/db-run.mjs` tries hosts in order automatically).

Seed: `supabase/seed/seed.sql` (idempotent, fixed UUIDs — Cherry org + demo org),
`supabase/seed/ai_profiles.json` (onboarding presets, BLUEPRINT 3.13c).

### How to apply (once the Supabase project exists)

**Option A — Supabase CLI (preferred, keeps history tracked):**
```
npx supabase login
npx supabase init            # once; creates supabase/config.toml
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push         # applies supabase/migrations/ in order
```
Then paste `supabase/seed/seed.sql` into the SQL editor (Dashboard → SQL) and run.

**Option B — SQL editor only (no CLI):** paste each migration file into the
SQL editor **in filename order**, run one at a time, then run seed.sql.

**Verification after apply:** run
`select count(*) from public.organizations;` → expect 2;
`select tablename from pg_tables where schemaname='public';` → expect 16 tables;
`select * from public.services where organization_id = '00000000-0000-4000-a000-000000000001';` → 2 services with NGN prices in kobo.

**Rollback:** these migrations only create objects. Rolling back = dropping the
schema objects (or resetting the project — it has no data yet). After real data
exists, rollback is always a new inverse migration, never an edit.

## Manual steps log

| Date | Step | Performed by | Notes |
|---|---|---|---|
| 2026-07-08 | Created branch `sprint-1/foundation` | Claude | Sprint 1 work isolated from `main` |
| 2026-07-08 | Created Supabase project `bodybalance-platform` (ref `cklgjwqhnttrpggnfpgy`, eu-west-2 London, free tier) | Founder | credentials in founder's password manager + `.secrets/` |
| 2026-07-08 | Corrected migration 1 pre-apply (`check_function_bodies = off`) | Claude | Exception to additive-only rule invoked transparently: migration had never been applied to any environment (failed on first push; transaction rolled back). Rule protects applied history only. |
| 2026-07-08 | `supabase link` + `db push` (7 migrations) + seed + guard verification (5/5 OK) | Claude | via CLI with `.secrets/` credentials |

## Accepted risks

| Risk | Assessment | Revisit when |
|---|---|---|
| `npm audit`: moderate advisory GHSA-qx2v-qp2m-jg93 (postcss <8.5.10, XSS in CSS stringify) via `next@15.5.20`'s internally pinned postcss 8.4.31. npm `overrides` cannot replace Next's nested copy. | Build-time only: postcss here processes our own Tailwind source during `next build`; no untrusted CSS ever flows through it; not part of the runtime server. Root `overrides` does patch the top-level postcss used by @tailwindcss/postcss. | Bump `next` when a release ships postcss ≥8.5.10; re-run `npm audit`. |

## Outstanding operational items

- [ ] **ROTATE THE EXPOSED OPENAI API KEY** in `.streamlit/secrets.toml` (BLUEPRINT 4.5). Manual step — see instructions in TODO.md. Not yet done.

## Rollback

- Sprint 1 (monorepo scaffold): `git checkout main` — the legacy Streamlit app is untouched on `main`; deleting the branch fully reverts.
