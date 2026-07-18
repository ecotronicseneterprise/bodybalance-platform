# BodyBalance Platform

**A multi-vertical clinic operating system** — patient acquisition,
qualification, booking, and daily operations for appointment-based clinics,
delivered as multi-tenant SaaS with an AI receptionist at the front door.

Physiotherapy is the **pilot vertical** (first tenant: BodyBalance Clinic,
Lagos), not the target market. Nothing vertical-specific is hardcoded: clinic
type, terminology (Physiotherapists / Dentists / Practitioners…), branding,
services, and the AI assistant's personality are all per-tenant configuration.
The domain concept is **Practitioner**; the pilot-era `therapists` table name
is an internal identifier that never surfaces in UI.

**Source of truth:** [BLUEPRINT.md](BLUEPRINT.md) (v1.1) for product and
architecture; [docs/SPRINT-2-PLAN.md](docs/SPRINT-2-PLAN.md) (rev 2) for the
current implementation phase; [docs/DB-DECISIONS.md](docs/DB-DECISIONS.md)
for frozen database decisions; [RUNBOOK.md](RUNBOOK.md) for operations.
This README intentionally duplicates none of them.

## Build status

**Sprint 1 + 1.5 (complete):** multi-tenant Postgres schema (17 tables, RLS
everywhere, additive-only migrations), Supabase Auth with self-serve clinic
onboarding (first user becomes owner), domain layer (booking, availability,
permissions) with an event bus and immutable audit trail, PII firewall
package, Vercel deployment pipeline.

**Sprint 2A (in progress):** live — platform design system (purple `#6D4AFF`
tokens + shared components), responsive app shell, password reset end-to-end,
role permission floor (`withStaffContext`), designed pages for every nav
section. Coming — 2B clinic configuration (services / practitioners /
availability / knowledge editing, terminology presets), 2C operations
(appointment queues, manual booking), then the patient site (Sprint 3) and
the AI assistant itself (Sprint 4).

The legacy Streamlit prototype in `app.py`/`src/` is retired.

## Structure

```
apps/web        patient-facing site (placeholder until Sprint 3)
apps/admin      clinic dashboard (Next.js 15, deployed)
packages/       shared, database, domain, events, privacy, ai, ui
supabase/       migrations (additive-only) + seed
scripts/        ops + live verification scripts (verify-*.mjs)
docs/           blueprint, sprint plans, DB decisions
```

## Development

Requires Node ≥ 20 and a `.secrets/` directory (gitignored) — see
RUNBOOK.md → "Secret handling" for the expected files.

```
npm install
node scripts/write-env.mjs      # generates apps/*/.env.local from .secrets/
npm run dev:admin               # http://localhost:3001
```

Quality gates (all must pass before commit):

```
npm run typecheck
npm run lint
npm run test
npm run build
```

Database (Supabase; migrations are additive-only, never edited after apply):

```
npx supabase db push            # apply pending migrations
node scripts/db-run.mjs <file.sql>
node scripts/db-run.mjs --query "select ..."
```

Live verification suites (self-cleaning, run against the real project):
`verify-auth.mjs` · `verify-domain.mjs` · `verify-onboarding.mjs` ·
`verify-password-reset.mjs` · `verify-guards.sql` (via `db-run`).

Deployment: push to `main` on the platform repo → Vercel auto-deploys
`apps/admin`. Rollback and full pipeline details in RUNBOOK.md.
