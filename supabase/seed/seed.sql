-- seed.sql — BodyBalance Platform seed data (BLUEPRINT 4.1 supabase/seed).
-- Idempotent (safe to re-run) and uses FIXED UUIDs so every environment has
-- identical identifiers (docs/DB-DECISIONS.md R6).
--
-- Runs as postgres (bypasses RLS) via the Supabase SQL editor or `psql -f`.
--
-- Fixed identifiers:
--   Cherry org        00000000-0000-4000-a000-000000000001  (slug: bodybalance)
--   Demo org          00000000-0000-4000-a000-000000000002  (slug: demo-clinic)
--   Cherry therapist  00000000-0000-4000-b000-000000000001
--   Demo therapist    00000000-0000-4000-b000-000000000002
--   Cherry services   00000000-0000-4000-c000-00000000000{1,2}
--   Demo service      00000000-0000-4000-c000-000000000003
--
-- NOT seeded here (by design):
--   * users — staff accounts require auth.users rows; created via Supabase
--     Auth in Task 3, then linked (therapists.user_id updated by admin).
--   * knowledge_documents content — migrated from data/knowledge_base.jsonl
--     in Sprint 4 together with the embedding pipeline (needs the LLM key).

-- ============================================================ organizations
insert into public.organizations (id, slug, name, plan, billing_status)
values
  ('00000000-0000-4000-a000-000000000001', 'bodybalance',
   'BodyBalance Physiotherapy Clinic', 'starter', 'pilot'),
  ('00000000-0000-4000-a000-000000000002', 'demo-clinic',
   'Demo Clinic (Development Only)', 'starter', 'pilot')
on conflict (id) do nothing;

-- ========================================================== clinic_settings
-- Values below come from the current live Streamlit app (repo audit).
-- Cherry can adjust everything in the admin dashboard (Sprint 2).
insert into public.clinic_settings
  (organization_id, brand_color_primary, brand_color_secondary,
   whatsapp_number, emergency_contact_number, opening_hours,
   address, city, country, timezone,
   booking_lead_time_minutes, booking_horizon_days)
values
  ('00000000-0000-4000-a000-000000000001',
   '#1B5E20', '#66BB6A',
   '+2348136293596', '112',  -- 112 = Nigeria national emergency number
   '{"mon": [{"open": "08:00", "close": "18:00"}],
     "tue": [{"open": "08:00", "close": "18:00"}],
     "wed": [{"open": "08:00", "close": "18:00"}],
     "thu": [{"open": "08:00", "close": "18:00"}],
     "fri": [{"open": "08:00", "close": "18:00"}],
     "sat": [{"open": "09:00", "close": "14:00"}],
     "sun": []}'::jsonb,
   null, 'Lagos', 'NG', 'Africa/Lagos',
   60, 30),
  ('00000000-0000-4000-a000-000000000002',
   '#0D47A1', '#42A5F5',
   '+2340000000000', '112',
   '{"mon": [{"open": "09:00", "close": "17:00"}],
     "tue": [{"open": "09:00", "close": "17:00"}],
     "wed": [{"open": "09:00", "close": "17:00"}],
     "thu": [{"open": "09:00", "close": "17:00"}],
     "fri": [{"open": "09:00", "close": "17:00"}],
     "sat": [], "sun": []}'::jsonb,
   null, 'Lagos', 'NG', 'Africa/Lagos',
   60, 30)
on conflict (organization_id) do nothing;

-- =============================================================== therapists
insert into public.therapists
  (id, organization_id, display_name, credentials, bio, active)
values
  ('00000000-0000-4000-b000-000000000001',
   '00000000-0000-4000-a000-000000000001',
   'Cherry Nwanna', 'BMR.PT',
   'Licensed physiotherapist providing 360-degree wellness care in Lagos.',
   true),
  ('00000000-0000-4000-b000-000000000002',
   '00000000-0000-4000-a000-000000000002',
   'Demo Therapist', 'PT',
   'Development-only therapist record.',
   true)
on conflict (id) do nothing;

-- ================================================================= services
-- Prices from the live app: ₦150,000 in-person / ₦50,000 virtual, stored as
-- integer kobo (DB-DECISIONS F4). Durations are sensible defaults for Cherry
-- to adjust in the admin dashboard.
insert into public.services
  (id, organization_id, name, description, duration_minutes,
   price_amount_minor, price_currency, active)
