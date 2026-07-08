-- 20260708090600_rls_policies.sql
-- Row-Level Security for every table (BLUEPRINT 2.1, 3.18).
-- RLS is the BACKSTOP layer: application code is always org-scoped too, but a
-- broken query must still be unable to leak cross-tenant data.
-- A migration adding a tenant-scoped table without RLS is a blocking defect.
-- Additive-only; never edit after commit.
--
-- Access model:
--   * Staff dashboard: authenticated role; app.current_org_id() resolves the
--     caller's organization via their users row.
--   * Server flows (patient site, AI, jobs): a direct connection sets
--     set_config('app.current_organization_id', <org>, true) per transaction
--     (wired in Task 3). Same function, same policies.
--   * RLS enforces the TENANT boundary. Fine-grained role authorization
--     (owner vs receptionist etc.) lives in the domain layer (BLUEPRINT 4.2).
--   * Public (anon) read is granted ONLY to marketing-surface data.

-- ---------------------------------------------------------------- enable all
alter table public.organizations               enable row level security;
alter table public.clinic_settings             enable row level security;
alter table public.users                       enable row level security;
alter table public.therapists                  enable row level security;
alter table public.services                    enable row level security;
alter table public.therapist_availability     enable row level security;
alter table public.patients                    enable row level security;
alter table public.chat_sessions               enable row level security;
alter table public.messages                    enable row level security;
alter table public.appointments                enable row level security;
alter table public.knowledge_documents         enable row level security;
alter table public.knowledge_document_versions enable row level security;
alter table public.approved_resources          enable row level security;
alter table public.organization_ai_settings    enable row level security;
alter table public.audit_logs                  enable row level security;
alter table public.analytics_snapshots         enable row level security;

-- ------------------------------------------------------- public marketing read
-- Anonymous visitors may read what a clinic's public site displays: the
-- clinic's identity, branding, hours, active services (incl. prices — public
-- marketing data), active therapists, and availability windows.
create policy public_read_organizations on public.organizations
  for select using (deleted_at is null);

create policy public_read_clinic_settings on public.clinic_settings
  for select using (true);

create policy public_read_services on public.services
  for select using (active and deleted_at is null);

create policy public_read_therapists on public.therapists
  for select using (active and deleted_at is null);

create policy public_read_availability on public.therapist_availability
  for select using (true);

-- --------------------------------------------------------- tenant isolation
-- One pattern, every tenant table: rows visible/writable only within the
-- active organization (staff JWT or server GUC — see app.current_org_id()).

create policy tenant_all_organizations on public.organizations
  for all
  using (id = app.current_org_id())
  with check (id = app.current_org_id());

create policy tenant_all_clinic_settings on public.clinic_settings
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_users on public.users
  for all
  using (organization_id = app.current_org_id() or id = auth.uid())
  with check (organization_id = app.current_org_id());

create policy tenant_all_therapists on public.therapists
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_services on public.services
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_availability on public.therapist_availability
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_patients on public.patients
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_chat_sessions on public.chat_sessions
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_messages on public.messages
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_appointments on public.appointments
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_knowledge_documents on public.knowledge_documents
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

-- Versions: readable within the org; NO insert/update/delete policy — rows
-- are written exclusively by the security-definer trigger (3.17) and the
-- append-only trigger blocks mutation for every role.
create policy tenant_read_knowledge_versions on public.knowledge_document_versions
  for select using (organization_id = app.current_org_id());

-- approved_resources: platform defaults (organization_id IS NULL) readable by
-- every tenant; clinic rows only by their own org (BLUEPRINT 3.18). Writes
-- only to own-org rows; platform seeds are managed by platform jobs.
create policy tenant_read_approved_resources on public.approved_resources
  for select using (organization_id is null or organization_id = app.current_org_id());

create policy tenant_write_approved_resources on public.approved_resources
  for insert with check (organization_id = app.current_org_id());

create policy tenant_update_approved_resources on public.approved_resources
  for update
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

create policy tenant_all_ai_settings on public.organization_ai_settings
  for all
  using (organization_id = app.current_org_id())
  with check (organization_id = app.current_org_id());

-- audit_logs: readable and insertable within the org; append-only trigger
-- makes update/delete impossible regardless of policy.
create policy tenant_read_audit_logs on public.audit_logs
  for select using (organization_id = app.current_org_id());

create policy tenant_insert_audit_logs on public.audit_logs
  for insert with check (organization_id = app.current_org_id());

-- analytics_snapshots: staff read their own org's numbers; writes come only
-- from platform aggregation jobs (Phase 2), which run with elevated role.
create policy tenant_read_analytics on public.analytics_snapshots
  for select using (organization_id = app.current_org_id());
