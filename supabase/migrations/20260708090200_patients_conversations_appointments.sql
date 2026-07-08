-- 20260708090200_patients_conversations_appointments.sql
-- Patients, chat sessions/messages, appointments (BLUEPRINT 3.7, 3.8, 3.11, 3.12).
-- Additive-only; never edit after commit.

-- 3.7 patients — data minimization applies (BLUEPRINT 3.12 note, section 6):
-- no clinical free-text lives here. NDPR erasure = anonymize in place (F6).
create table public.patients (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  full_name        text,
  phone            text check (phone ~ '^\+[1-9][0-9]{6,14}$'),  -- E.164 (F12)
  email            text check (email = lower(email)),
  anonymized_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- a bookable patient needs at least one contact channel — unless anonymized
  constraint patients_contactable
    check (anonymized_at is not null or phone is not null or email is not null)
);

create index patients_organization_id_idx on public.patients (organization_id);

create trigger patients_updated_at
  before update on public.patients
  for each row execute function app.set_updated_at();

-- 3.11 chat_sessions — presenting_* fields feed the analytics layer (3.14)
-- so metrics never re-parse raw message text.
create table public.chat_sessions (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id),
  patient_id               uuid references public.patients (id),
  started_at               timestamptz not null default now(),
  ended_at                 timestamptz,
  outcome                  text check (outcome in
                             ('booked', 'escalated_emergency', 'abandoned', 'handed_to_human')),
  presenting_complaint     text,
  presenting_body_region   text check (presenting_body_region in
                             ('neck', 'shoulder', 'upper_back', 'lower_back', 'elbow',
                              'wrist_hand', 'hip', 'knee', 'ankle_foot', 'other'))
);

create index chat_sessions_org_started_idx
  on public.chat_sessions (organization_id, started_at);

-- 3.12 messages — organization_id deliberately denormalized so RLS never joins (F2).
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  chat_session_id  uuid not null references public.chat_sessions (id),
  organization_id  uuid not null references public.organizations (id),
  role             text not null check (role in ('patient', 'ai', 'system')),
  content          text not null,
  created_at       timestamptz not null default now()
);

create index messages_org_created_idx on public.messages (organization_id, created_at);
create index messages_session_idx on public.messages (chat_session_id);

-- 3.8 appointments.
-- DB default = pending_confirmation: no INSERT can create a confirmed
-- appointment without explicitly claiming it; the AI tool path never sets
-- status at all (BLUEPRINT 5.2 rule 3, DB-DECISIONS R7).
create table public.appointments (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations (id),
  patient_id             uuid not null references public.patients (id),
  therapist_id           uuid not null references public.therapists (id),
  service_id             uuid not null references public.services (id),
  chat_session_id        uuid references public.chat_sessions (id),
  scheduled_start        timestamptz not null,
  scheduled_end          timestamptz not null,
  status                 text not null default 'pending_confirmation'
                         check (status in ('pending_confirmation', 'confirmed', 'declined',
                                           'rescheduled', 'completed', 'cancelled', 'no_show')),
  source                 text not null default 'ai_chat'
                         check (source in ('ai_chat', 'manual')),
  qualification_summary  jsonb,  -- {pain_location, duration, severity_1_10, impact, red_flag_detected}
  notes                  text,   -- staff-facing only (BLUEPRINT 3.8)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  confirmed_at           timestamptz,
  constraint appointments_window_valid check (scheduled_start < scheduled_end),
  -- DB-level double-booking guard (DB-DECISIONS R2): even under concurrent
  -- requests, one therapist cannot hold two live bookings that overlap.
  constraint appointments_no_overlap exclude using gist (
    therapist_id with =,
    tstzrange(scheduled_start, scheduled_end) with &&
  ) where (status in ('pending_confirmation', 'confirmed'))
);

create index appointments_org_start_idx
  on public.appointments (organization_id, scheduled_start);
create index appointments_patient_idx on public.appointments (patient_id);
create index appointments_therapist_idx on public.appointments (therapist_id);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function app.set_updated_at();