values
  ('00000000-0000-4000-c000-000000000001',
   '00000000-0000-4000-a000-000000000001',
   'Initial Assessment (In-Person)',
   'Comprehensive first appointment: history, physical assessment, and a personalised treatment plan.',
   60, 15000000, 'NGN', true),
  ('00000000-0000-4000-c000-000000000002',
   '00000000-0000-4000-a000-000000000001',
   'Virtual Consultation',
   'Video consultation with a licensed physiotherapist: assessment guidance and next steps.',
   45, 5000000, 'NGN', true),
  ('00000000-0000-4000-c000-000000000003',
   '00000000-0000-4000-a000-000000000002',
   'Demo Initial Assessment',
   'Development-only service.',
   60, 10000000, 'NGN', true)
on conflict (id) do nothing;

-- ==================================================== therapist_availability
-- Cherry: Mon–Fri 08:00–18:00, Sat 09:00–14:00 (clinic-local, Africa/Lagos —
-- DB-DECISIONS F11). day_of_week: 0 = Sunday.
insert into public.therapist_availability
  (organization_id, therapist_id, day_of_week, start_time, end_time)
select
  '00000000-0000-4000-a000-000000000001',
  '00000000-0000-4000-b000-000000000001',
  dow, start_t, end_t
from (values
  (1, time '08:00', time '18:00'),
  (2, time '08:00', time '18:00'),
  (3, time '08:00', time '18:00'),
  (4, time '08:00', time '18:00'),
  (5, time '08:00', time '18:00'),
  (6, time '09:00', time '14:00')
) as v(dow, start_t, end_t)
where not exists (
  select 1 from public.therapist_availability
  where therapist_id = '00000000-0000-4000-b000-000000000001'
);

insert into public.therapist_availability
  (organization_id, therapist_id, day_of_week, start_time, end_time)
select
  '00000000-0000-4000-a000-000000000002',
  '00000000-0000-4000-b000-000000000002',
  dow, time '09:00', time '17:00'
from generate_series(1, 5) as dow
where not exists (
  select 1 from public.therapist_availability
  where therapist_id = '00000000-0000-4000-b000-000000000002'
);

-- ================================================= organization_ai_settings
insert into public.organization_ai_settings
  (organization_id, assistant_name, clinic_description, tone, verbosity,
   specialties, booking_style, welcome_message, fallback_message, default_cta,
   ai_profile)
values
  ('00000000-0000-4000-a000-000000000001',
   'BodyBalance AI',
   'BodyBalance Physiotherapy Clinic offers 360-degree wellness care in Lagos, led by Cherry Nwanna (BMR.PT).',
   'warm', 'brief',
   array['general', 'orthopaedics'],
   'assessment_first',
   'Hello! I''m BodyBalance AI. Before we begin — where are you feeling pain?',
   'That''s a great question for a licensed physiotherapist. I can help you book an appointment with Cherry to discuss it properly.',
   'Book your assessment with Cherry',
   'general_physiotherapy'),
  ('00000000-0000-4000-a000-000000000002',
   'Demo Assistant',
   'Development-only clinic.',
   'clinical', 'brief',
   array['general'],
   'book_immediately',
   'Hello! This is the demo clinic assistant.',
   'I don''t have that information. Please book an appointment.',
   'Book a demo appointment',
   'general_physiotherapy')
on conflict (organization_id) do nothing;

-- ==================================================== approved_resources
-- Platform-level defaults (organization_id NULL — readable by every tenant,
-- BLUEPRINT 3.10/3.18). Channel/organisation home pages only: stable URLs,
-- individually approved. approved_by is null for platform seeds.
insert into public.approved_resources
  (id, organization_id, title, url, type, body_region, active)
values
  ('00000000-0000-4000-d000-000000000001', null,
   'NHS — Back pain overview',
   'https://www.nhs.uk/conditions/back-pain/', 'article', 'lower_back', true),
  ('00000000-0000-4000-d000-000000000002', null,
   'NHS — Neck pain overview',
   'https://www.nhs.uk/conditions/neck-pain-and-stiff-neck/', 'article', 'neck', true),
  ('00000000-0000-4000-d000-000000000003', null,
   'Physiotutors (YouTube channel)',
   'https://www.youtube.com/@Physiotutors', 'video', 'general', true),
  ('00000000-0000-4000-d000-000000000004', null,
   'Bob & Brad (YouTube channel)',
   'https://www.youtube.com/@BobandBrad', 'video', 'general', true)
on conflict (id) do nothing;
