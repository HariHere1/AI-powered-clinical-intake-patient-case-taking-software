# MediKiosk

**Multilingual clinical history intake kiosk for Indian hospital OPDs**

Built for Smart India Hackathon (SIH26047) — targeting AYUSH and government health facility OPDs, where patients often face language barriers, low digital literacy, and long wait times before seeing a doctor.

MediKiosk lets a patient enter a kiosk flow, select their preferred language, give consent, and complete a structured clinical history by tapping options. The current prototype compiles the collected responses into an in-memory summary for review.

---

## Problem Statement

Government OPDs process large patient volumes with limited staff time per consultation. Patients frequently:
- Speak regional languages the front desk may not support well in written form
- Struggle with digital literacy for typed intake forms
- Repeat their history verbally to multiple staff before reaching a doctor

MediKiosk addresses this with a kiosk-based, multilingual intake flow designed to reduce repetitive data collection before consultation. The current integration scope is limited to Groq for adaptive questioning and Supabase for authentication and persistence.

---

## Key Features

- **Multilingual support** — 12 Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, Kannada, Malayalam, Gujarati, Odia, Urdu, English)
- **Structured intake flow** — entry, language selection, consent, interview, document scan, and summary screens
- **AI-driven adaptive questioning** — Groq generates the next clinically relevant question from the patient's conversation history
- **Tap-based interview input** — the current interview flow records responses selected through the kiosk UI
- **Emergency flagging** — clinical data includes an emergency flag for urgent symptoms detected by the intake flow
- **Document scan screen** — a dedicated step for the document-capture workflow
- **Physician-ready summary** — review screen for the collected language, consent, responses, and emergency status
- **Accessibility** — large-text and high-contrast toggles are managed globally through React Context
- **Staff path** — separate staff login screen in the kiosk flow

---

## Architecture

```
medikiosk/
├── src/                         # React + TypeScript kiosk UI
│   ├── components/              # Shared accessibility and navigation controls
│   ├── context/AppContext.tsx   # Screen routing, clinical data, accessibility state
│   ├── hooks/useTTS.ts          # React hook for speech playback
│   ├── screens/                 # Entry, consent, interview, scan, and summary views
│   ├── services/                 # Groq and Supabase API clients
│   ├── App.tsx                  # Kiosk shell and workflow step indicator
│   └── index.css                # Tailwind/theme styles
├── server/
│   ├── routes/                   # Interview and authentication routes
│   └── lib/                      # Server-side Supabase client
├── index.html
├── package.json                 # pnpm scripts and dependencies
├── pnpm-lock.yaml
├── .env.example                 # Groq, Supabase, and local port configuration
├── medikiosk_supabase_schema.sql # Supabase schema for planned persistence
├── tsconfig.json
└── vite.config.ts               # Vite config and /api proxy to port 8787
```

The current repository is one Node/React project. The Express service is kept in `server/` so Groq and Supabase service credentials remain server-side; the Vite development server proxies `/api` requests to it. Bhashini, STT, OCR, and other external APIs are out of scope for now.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Package manager | pnpm |
| Adaptive questioning | Groq API (`llama-3.3-70b-versatile`) |
| Authentication and persistence | Supabase Auth and PostgreSQL |
| API service | Node.js, Express, CORS, dotenv |
| State management | React Context API (no external state library) |
| Data model | Supabase PostgreSQL schema (`medikiosk_supabase_schema.sql`), persistence not wired yet |

---

## Core Flow

```
Entry → Language Select → Consent → Converse → Document Scan → Summary
```

1. **Entry** — Patient enters the kiosk flow, or chooses the separate staff login path.
2. **Language Select** — Patient picks their preferred language; all subsequent screens localize accordingly.
3. **Consent** — Patient is informed how their data is used, with audio playback and a clear decline path (falls back to paper-based intake by staff).
4. **Converse** — The interview service sends the current section and conversation history to Groq and records the returned question and patient response.
5. **Document Scan** — Dedicated screen for the optional document-capture step; persistence/OCR integration is not implemented yet.
6. **Summary** — Displays the data held in `AppContext` for review before the flow is completed.

---

## Setup

### Prerequisites
- Node.js 18+
- pnpm (`npm install --global pnpm` or via Corepack)
- Groq API key ([console.groq.com](https://console.groq.com))
- Supabase project with Auth and PostgreSQL enabled ([supabase.com](https://supabase.com))

### Install

```powershell
cd medikiosk
pnpm install
```

Create `.env` from `.env.example` and add the Groq and Supabase credentials.

### Environment variables

The backend reads these values from `medikiosk/.env`:

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes | Server-side Groq API key |
  `GROQ_API_KEY2` | Yes | Server-side Groq API key for language |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Client-side auth | Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side persistence | Supabase service-role key; never expose to the browser |
| `API_PORT` | No | Express API port; defaults to `8787` |
| `PORT` | No | Vite frontend port; defaults to `8443` |

Do not commit `.env` or expose Groq or Supabase service-role credentials in frontend code. The browser calls relative `/api` routes; Vite proxies those requests to the Express service during development.

### Run

In one terminal, run the frontend and API together:

```powershell
pnpm run dev:all
```

Or run them separately with `pnpm run dev` and `pnpm run server`. The frontend is available at `http://localhost:8443` and the TTS API at `http://localhost:8787`.

---

## API Endpoints (Backend)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/interview/next` | POST | Generate the next adaptive question through Groq |
| `/api/auth/send-otp` | POST | Send a patient OTP through Supabase Auth |
| `/api/auth/verify-otp` | POST | Verify a patient OTP through Supabase Auth |

### Supabase SQL schema

The repository includes [`medikiosk_supabase_schema.sql`](medikiosk/medikiosk_supabase_schema.sql) as the database foundation for the next backend phase. It creates:

- `patients` and `kiosk_sessions` for patient visits and workflow state
- `consents`, `conversation_responses`, `documents`, and `summaries` for intake data
- `tts_cache` for future server-side TTS caching
- `abdm_links` and `audit_log` for planned ABDM export and compliance events

Apply it to a Supabase project through the SQL Editor, or with the Supabase CLI from the repository root:

```powershell
supabase db execute -f medikiosk_supabase_schema.sql
```

The schema enables Row Level Security and creates no public policies by default. The current frontend and Express server do not yet connect to Supabase, so applying this schema alone does not persist kiosk state. Add a server-side Supabase client and authenticated service-role routes before enabling production persistence; never place a service-role key in frontend environment variables.

---

## Known Limitations (Hackathon Scope)

- Bhashini, STT, OCR, and other external APIs are intentionally deferred. Groq and Supabase are the only external APIs in the current integration scope.
- Groq-generated questions are not clinically certified and require clinical validation and guardrails before production use.
- Clinical data currently lives in React state and is lost when the page is refreshed; production use requires secure persistence and access controls.
- Emergency status in the prototype is not a substitute for clinical triage.

---

## Team

- **Adaptive interview module** — Groq question generation
- **Authentication and persistence** — Supabase Auth and PostgreSQL
- **Frontend workflow** — React kiosk screens, accessibility controls, and clinical state
- **Future integrations** — STT, OCR, authentication, persistence, and adaptive questioning

---

## License

Built for Smart India Hackathon 2026 (Problem Statement SIH26047). Not licensed for clinical production use without further validation.
