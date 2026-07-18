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

Generated into `apps/admin/.env.local` and `apps/web/.env.local` (both
gitignored) by `node scripts/write-env.mjs` from `.secrets/` files. Re-run
after any key rotation.

| Variable | Used by | Added in | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | both apps | Task 3 | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | both apps (auth, RLS-scoped reads) | Task 3 | public by design — "Publishable key" in new dashboard naming; source: `.secrets/anon-key.txt` |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (auth admin, platform jobs) | Task 3 | SECRET — bypasses RLS; source: `.secrets/service-role-key.txt` |
| `DATABASE_URL` | server only (`withOrgContext` RLS-enforced path) | Task 3 | SECRET — IPv4 session pooler, `postgres.<ref>` user |

Staff account creation (until Sprint 2A self-serve onboarding):
`node scripts/create-staff-user.mjs <email> "<full name>" <org-slug> <role>`
(prompts for password; or set `BB_STAFF_PASSWORD` env var for non-interactive use).

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
| 2026-07-18 | Supabase free-tier project auto-paused after 7 idle days (last activity 2026-07-11); restored via dashboard | Founder | Symptom: pooler returns "tenant/user not found". See Accepted risks. |
| 2026-07-18 | Migration 11 (`20260711100000_multi_vertical`) pushed + verified: ai_profile CHECK dropped (0 remaining), `clinic_settings.terminology` added; types regenerated from live schema (1091 lines, empty-output guard now in procedure) | Claude | part of multi-vertical de-hardcoding |

## Deployment pipeline (Sprint 1.5, established 2026-07-08)

| Item | Value |
|---|---|
| Platform repo | `github.com/ecotronicseneterprise/bodybalance-platform` (make **Private** — founder action) |
| Legacy repo | `github.com/cliffordnwanna/BODYBALANCE.AI` (public, serves Cherry's Streamlit app until Sprint 5 cutover) |
| Local remotes | `origin` = legacy repo, `platform` = platform repo. Push: `git push platform sprint-1/foundation:main` |
| Vercel project | `bodybalance-platform` (Hobby, Clifford's projects), **Root Directory: `apps/admin`**, framework Next.js |
| Production URL | https://bodybalance-platform.vercel.app |
| Auto-deploy | every push to `main` → Production; other branches → Preview deployments |
| Env vars | 4 vars (see Environment variables section) pasted from `.secrets/vercel-env-admin.txt` (regenerate: `node scripts/write-vercel-env.mjs`), applied to Production + Preview |
| Supabase Auth | site_url = production URL; redirect allowlist = production + preview wildcard + `http://localhost:3001` `/auth/confirm` (set via management API — PATCH `/v1/projects/<ref>/config/auth`) |
| Rollback | Vercel dashboard → Deployments → previous deployment → "Promote to Production" (instant); code rollback = revert commit + push |

Deploy-failure log (issues surfaced and fixed by this sprint):
1. Python-era `.gitignore` `lib/` pattern had excluded `apps/admin/src/lib/` from git entirely (fixed: anchored patterns, commit `b36c9f63`).
2. Windows-generated lockfile lacked Linux native binaries for Tailwind (`@tailwindcss/oxide`, `lightningcss`) (fixed: clean lockfile regeneration, commit `e9828c7d`).

Smoke results (2026-07-08): `/` `/onboarding` `/feedback` → 307 to login (middleware gate live in prod); `/login` `/signup` → 200; verify-auth 4/4 against the same DB the deployment uses. Browser-level cookie flow: founder manual checklist (see TODO).

## Accepted risks

| Risk | Assessment | Revisit when |
|---|---|---|
| ~~`npm audit`: moderate advisory GHSA-qx2v-qp2m-jg93 (postcss <8.5.10) via next's pinned postcss~~ **RESOLVED 2026-07-08**: clean lockfile regeneration picked a patched Next release; `npm audit` reports 0 vulnerabilities. | — | — |
| Vercel Preview deployments share the production Supabase project (no staging DB). | Acceptable during internal alpha — no real patient data yet. | Before Cherry starts entering real patient data: create a separate Supabase project for previews, or disable preview deploys. |
| Supabase free tier auto-pauses the project after ~7 idle days (pooler then reports "tenant not found"; restore via dashboard takes ~2 min). | Acceptable during development. | **Pre-launch blocker:** before Cherry relies on the platform, upgrade to Pro ($25/mo) or ensure sustained traffic — a paused DB means a dead product. |

## Outstanding operational items

- [ ] **ROTATE THE EXPOSED OPENAI API KEY** in `.streamlit/secrets.toml` (BLUEPRINT 4.5). Manual step — see instructions in TODO.md. Not yet done.

## Rollback

- Sprint 1 (monorepo scaffold): `git checkout main` — the legacy Streamlit app is untouched on `main`; deleting the branch fully reverts.
