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
| _(none yet — Supabase project created in Task 2)_ | | | |

## Migrations

None yet. Task 2 introduces `supabase/migrations/`.

## Manual steps log

| Date | Step | Performed by | Notes |
|---|---|---|---|
| 2026-07-08 | Created branch `sprint-1/foundation` | Claude | Sprint 1 work isolated from `main` |

## Accepted risks

| Risk | Assessment | Revisit when |
|---|---|---|
| `npm audit`: moderate advisory GHSA-qx2v-qp2m-jg93 (postcss <8.5.10, XSS in CSS stringify) via `next@15.5.20`'s internally pinned postcss 8.4.31. npm `overrides` cannot replace Next's nested copy. | Build-time only: postcss here processes our own Tailwind source during `next build`; no untrusted CSS ever flows through it; not part of the runtime server. Root `overrides` does patch the top-level postcss used by @tailwindcss/postcss. | Bump `next` when a release ships postcss ≥8.5.10; re-run `npm audit`. |

## Outstanding operational items

- [ ] **ROTATE THE EXPOSED OPENAI API KEY** in `.streamlit/secrets.toml` (BLUEPRINT 4.5). Manual step — see instructions in TODO.md. Not yet done.

## Rollback

- Sprint 1 (monorepo scaffold): `git checkout main` — the legacy Streamlit app is untouched on `main`; deleting the branch fully reverts.
