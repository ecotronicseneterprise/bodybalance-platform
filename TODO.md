# BodyBalance Platform — TODO

Working state for the implementation of BLUEPRINT.md v1.0. Updated continuously.

## Sprint 1 — Foundation

- [x] Task 1: Monorepo + project structure (npm workspaces, apps/web, apps/admin, 6 packages, lint/typecheck/build green)
- [ ] Task 2: Supabase — schema (BLUEPRINT §3, all tables through 3.18), RLS, migrations, seed data (Cherry org + dev demo org)
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
