# BodyBalance Platform — TODO

Working state for the implementation of BLUEPRINT.md v1.0. Updated continuously.

## Sprint 1 — Foundation

- [x] Task 1: Monorepo + project structure (npm workspaces, apps/web, apps/admin, 6 packages, lint/typecheck/build green)
- [x] Pre-Task-2 architectural review → docs/DB-DECISIONS.md (12 frozen decisions, 8 evolve-later, 7 applied recommendations; resolves BLUEPRINT §8 open item 2 — availability recurrence model)
- [x] Task 2 (code): 7 migrations (16 tables, RLS everywhere, triggers) + idempotent seed (Cherry + demo org) + ai_profiles.json
- [x] Task 2 (apply): 7 migrations pushed to `bodybalance-platform` (cklgjwqhnttrpggnfpgy), seeded, guard suite 5/5 OK — 2026-07-08
- [ ] Sprint 4 carry-over: migrate data/knowledge_base.jsonl content into knowledge_documents WITH embeddings (needs LLM key + embedding pipeline)
- [x] Task 3: auth + org context — verify-auth 4/4 live (anon-key sign-in, org resolution, 2× cross-tenant isolation)
- [x] Task 4: domain layer + event bus + audit subscribers — verify-domain 5/5 live (slots, pending booking, double-booking refused, AI transition refused, audit trail)
- [x] Task 5 (part 1): self-serve onboarding — signup → email verify → create clinic → first user = owner. Live-verified 6/6. (Founder decision: NO manually created owners; Cherry signs up through the real flow.)
- [ ] Task 5 (part 2): dashboard nav foundation (sections skeleton for Sprint 2)
- [ ] Pre-launch: run `node scripts/cleanup-test-data.mjs --wipe-demo=all` to remove demo org + any test users, then Cherry signs up fresh at /signup
- [ ] Cherry onboarding note: seeded `bodybalance` org will be superseded by her self-created clinic; the seeded org gets wiped with the demo data before launch
- [ ] Task 3: Auth (Supabase Auth) + organization context resolution
- [ ] Task 4: Domain layer (`packages/domain` services + repositories) + event bus (`packages/events`) + audit log subscriber
- [ ] Task 5: Admin dashboard foundation

## Sprint 1.5 — Deployment (2026-07-08)

- [x] Platform pushed to `ecotronicseneterprise/bodybalance-platform` (main)
- [x] Vercel project live: https://bodybalance-platform.vercel.app (root dir apps/admin, 4 env vars, auto-deploy on push)
- [x] Supabase Auth site_url + redirect allowlist configured (prod, preview wildcard, localhost)
- [x] HTTP smoke: public routes 200, protected routes 307→login; verify-auth 4/4
- [ ] Founder browser walkthrough on the live URL: signup (+test email) → email link → onboarding → dashboard → submit feedback → logout → login
- [ ] Founder: make `bodybalance-platform` repo **Private** (deploy is green — no reason to stay public)
- [ ] apps/web Vercel project — deferred to Sprint 3 when the patient site has content

## Sprint 2A — trust-test slice (2026-07-18)

- [x] Permission matrix + withStaffContext (5 unit tests); feedback write folded through it
- [x] Password reset E2E — live-verified 5/5; /auth/confirm handles both PKCE and token_hash links
- [x] Minimal design system: tokens + Button/Field/Card/AppShell/Toast/Skeleton; all reachable pages restyled; mobile nav
- [x] loading/error/not-found on Cherry-facing routes
- [x] Local production smoke: 7 routes correct; tokens in compiled CSS
- [ ] Founder: push to deploy (`git push platform sprint-1/foundation:main`), then Claude runs production smoke
- [ ] Founder: Cherry walkthrough on her phone
- [ ] Deferred by timebox (named, safe to defer — nothing in today's test touches them): DataTable, Dialog, EmptyState, SetupProgress, StatCard, Badge, PageHeader components; signup/onboarding conversion to shared Field components (restyled with tokens instead); Toast on auth pages; per-route error boundaries beyond global
- [ ] Reminder: old OpenAI key file deleted from disk, but server-side revocation at platform.openai.com still recommended

## Blockers / waiting on founder

- [ ] **OpenAI key rotation** (BLUEPRINT 4.5): log in to platform.openai.com → API keys → revoke the key currently in `.streamlit/secrets.toml` → create a replacement → update Streamlit Cloud app secrets (App → Settings → Secrets) so Cherry's live app keeps working. Do NOT commit the new key anywhere.
- [x] **Supabase project created** — `bodybalance-platform`, eu-west-2 (London), free tier. Done 2026-07-08.

## Assumptions on record

- Legacy Streamlit app (`app.py`, `src/`, `data/`) stays untouched until Sprint 5 cutover; archival commit (BLUEPRINT §9) deferred to cutover. Approved by founder 2026-07-08.
- npm workspaces instead of pnpm (pnpm not installed; avoids new global tooling). Vercel supports npm monorepos natively.
- Next.js 15.x pinned for both apps; Tailwind v4; shadcn/ui added when first real UI is built (Sprint 2) — not installed while there are no components to justify it.
- LLM provider abstraction (OpenAI default, swappable) is an accepted implementation constraint from kickoff; lands in Sprint 4 with `packages/ai`.
