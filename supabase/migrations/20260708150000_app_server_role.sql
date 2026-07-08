-- 20260708150000_app_server_role.sql
-- Server-flow database role (Task 3, BLUEPRINT 2.1).
-- Additive-only; never edit after this has been applied anywhere.
--
-- Why: the `postgres` connection user OWNS the tables, and owners bypass RLS.
-- Server flows (patient site, AI tools, jobs) must run with RLS as a real
-- backstop, so they execute as `app_server`:
--   BEGIN;
--   select set_config('app.current_organization_id', $org, true);
--   SET LOCAL ROLE app_server;
--   ... queries (RLS enforced via app.current_org_id()) ...
--   COMMIT;   -- role + GUC reset automatically at transaction end
--
-- app_server deliberately has NO DELETE grant: hard deletes are impossible
-- through the server path (docs/DB-DECISIONS.md F6 — anonymize, never delete).

do $$
begin
  if not exists (select from pg_roles where rolname = 'app_server') then
    create role app_server nologin;
  end if;
end $$;

grant usage on schema public to app_server;
grant select, insert, update on all tables in schema public to app_server;
alter default privileges in schema public
  grant select, insert, update on tables to app_server;

grant usage on schema app to app_server;
grant execute on all functions in schema app to app_server;

-- allow the pooled `postgres` connection to switch into the restricted role
grant app_server to postgres;
