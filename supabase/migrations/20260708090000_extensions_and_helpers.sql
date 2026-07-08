-- 20260708090000_extensions_and_helpers.sql
-- BodyBalance Platform — BLUEPRINT.md v1.0, Sprint 1 Task 2.
-- RULE: migrations are additive-only. Never edit this file after commit.

-- pgvector for knowledge embeddings (BLUEPRINT 3.9); btree_gist for the
-- appointments double-booking exclusion constraint (docs/DB-DECISIONS.md R2).
create extension if not exists vector;
create extension if not exists btree_gist;

-- Internal helper schema. Everything Supabase-specific is isolated here
-- (docs/DB-DECISIONS.md F9) so the SQL stays portable Postgres elsewhere.
create schema if not exists app;

-- Tenant resolution — THE single point every RLS policy goes through.
--   1. Server flows (patient site, AI, jobs): set_config('app.current_organization_id', ...)
--      per transaction; works with any non-BYPASSRLS role on any Postgres.
--   2. Staff dashboard: falls back to the caller's users row via auth.uid()
--      (the one Supabase-specific call on the platform).
-- SECURITY DEFINER so the users lookup does not recurse into users RLS.
create or replace function app.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(current_setting('app.current_organization_id', true), '')::uuid,
    (select organization_id from public.users where id = auth.uid())
  );
$$;

-- Standard updated_at maintenance.
create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Append-only guard for audit_logs (docs/DB-DECISIONS.md F7).
create or replace function app.reject_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only: % not permitted', tg_table_name, tg_op;
end;
$$;
