-- 20260708090300_knowledge_and_resources.sql
-- RAG corpus + versioning + approved external resources
-- (BLUEPRINT 3.9, 3.10, 3.17). Additive-only; never edit after commit.

-- 3.9 knowledge_documents — per-tenant, typed corpus. Embedding is nullable:
-- rows are seedable before the embedding pipeline exists (Sprint 4); retrieval
-- skips null embeddings. Vector dim 1536 = text-embedding-3-small; the model
-- is recorded per row (DB-DECISIONS F8) so a provider change can never
-- silently mix incomparable vectors.
create table public.knowledge_documents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id),
  title            text not null,
  content          text not null,
  content_type     text not null check (content_type in
                     ('faq', 'exercise', 'policy', 'therapist_bio', 'pricing_note',
                      'video', 'pdf', 'blog_article', 'testimonial')),
  source_type      text not null default 'clinic_provided'
                   check (source_type in ('clinic_provided', 'approved_external_link')),
  language         text not null default 'en',  -- BCP-47 (DB-DECISIONS R1)
  embedding        vector(1536),
  embedding_model  text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  constraint knowledge_embedding_model_paired
    check ((embedding is null) = (embedding_model is null))
);

create index knowledge_documents_org_idx
  on public.knowledge_documents (organization_id);
-- HNSW over cosine distance; pgvector skips null vectors automatically.
create index knowledge_documents_embedding_idx
  on public.knowledge_documents using hnsw (embedding vector_cosine_ops);

create trigger knowledge_documents_updated_at
  before update on public.knowledge_documents
  for each row execute function app.set_updated_at();

-- 3.17 knowledge_document_versions — history is written by trigger, never by
-- application discipline (DB-DECISIONS R3). No update/delete path.
create table public.knowledge_document_versions (
  id                     uuid primary key default gen_random_uuid(),
  knowledge_document_id  uuid not null references public.knowledge_documents (id),
  organization_id        uuid not null references public.organizations (id),
  content                text not null,
  content_type           text not null,
  embedding              vector(1536),
  version_number         integer not null,
  edited_by              uuid references public.users (id),
  created_at             timestamptz not null default now(),
  unique (knowledge_document_id, version_number)
);

create index knowledge_document_versions_doc_idx
  on public.knowledge_document_versions (knowledge_document_id);
create index knowledge_document_versions_org_idx
  on public.knowledge_document_versions (organization_id);

create or replace function app.capture_knowledge_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only version content-bearing changes; embedding-only refreshes (same text,
  -- new vector) do not create a new version.
  if tg_op = 'UPDATE'
     and new.content = old.content
     and new.content_type = old.content_type then
    return new;
  end if;

  insert into public.knowledge_document_versions
    (knowledge_document_id, organization_id, content, content_type,
     embedding, version_number, edited_by)
  values
    (new.id, new.organization_id, new.content, new.content_type,
     new.embedding,
     coalesce((select max(version_number)
                 from public.knowledge_document_versions
                where knowledge_document_id = new.id), 0) + 1,
     nullif(current_setting('app.current_user_id', true), '')::uuid);
  return new;
end;
$$;

create trigger knowledge_documents_capture_version
  after insert or update on public.knowledge_documents
  for each row execute function app.capture_knowledge_version();

-- Versions are append-only, same guarantee as audit_logs (F7).
create trigger knowledge_document_versions_immutable
  before update or delete on public.knowledge_document_versions
  for each row execute function app.reject_mutation();

-- 3.10 approved_resources — the ONLY external content the AI may ever
-- reference (BLUEPRINT 5.1). organization_id NULL = platform-level default
-- available to every tenant; non-null = clinic-specific addition that ranks
-- above platform defaults for the same body_region/condition.
create table public.approved_resources (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations (id),  -- nullable by design
  title            text not null,
  url              text not null check (url ~ '^https://'),
  type             text not null check (type in ('video', 'article', 'pdf')),
  body_region      text not null check (body_region in
                     ('neck', 'shoulder', 'upper_back', 'lower_back', 'elbow',
                      'wrist_hand', 'hip', 'knee', 'ankle_foot', 'general')),
  condition        text,
  approved_by      uuid references public.users (id),  -- null only for platform seeds
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index approved_resources_region_idx
  on public.approved_resources (body_region, active);
create index approved_resources_org_idx
  on public.approved_resources (organization_id);
