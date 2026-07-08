-- 20260708180000_onboard_organization.sql
-- Self-serve clinic onboarding (Task 5, founder decision 2026-07-08):
-- the FIRST registered user for a new organization becomes its owner, through
-- the same flow every future clinic will use. No manually pre-created owners.
-- Additive-only; never edit after this has been applied anywhere.
--
-- SECURITY DEFINER because a brand-new signed-up user has no users row yet,
-- so RLS (correctly) blocks every direct insert. This function is the single,
-- atomic, audited path from "verified auth user" to "clinic + owner".
-- Exposed via PostgREST RPC to authenticated users only.

set check_function_bodies = off;

create or replace function public.onboard_organization(
  p_clinic_name text,
  p_full_name   text,
  p_timezone    text default 'Africa/Lagos',
  p_city        text default null,
  p_country     char(2) default 'NG',
  p_whatsapp    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
  v_org   uuid;
  v_slug  text;
  v_base  text;
  v_n     int := 0;
begin
  if v_uid is null then
    raise exception 'onboarding requires an authenticated user';
  end if;
  if exists (select 1 from public.users where id = v_uid) then
    raise exception 'user is already linked to an organization';
  end if;
  if coalesce(trim(p_clinic_name), '') = '' or coalesce(trim(p_full_name), '') = '' then
    raise exception 'clinic name and owner name are required';
  end if;

  -- slug from clinic name; suffix on collision
  v_base := regexp_replace(lower(trim(p_clinic_name)), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  if v_base = '' or v_base !~ '^[a-z0-9]' then
    v_base := 'clinic-' || v_base;
  end if;
  v_slug := left(v_base, 60);
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := left(v_base, 55) || '-' || v_n::text;
  end loop;

  insert into public.organizations (slug, name, plan, billing_status)
  values (v_slug, trim(p_clinic_name), 'starter', 'pilot')
  returning id into v_org;

  -- sensible defaults; the clinic reviews/edits everything in the dashboard
  insert into public.clinic_settings
    (organization_id, timezone, city, country, whatsapp_number, opening_hours)
  values
    (v_org, p_timezone, p_city, p_country, p_whatsapp,
     '{"mon": [{"open": "09:00", "close": "17:00"}],
       "tue": [{"open": "09:00", "close": "17:00"}],
       "wed": [{"open": "09:00", "close": "17:00"}],
       "thu": [{"open": "09:00", "close": "17:00"}],
       "fri": [{"open": "09:00", "close": "17:00"}],
       "sat": [], "sun": []}'::jsonb);

  insert into public.organization_ai_settings (organization_id)
  values (v_org);

  insert into public.users (id, organization_id, role, full_name, email)
  values (v_uid, v_org, 'owner', trim(p_full_name), lower(v_email));

  insert into public.audit_logs
    (organization_id, actor_type, user_id, action, entity, entity_id, after)
  values
    (v_org, 'staff_user', v_uid, 'organization.onboarded', 'organizations', v_org,
     jsonb_build_object('name', trim(p_clinic_name), 'slug', v_slug));

  return jsonb_build_object('organization_id', v_org, 'slug', v_slug);
end;
$$;

revoke execute on function public.onboard_organization from public, anon;
grant execute on function public.onboard_organization to authenticated;
