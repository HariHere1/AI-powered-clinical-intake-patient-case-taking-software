-- ============================================================================
-- MediKiosk — Supabase (PostgreSQL) Schema
-- SIH26047 — AI-powered clinical history kiosk
--
-- Maps to the system architecture:
--   Patient Kiosk (React) -> Backend (Express) -> External Services
--   Screens: EntryScreen, LanguageSelect, ConsentScreen, ConverseScreen,
--            DocumentScan, SummaryScreen
--   AppContext state: screen, language, responses[], emergencyFlag,
--            consentGiven, hcMode/largeText
--   Module D (planned): ABHA-based auth, granular revocable consent,
--            session data cleared after submission, audio-guided consent
--
-- Run this in the Supabase SQL editor, or via:
--   supabase db execute -f medikiosk_supabase_schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
create type entry_type as enum ('abha', 'aadhaar', 'walk_in');
create type session_status as enum ('in_progress', 'awaiting_review', 'submitted', 'abandoned');
create type screen_name as enum (
  'entry', 'language_select', 'consent', 'converse', 'document_scan', 'summary'
);
create type consent_method as enum ('ui_tap', 'audio_guided');
create type document_type as enum ('prescription', 'lab_report', 'other');
create type ocr_status as enum ('pending', 'processing', 'completed', 'failed', 'not_applicable');
create type abdm_push_status as enum ('not_started', 'pending', 'success', 'failed');

-- ---------------------------------------------------------------------------
-- patients
-- EntryScreen: ABHA/Aadhaar or walk-in. IDs stored hashed, never raw.
-- ---------------------------------------------------------------------------
create table public.patients (
  id                uuid primary key default gen_random_uuid(),
  entry_type        entry_type not null,
  abha_id_hash      text,                 -- sha256 of ABHA number, if entry_type = 'abha'
  aadhaar_ref_hash  text,                 -- sha256 of Aadhaar ref, if entry_type = 'aadhaar'
  display_name      text,                 -- optional, walk-in patients may skip this
  created_at        timestamptz not null default now()
);

comment on table public.patients is 'One row per unique patient identity captured at EntryScreen. Raw ABHA/Aadhaar numbers are never stored, only salted hashes.';

-- ---------------------------------------------------------------------------
-- kiosk_sessions
-- Mirrors the React AppContext state for a single kiosk visit.
-- ---------------------------------------------------------------------------
create table public.kiosk_sessions (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid references public.patients(id) on delete set null,
  language_code     text not null default 'en',      -- one of the 12 supported Indian languages
  current_screen    screen_name not null default 'entry',
  status            session_status not null default 'in_progress',
  emergency_flag    boolean not null default false,   -- set by red-flag detection (Module A, planned)
  consent_given     boolean not null default false,
  hc_mode           boolean not null default false,    -- high-contrast mode
  large_text        boolean not null default false,
  kiosk_device_id   text,                               -- physical kiosk identifier, if tracked
  started_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  submitted_at      timestamptz
);

comment on table public.kiosk_sessions is 'One row per kiosk visit; mirrors AppContext (screen, language, emergencyFlag, consentGiven, hcMode/largeText).';

create index idx_kiosk_sessions_patient_id on public.kiosk_sessions(patient_id);
create index idx_kiosk_sessions_status on public.kiosk_sessions(status);

-- ---------------------------------------------------------------------------
-- consents
-- Module D (planned): granular, revocable, DPDP 2023-aligned consent ledger.
-- ---------------------------------------------------------------------------
create table public.consents (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.kiosk_sessions(id) on delete cascade,
  patient_id        uuid references public.patients(id) on delete set null,
  consent_text      text not null,          -- exact text/version shown to the patient
  consent_version   text not null default 'v1',
  method            consent_method not null default 'ui_tap',
  granted_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  revocation_reason text
);

comment on table public.consents is 'DPDP 2023 consent ledger. Today the kiosk only sets consentGiven in AppContext; this table is where server-side persistence would land once Module D is built.';

create index idx_consents_session_id on public.consents(session_id);

-- ---------------------------------------------------------------------------
-- conversation_responses
-- ConverseScreen Q&A. Also the landing spot for planned ASR (Module A)
-- adaptive interview / SOCRATES probing / red-flag detection.
-- ---------------------------------------------------------------------------
create table public.conversation_responses (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.kiosk_sessions(id) on delete cascade,
  sequence_no        integer not null,
  question_code      text,                  -- e.g. SOCRATES probe id, once Module A exists
  question_text      text not null,
  response_text      text,                  -- transcribed / typed answer
  response_audio_url text,                  -- raw audio, if ASR pipeline stores it
  language_code      text,
  is_red_flag        boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (session_id, sequence_no)
);

