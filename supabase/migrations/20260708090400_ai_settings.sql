-- 20260708090400_ai_settings.sql
-- organization_ai_settings — Layer 2: Clinic Personality (BLUEPRINT 3.13).
-- NOTHING safety-related lives here. Layer 1 (platform_policy, BLUEPRINT
-- 3.13a) is versioned CODE, not a table — deliberately absent from this
-- database so no data-write path can ever touch it (DB-DECISIONS R5).
-- Additive-only; never edit after commit.

create table public.organization_ai_settings (
  organization_id       uuid primary key references public.organizations (id),
  assistant_name        text not null default 'BodyBalance AI',
  assistant_avatar_url  text,
  clinic_description    text,
  brand_voice           text,
  tone                  text not null default 'warm'
                        check (tone in ('warm', 'clinical', 'concise', 'formal', 'friendly')),
  verbosity             text not null default 'brief'
                        check (verbosity in ('brief', 'detailed')),
  supported_languages   text[] not null default array['en'],
  specialties           text[] not null default array[]::text[],
  -- valid values: sports, orthopaedics, neuro_rehab, womens_health,
  -- paediatric, corporate_ergonomics, general (validated in domain layer;
  -- kept out of a CHECK so adding a specialty is data, not a migration)
  booking_style         text not null default 'assessment_first'
                        check (booking_style in ('book_immediately', 'assessment_first', 'call_first')),
  booking_preferences   jsonb not null default '{}'::jsonb,
  follow_up_enabled     boolean not null default false,  -- Phase 3 feature, schema-ready (3.13)
  follow_up_days        integer check (follow_up_days between 1 and 90),
  welcome_message       text,   -- clinic-authored copy, never model-authored
  fallback_message      text,
  default_cta           text,
  -- BLUEPRINT 3.13: show_disclaimer "cannot be set to false" — enforced by
  -- CHECK, not convention. Field exists for future per-locale wording only.
  show_disclaimer       boolean not null default true check (show_disclaimer = true),
  ai_capabilities       jsonb not null default '{
    "patient_education": true,
    "booking": true,
    "exercise_library": true,
    "faq": true,
    "pain_assessment": true,
    "whatsapp_notifications": true,
    "video_recommendations": true,
    "blog_recommendations": true,
    "insurance": false,
    "payments": false,
    "telehealth": false,
    "prescription_upload": false,
    "voice_calls": false
  }'::jsonb,
  ai_profile            text check (ai_profile in
                          ('sports_performance', 'general_physiotherapy', 'neuro_rehab',
                           'paediatric', 'womens_health', 'corporate_ergonomics')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger organization_ai_settings_updated_at
  before update on public.organization_ai_settings
  for each row execute function app.set_updated_at();
