-- 20260708090100_core_tenancy.sql
-- Tenancy root + clinic configuration + staff + therapists + services +
-- availability (BLUEPRINT 3.1–3.6, 3.13). Additive-only; never edit after commit.

-- 3.1 organizations — the clinic/tenant. Root of all isolation.
create table public.organizations (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique
                  check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name            text not null,
  plan            text check (plan in ('starter', 'professional', 'enterprise')),
  billing_status  text check (billing_status in ('pilot', 'active', 'past_due', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function app.set_updated_at();

-- 3.2 clinic_settings — 1:1 with organizations; PK = organization_id (R4).
create table public.clinic_settings (
  organization_id            uuid primary key references public.organizations (id),
  logo_url                   text,
  brand_color_primary        text check (brand_color_primary ~ '^#[0-9a-fA-F]{6}$'),
  brand_color_secondary      text check (brand_color_secondary ~ '^#[0-9a-fA-F]{6}$'),
  whatsapp_number            text check (whatsapp_number ~ '^\+[1-9][0-9]{6,14}$'),
  emergency_contact_number   text,
  opening_hours              jsonb not null default '{}'::jsonb,
  address                    text,
  city                       text,
  country                    char(2) check (country ~ '^[A-Z]{2}$'), -- ISO 3166-1 alpha-2
  timezone                   text not null default 'Africa/Lagos',   -- IANA name (F3/F11)
  booking_lead_time_minutes  integer not null default 60  check (booking_lead_time_minutes >= 0),
  booking_horizon_days       integer not null default 30  check (booking_horizon_days between 1 and 365),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create trigger clinic_settings_updated_at
  before update on public.clinic_settings
  for each row execute function app.set_updated_at();

-- 3.3 users — staff accounts. id matches Supabase Auth user id (BLUEPRINT 3.3).
-- FK to auth.users is the one accepted Supabase coupling outside app.current_org_id();
-- dropping it is a one-line migration if the platform ever moves.
create table public.users (
  id               uuid primary key references auth.users (id),
  organization_id  uuid not null references public.organizations (id),
  role             text not null check (role in ('owner', 'therapist', 'receptionist', 'admin')),
  full_name        text not null,
  email            text not null check (email = lower(email)),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index users_organization_id_idx on public.users (organization_id);

create trigger users_updated_at
  before update on public.users
  for each row execute function app.set_updated_at();

-- 3.4 therapists
create table public.therapists (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  user_id          uuid references public.users (id),
  display_name     text not null,
  credentials      text,
  bio              text,
  photo_url        text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index therapists_organization_id_idx on public.therapists (organization_id);

create trigger therapists_updated_at
  before update on public.therapists
  for each row execute function app.set_updated_at();

-- 3.5 services — the ONLY legitimate source of prices the AI may ever state
-- (BLUEPRINT 3.5, 5.2 rule 4). Money = integer minor units + ISO 4217 (F4).
create table public.services (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id),
  name                text not null,
  description         text,
  duration_minutes    integer not null check (duration_minutes between 5 and 480),
  price_amount_minor  integer not null check (price_amount_minor >= 0),
  price_currency      char(3) not null check (price_currency ~ '^[A-Z]{3}$'),
  active              boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index services_organization_id_idx on public.services (organization_id);

create trigger services_updated_at
  before update on public.services
  for each row execute function app.set_updated_at();

-- 3.6 therapist_availability — weekly recurring window OR date-specific
-- window/block; exactly one of day_of_week / specific_date (DB-DECISIONS §Open).
-- start/end times are CLINIC-LOCAL, interpreted via clinic_settings.timezone (F11).
create table public.therapist_availability (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  therapist_id     uuid not null references public.therapists (id),
  day_of_week      smallint check (day_of_week between 0 and 6), -- 0 = Sunday
  specific_date    date,
  start_time       time not null,
  end_time         time not null,
  is_blocked       boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint availability_recurrence_xor
    check ((day_of_week is null) <> (specific_date is null)),
  constraint availability_window_valid
    check (start_time < end_time)
);

create index therapist_availability_org_therapist_idx
  on public.therapist_availability (organization_id, therapist_id);
