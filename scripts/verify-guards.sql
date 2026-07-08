-- verify-guards.sql — proves the database-level guarantees fire (Task 2
-- verification). Run via scripts/db-run.mjs. Uses the demo org only; test
-- rows that can be removed are removed at the end.

create temp table _results (test text, outcome text);

-- 1. audit_logs is append-only (DB-DECISIONS F7)
insert into public.audit_logs (organization_id, actor_type, action, entity)
values ('00000000-0000-4000-a000-000000000002', 'platform_admin', 'test.append_only', 'test');

do $$
begin
  update public.audit_logs set action = 'tampered' where action = 'test.append_only';
  insert into _results values ('audit append-only', 'FAIL: update was allowed');
exception when others then
  insert into _results values ('audit append-only', 'OK — blocked: ' || sqlerrm);
end $$;

-- 2. show_disclaimer cannot be set false (BLUEPRINT 3.13)
do $$
begin
  update public.organization_ai_settings set show_disclaimer = false
  where organization_id = '00000000-0000-4000-a000-000000000002';
  insert into _results values ('disclaimer lock', 'FAIL: set to false');
exception when others then
  insert into _results values ('disclaimer lock', 'OK — blocked: ' || sqlerrm);
end $$;

-- 3. knowledge versioning is automatic (DB-DECISIONS R3)
insert into public.knowledge_documents (id, organization_id, title, content, content_type)
values ('00000000-0000-4000-e000-000000000001',
        '00000000-0000-4000-a000-000000000002',
        'TEST — versioning check', 'version one content', 'faq')
on conflict (id) do nothing;

update public.knowledge_documents
set content = 'version two content'
where id = '00000000-0000-4000-e000-000000000001';

insert into _results
select 'auto-versioning',
       case when count(*) = 2 then 'OK — 2 versions captured by trigger'
            else 'FAIL — expected 2 versions, got ' || count(*) end
from public.knowledge_document_versions
where knowledge_document_id = '00000000-0000-4000-e000-000000000001';

-- 4. double-booking exclusion (DB-DECISIONS R2)
insert into public.patients (id, organization_id, full_name, phone)
values ('00000000-0000-4000-f000-000000000001',
        '00000000-0000-4000-a000-000000000002', 'TEST Patient', '+2340000000001')
on conflict (id) do nothing;

insert into public.appointments
  (id, organization_id, patient_id, therapist_id, service_id,
   scheduled_start, scheduled_end)
values ('00000000-0000-4000-f000-000000000002',
        '00000000-0000-4000-a000-000000000002',
        '00000000-0000-4000-f000-000000000001',
        '00000000-0000-4000-b000-000000000002',
        '00000000-0000-4000-c000-000000000003',
        '2026-08-03 10:00+01', '2026-08-03 11:00+01')
on conflict (id) do nothing;

do $$
begin
  insert into public.appointments
    (organization_id, patient_id, therapist_id, service_id,
     scheduled_start, scheduled_end)
  values ('00000000-0000-4000-a000-000000000002',
          '00000000-0000-4000-f000-000000000001',
          '00000000-0000-4000-b000-000000000002',
          '00000000-0000-4000-c000-000000000003',
          '2026-08-03 10:30+01', '2026-08-03 11:30+01');
  insert into _results values ('double-booking guard', 'FAIL: overlap accepted');
exception when exclusion_violation then
  insert into _results values ('double-booking guard', 'OK — overlap rejected by exclusion constraint');
when others then
  insert into _results values ('double-booking guard', 'UNEXPECTED: ' || sqlerrm);
end $$;

-- 5. RLS: anonymous role sees marketing data but never patients/messages
do $$
declare v_services int; v_patients int;
begin
  set local role anon;
  select count(*) into v_services from public.services;
  select count(*) into v_patients from public.patients;
  reset role;
  insert into _results values ('RLS anon boundary',
    case when v_services > 0 and v_patients = 0
         then 'OK — anon sees ' || v_services || ' services, 0 patients'
         else 'FAIL — services ' || v_services || ', patients ' || v_patients end);
exception when others then
  reset role;
  insert into _results values ('RLS anon boundary', 'UNEXPECTED: ' || sqlerrm);
end $$;

-- cleanup removable test rows (audit + versions are append-only by design and
-- stay; knowledge doc is FK-referenced by its versions and stays, inactive)
delete from public.appointments where id = '00000000-0000-4000-f000-000000000002';
delete from public.patients     where id = '00000000-0000-4000-f000-000000000001';
update public.knowledge_documents set active = false, deleted_at = now()
  where id = '00000000-0000-4000-e000-000000000001';

select * from _results;
