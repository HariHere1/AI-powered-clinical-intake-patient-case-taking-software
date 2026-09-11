# MediKiosk Architecture

## Overview

MediKiosk is a Next.js (App Router) application that runs both the patient
kiosk UI, the doctor dashboard, and the hospital admin survey configurator,
backed by PostgreSQL and three self-hosted Python microservices (STT, TTS,
OCR). See the root `README.md` for setup instructions and
`prisma/schema.prisma` for the full data model.

## Actors

- **Patient** — walks up to the kiosk, authenticates with phone+name (OTP),
  picks a language, gives consent, has a voice/text conversation, uploads
  documents, and reviews/shares their generated report via revocable access
  keys.
- **Doctor** (`StaffUser.role = DOCTOR`) — logs in with email+password, sees
  only patients who currently have an active access key pointing at them,
  and can edit/confirm the AI-drafted report.
- **Admin** (`StaffUser.role = ADMIN`) — logs in with email+password,
  configures their hospital's survey template (the question set patients are
  asked).

## Request flow (patient)

1. `/` — phone + name → OTP → `patient_session` cookie.
2. `/language` — sets the `NEXT_LOCALE` cookie, which `src/i18n/request.ts`
   reads on every request to select the whole UI's language (not just
   survey text).
3. `/consent` — writes a `ConsentRecord`, then creates an `IntakeSession`
   against the hospital's currently active `SurveyTemplate`
   (`src/lib/hospital.ts`).
4. `/intake/[sessionId]` — drives the conversation loop:
   `POST /api/intake/[sessionId]/next-question` decides the next question
   (root question, or an LLM-generated follow-up via
   `src/lib/llm/provider.ts`), `POST /api/intake/[sessionId]/tts` speaks it
   (Indic Parler-TTS), and `POST /api/intake/[sessionId]/answer` accepts a
   typed answer or an audio recording (transcribed via faster-whisper).
5. `/documents/[sessionId]` — uploads prescriptions/bills/records; each is
   OCR'd synchronously (Tesseract) and stored with extracted text.
6. `POST /api/reports/generate` — summarizes the conversation + OCR'd
   documents into a structured `ReportVersion` via the LLM adapter.
7. `/report/[reportId]` — patient views the report and manages `AccessKey`s
   (create, activate, deactivate) that grant a specific doctor access.

## Request flow (doctor / admin)

- `/doctor/login` → `staff_session` cookie → `/doctor/dashboard`
  (`GET /api/doctor/patients`, scoped to active keys for that doctor).
- `/doctor/report/[reportId]` — edits the report; `PATCH /api/reports/[id]`
  requires an active `AccessKey` and creates a new `ReportVersion` (full
  edit history is preserved, nothing is overwritten).
- `/admin/login` → `/admin/surveys` — create/activate `SurveyTemplate`s per
  hospital; `/admin/surveys/[templateId]/edit` adds `SurveyQuestion`s
  (with per-question follow-up strategy: none, AI-adaptive, or SOCRATES).

## Authorization model (`src/lib/authz.ts`)

Every route re-derives identity from its session cookie and checks
ownership before touching data:

- Patients: own `IntakeSession` / `Document` / `Report` / `AccessKey` only.
- Doctors: a `Report` is only readable/editable while an `AccessKey` with
  `doctorId = self` and `isActive = true` exists for it — deactivating the
  key on the patient side immediately revokes doctor access.
- Admins: `SurveyTemplate`/`SurveyQuestion` mutations are scoped to their
  own `hospitalId`.

## Why these judgment calls

- **OTP is mocked** (`src/lib/otp/`, `MOCK_OTP` env var): no SMS provider
  was specified. The full generate/hash/expire/verify contract is real; only
  the delivery channel is stubbed (dev responses/logs instead of SMS).
- **OCR is Tesseract** (`python-services/ocr`): open-source, self-hostable,
  good enough for typed/printed documents; not handwriting-grade.
- **TTS GPU**: Indic Parler-TTS is much faster with a GPU. Postgres, STT,
  and OCR always run in Docker; TTS can either run in Docker with NVIDIA
  passthrough or natively on the host with CUDA — see
  `docker-compose.override.yml.example`. Both expose the identical REST
  contract, so the choice is purely a deployment detail.
- **LLM provider is pluggable** (`src/lib/llm/provider.ts`): implemented
  today against Groq's OpenAI-compatible API; swapping providers is a
  config change (`LLM_PROVIDER`, `GROQ_BASE_URL`, `GROQ_API_KEY`), not a
  code change.
