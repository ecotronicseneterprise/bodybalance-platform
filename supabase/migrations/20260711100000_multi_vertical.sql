-- 20260711100000_multi_vertical.sql
-- BodyBalance is a multi-vertical clinic OS (founder ruling 2026-07-11), not
-- physiotherapy software. Two de-hardcoding changes. Additive-only; never
-- edit after this has been applied anywhere.

-- 1. ai_profile was CHECK-constrained to six physiotherapy-era presets,
--    contradicting BLUEPRINT 3.13c ("adding a profile is a data change, not a
--    migration"). Drop the constraint; validation moves to the domain layer
--    against the ai_profiles seed data, where new verticals (dental,
--    veterinary, ...) add profiles without schema changes.
alter table public.organization_ai_settings
  drop constraint if exists organization_ai_settings_ai_profile_check;

-- 2. Per-clinic terminology (SPRINT-2-PLAN rev 2, ruling 1): UI labels come
--    from configuration, never from table names. Empty object = platform
--    defaults ("Practitioners", "Patients"). 2B ships the editor + vertical
--    presets (Physiotherapy, Dental, General, Wellness, Veterinary, ...).
alter table public.clinic_settings
  add column if not exists terminology jsonb not null default '{}'::jsonb;

comment on column public.clinic_settings.terminology is
  'UI label overrides, e.g. {"practitioner_singular":"Physiotherapist","practitioner_plural":"Physiotherapists"}. Empty = vertical-neutral platform defaults.';