comment on table public.conversation_responses is 'Q&A turns captured on ConverseScreen; is_red_flag is set by planned Module A red-flag detection.';

create index idx_conversation_responses_session_id on public.conversation_responses(session_id);

-- ---------------------------------------------------------------------------
-- documents
-- DocumentScan screen (upload UI implemented; OCR pipeline planned - Module B)
-- ---------------------------------------------------------------------------
create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.kiosk_sessions(id) on delete cascade,
  doc_type            document_type not null default 'other',
  storage_path        text not null,        -- Supabase Storage object path
  ocr_status          ocr_status not null default 'not_applicable',
  ocr_extracted_text  jsonb,                -- structured entities/timeline once Module B exists
  uploaded_at         timestamptz not null default now(),
  processed_at        timestamptz
);

comment on table public.documents is 'Uploaded prescription/lab files from DocumentScan. ocr_extracted_text is populated once /api/ocr (Module B) is built.';

create index idx_documents_session_id on public.documents(session_id);

-- ---------------------------------------------------------------------------
-- summaries
-- SummaryScreen (review + bilingual TTS today). Structured generator is
-- planned Module C (/api/summarize).
-- ---------------------------------------------------------------------------
create table public.summaries (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.kiosk_sessions(id) on delete cascade,
  summary_text          text not null,
  summary_language      text not null default 'en',
  is_physician_edited    boolean not null default false,
  physician_edited_text  text,
  generated_at           timestamptz not null default now(),
  reviewed_at            timestamptz
);

comment on table public.summaries is 'Clinical history summary shown on SummaryScreen; physician_edited_text captures edits once Module C exists.';

create index idx_summaries_session_id on public.summaries(session_id);

-- ---------------------------------------------------------------------------
-- tts_cache
-- Mirrors server/bhashiniClient.js: caches ULCA pipeline config, ~1hr TTL.
-- ---------------------------------------------------------------------------
create table public.tts_cache (
  id             uuid primary key default gen_random_uuid(),
  text_hash      text not null,             -- sha256(text + language_code)
  language_code  text not null,
  audio_url      text,                      -- cached audio location, if stored
  pipeline_config jsonb,                    -- cached ULCA pipeline response
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null default (now() + interval '1 hour'),
  unique (text_hash, language_code)
);

comment on table public.tts_cache is 'Cache for POST /api/tts (Bhashini ULCA). Mirrors the 1-hour TTL cache in server/bhashiniClient.js.';

create index idx_tts_cache_expires_at on public.tts_cache(expires_at);

-- ---------------------------------------------------------------------------
-- abdm_links
-- Module D (planned): push consented summary to ABDM / HIS / EMR via FHIR.
-- ---------------------------------------------------------------------------
create table public.abdm_links (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.kiosk_sessions(id) on delete cascade,
  abha_id_hash  text,
  push_status   abdm_push_status not null default 'not_started',
  fhir_bundle   jsonb,               -- outgoing FHIR bundle payload
  response_body jsonb,               -- HIS/EMR response, for debugging
  pushed_at     timestamptz
);

comment on table public.abdm_links is 'Tracks the planned /api/abdm push of consented data to ABDM/HIS via FHIR. Empty/unused until Module D is built.';

create index idx_abdm_links_session_id on public.abdm_links(session_id);

-- ---------------------------------------------------------------------------
-- audit_log
-- Generic event trail across the flow — useful for the DPDP requirement
-- that "session data [is] cleared after submission".
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.kiosk_sessions(id) on delete set null,
  event_type  text not null,        -- e.g. 'consent_granted', 'session_submitted', 'session_purged'
  event_data  jsonb,
  created_at  timestamptz not null default now()
);

create index idx_audit_log_session_id on public.audit_log(session_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for kiosk_sessions
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_kiosk_sessions_updated_at
before update on public.kiosk_sessions
for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- Kiosk sessions hold sensitive health data (DPDP 2023). Lock everything
-- down by default; only the service role (used by the Express backend)
-- can read/write. Adjust policies if patients ever get direct client access.
-- ============================================================================
alter table public.patients               enable row level security;
alter table public.kiosk_sessions          enable row level security;
alter table public.consents                enable row level security;
alter table public.conversation_responses  enable row level security;
alter table public.documents               enable row level security;
alter table public.summaries               enable row level security;
alter table public.tts_cache               enable row level security;
alter table public.abdm_links              enable row level security;
alter table public.audit_log               enable row level security;

-- service_role bypasses RLS by default in Supabase, so no explicit policy
-- is required for the backend. The policies below simply make sure the
-- 'anon' and 'authenticated' roles have no access unless you add one.
-- (No policies created = default deny for those roles.)

-- ============================================================================
-- End of schema
-- ============================================================================
