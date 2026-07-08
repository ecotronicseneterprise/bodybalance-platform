-- 20260708090500_audit_and_analytics.sql
-- audit_logs (BLUEPRINT 3.16) + analytics_snapshots (BLUEPRINT 3.14a).
-- Additive-only; never edit after commit.

-- 3.16 audit_logs — append-only, attributable, NO foreign keys to the
-- entities it describes (DB-DECISIONS F7): audited rows may later be
-- anonymized or archived without cascading into the audit trail.
create table public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  actor_type       text not null check (actor_type in
                     ('staff_user', 'ai_system', 'patient', 'platform_admin')),
  user_id          uuid,   -- deliberately no FK (F7); null for ai_system/patient
  action           text not null,        -- e.g. 'booking.confirmed', 'service.price_updated'
  entity           text not null,        -- table/aggregate name
  entity_id        uuid,
  before           jsonb,
  after            jsonb,
  ip_address       inet,
  created_at       timestamptz not null default now()
);

create index audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at);
create index audit_logs_entity_idx
  on public.audit_logs (entity, entity_id);

-- Append-only enforced at the database, regardless of caller role.
create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function app.reject_mutation();

-- 3.14a analytics_snapshots — the single stable dataset both the dashboard
-- and the Weekly AI Brief narrator read from. Numbers are computed by SQL
-- jobs (Layer 1) + deterministic classification (Layer 2); the LLM only ever
-- receives rows from this table (BLUEPRINT 3.14, 5.6). Phase 2 populates it;
-- the contract exists from day one so nothing else grows into its place.
create table public.analytics_snapshots (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  period_type      text not null check (period_type in ('daily', 'weekly')),
  period_start     date not null,
  period_end       date not null,
  metrics          jsonb not null,
  generated_at     timestamptz not null default now(),
  unique (organization_id, period_type, period_start),
  constraint analytics_period_valid check (period_start <= period_end)
);

create index analytics_snapshots_org_period_idx
  on public.analytics_snapshots (organization_id, period_type, period_start);
