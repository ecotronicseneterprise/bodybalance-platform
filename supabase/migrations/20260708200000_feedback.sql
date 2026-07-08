-- 20260708200000_feedback.sql
-- Product feedback from clinic staff (founder decision 2026-07-08: Cherry is
-- Product Owner — her workflow insights are captured in-product from day one).
-- Additive-only; never edit after this has been applied anywhere.

create table public.feedback (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  user_id          uuid references public.users (id),
  title            text not null,
  body             text,
  category         text not null default 'general'
                   check (category in ('bug', 'feature_request', 'workflow', 'general')),
  priority         text not null default 'medium'
                   check (priority in ('low', 'medium', 'high')),
  status           text not null default 'open'
                   check (status in ('open', 'planned', 'done', 'dismissed')),
  created_at       timestamptz not null default now()
);

create index feedback_org_created_idx on public.feedback (organization_id, created_at);

alter table public.feedback enable row level security;

create policy tenant_all_feedback on public.feedback
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());
