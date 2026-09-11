# MediKiosk

**AI-powered clinical history intake platform for Indian hospital OPDs**

Built for Smart India Hackathon (SIH26047) — targeting AYUSH and government health facility OPDs, where patients often face language barriers, low digital literacy, and long wait times before seeing a doctor.

MediKiosk lets a patient check in, select their preferred language, give consent, and complete a structured clinical history — by **speaking naturally** or tapping options — before the doctor even calls them in. The history is compiled into a structured summary the physician reviews at a glance.

---

## Problem Statement

Government OPDs process large patient volumes with limited staff time per consultation. Patients frequently:
- Speak regional languages the front desk may not support well in written form
- Struggle with digital literacy for typed intake forms
- Repeat their history verbally to multiple staff before reaching a doctor

MediKiosk addresses this with a kiosk-based, voice-first, multilingual intake flow that produces a doctor-ready summary — reducing consultation time and improving history accuracy.

---

## Key Features

- **Multilingual support** — 12 Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, Punjabi, Kannada, Malayalam, Gujarati, Odia, Urdu, English)
- **Dual-mode input** — tap to select an option or speak the answer aloud
- **Speech-to-Text** — powered by `faster-whisper`, running as a dedicated backend service
- **AI-driven adaptive questioning** — instead of a fixed questionnaire, an LLM (via Groq) generates the next clinically relevant question based on the patient's previous answers, mimicking how a doctor actually takes history
- **Emergency flagging** — real-time detection of red-flag symptoms (chest pain, breathing difficulty, fainting, etc.) with an on-screen alert to notify staff immediately
- **Mobile OTP-based check-in** — patient authentication via mobile number OTP verification (Supabase Auth), with walk-in fallback for new patients
- **Document scanning** — capture prescriptions, lab reports, and ID cards via kiosk camera
- **Physician-ready summary** — collapsible, editable sections summarizing chief complaint, medical history, family history, review of systems, and scanned documents
- **Accessibility** — large-text toggle for readability (high-contrast mode removed per latest design decision)
- **Staff/physician login** — separate authenticated path for hospital staff

---

## Architecture

```
medikiosk/
├── medikiosk-stt/          # Python STT backend (sibling directory, NOT nested in React app)
│   ├── venv/
│   ├── main.py             # FastAPI app, /transcribe endpoint
│   └── requirements.txt
│
└── medikiosk-frontend/     # React + TypeScript kiosk UI
    ├── src/
    │   ├── components/
    │   │   ├── AccessibilityBar.tsx
    │   │   └── BackButton.tsx
    │   ├── context/
    │   │   └── AppContext.tsx      # Global state: screen routing, clinical data, accessibility
    │   ├── screens/
    │   │   ├── EntryScreen.tsx     # ABHA/Aadhaar OTP + walk-in + staff login
    │   │   ├── LanguageSelect.tsx
    │   │   ├── ConsentScreen.tsx
    │   │   ├── ConverseScreen.tsx  # Core AI-driven interview (voice + touch)
    │   │   ├── DocumentScan.tsx
    │   │   └── SummaryScreen.tsx
    │   ├── App.tsx
    │   └── index.css
    ├── package.json
    └── vite.config.ts

server/                      # Node/Express (or shares FastAPI) — AI interview + auth routes
├── routes/
│   ├── interview.js         # /api/interview/next — Groq LLM adaptive questioning
│   └── mobileAuth.js        # /api/auth/send-otp, /api/auth/verify-otp — Supabase phone auth
├── lib/
│   └── supabaseClient.js    # Supabase client init (service role, backend-only)
└── .env                     # API keys (not committed)
```

**Design principle:** STT backend and frontend are kept as **sibling directories**, never nested — avoids Python venv and Node dependency trees colliding.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Package manager | pnpm |
| STT | faster-whisper, FastAPI, ffmpeg |
| Adaptive questioning (AI) | Groq API (`llama-3.3-70b-versatile`) |
| Patient auth | Supabase Auth (mobile number OTP) |
| Backend-as-a-Service | Supabase (Auth + Postgres DB) |
| State management | React Context API (no external state library) |

---

## Core Flow

```
Entry (check-in) → Language Select → Consent → Converse (AI interview) → Document Scan → Summary → Submit to Doctor
```

1. **Entry** — Patient checks in via mobile number (OTP verified through Supabase Auth) or as a walk-in. Staff/physician login is a separate collapsed panel.
2. **Language Select** — Patient picks their preferred language; all subsequent screens localize accordingly.
3. **Consent** — Patient is informed how their data is used, with audio playback and a clear decline path (falls back to paper-based intake by staff).
4. **Converse** — The core intake interview. Sections: Chief Complaint → Medical History → Family History → Review of Systems. Questions are **not hardcoded** — each next question is generated by an LLM call based on the running conversation history, and the patient can answer by tapping an option or speaking (transcribed via the STT backend).
5. **Document Scan** — Optional capture of prescriptions, lab reports, or ID cards.
6. **Summary** — Collapsible sections show the compiled history; staff/patient can edit inline before final submission to the doctor.

---

## Setup

### Prerequisites
- Node.js 18+
- Python 3.10+
- `ffmpeg` installed and on PATH
- pnpm (`npm install -g pnpm` or via Corepack)
- Groq API key ([console.groq.com](https://console.groq.com))
- Supabase project with Phone Auth enabled ([supabase.com](https://supabase.com)) — requires an SMS provider (e.g. Twilio, MSG91) configured in Supabase Auth settings

### 1. STT Backend

```powershell
cd medikiosk-stt
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload --port 8001
```

### 2. Interview / Auth Backend

```powershell
cd server
pnpm install
```

Create `.env`:
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=your_supabase_key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
```

Frontend also needs its own `.env` (publishable/anon key only — never the service role key):
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

```powershell
pnpm start
```

### 3. Frontend

```powershell
cd medikiosk-frontend
pnpm install
pnpm approve-builds    # first time only, approve pnpm's own build scripts
pnpm dev
```

Visit `http://localhost:5173`.

---

## API Endpoints (Backend)

| Endpoint | Method | Purpose |
|---|---|---|
| `/transcribe` | POST | Send audio, receive text transcript (faster-whisper) |
| `/api/interview/next` | POST | Given section + conversation history, returns next adaptive question |
| `/api/auth/send-otp` | POST | Sends OTP to patient's mobile number via Supabase Auth |
| `/api/auth/verify-otp` | POST | Verifies OTP, returns Supabase session (access token) for the patient |

---

## Known Limitations (Hackathon Scope)

- LLM-generated questions are **not clinically certified** — intended as a proof-of-concept for adaptive intake flow; production deployment would need clinical validation of the question-generation prompt and guardrails.
- Mobile OTP relies on Supabase's configured SMS provider — free-tier SMS providers may have limited delivery reliability or geographic restrictions in India; verify provider coverage before demo day.
- No ABHA/ABDM integration in current scope — patient identity is tied only to mobile number, so there's no linkage to a national health ID or existing health records.
- OTP session handling uses Supabase Auth defaults for demo purposes — production would need additional rate-limiting and abuse protection on top of Supabase's built-in throttling.
- Emergency detection is keyword/LLM-flag based, not a substitute for clinical triage.

---

## Team

- **Speech-to-Text module** — faster-whisper + FastAPI backend
- **OCR module** — document scanning pipeline (teammate)
- **Text-to-Speech module** — audio playback for consent/questions (teammate)

---

## License

Built for Smart India Hackathon 2026 (Problem Statement SIH26047). Not licensed for clinical production use without further validation.
