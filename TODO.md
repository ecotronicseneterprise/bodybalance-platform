# BodyBalance Platform — TODO

Working state for the implementation of BLUEPRINT.md v1.0. Updated continuously.

## Sprint 1 — Foundation

- [x] Task 1: Monorepo + project structure (npm workspaces, apps/web, apps/admin, 6 packages, lint/typecheck/build green)
- [x] Pre-Task-2 architectural review → docs/DB-DECISIONS.md (12 frozen decisions, 8 evolve-later, 7 applied recommendations; resolves BLUEPRINT §8 open item 2 — availability recurrence model)
- [x] Task 2 (code): 7 migrations (16 tables, RLS everywhere, triggers) + idempotent seed (Cherry + demo org) + ai_profiles.json
- [ ] Task 2 (apply): blocked on Supabase project creation (founder) — apply steps in RUNBOOK.md → Migrations
- [ ] Sprint 4 carry-over: migrate data/knowledge_base.jsonl content into knowledge_documents WITH embeddings (needs LLM key + embedding pipeline)
- [ ] Task 3 prerequisite: staff users seeding happens through Supabase Auth signup (auth.users FK), not seed.sql
- [ ] Task 3: Auth (Supabase Auth) + organization context resolution
- [ ] Task 4: Domain layer (`packages/domain` services + repositories) + event bus (`packages/events`) + audit log subscriber
- [ ] Task 5: Admin dashboard foundation

## Blockers / waiting on founder

- [ ] **OpenAI key rotation** (BLUEPRINT 4.5): log in to platform.openai.com → API keys → revoke the key currently in `.streamlit/secrets.toml` → create a replacement → update Streamlit Cloud app secrets (App → Settings → Secrets) so Cherry's live app keeps working. Do NOT commit the new key anywhere.
- [ ] **Supabase project creation** (needed at Task 2): create a free-tier project at supabase.com; I'll provide exact steps when Task 2 reaches that point.

## Assumptions on record

- Legacy Streamlit app (`app.py`, `src/`, `data/`) stays untouched until Sprint 5 cutover; archival commit (BLUEPRINT §9) deferred to cutover. Approved by founder 2026-07-08.
- npm workspaces instead of pnpm (pnpm not installed; avoids new global tooling). Vercel supports npm monorepos natively.
- Next.js 15.x pinned for both apps; Tailwind v4; shadcn/ui added when first real UI is built (Sprint 2) — not installed while there are no components to justify it.
- LLM provider abstraction (OpenAI default, swappable) is an accepted implementation constraint from kickoff; lands in Sprint 4 with `packages/ai`.
