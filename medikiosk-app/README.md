# MediKiosk

AI-powered patient clinical history intake platform (SIH26047). A fresh
rebuild: Next.js (App Router, TypeScript, Tailwind) frontend + backend,
PostgreSQL in Docker, self-hosted faster-whisper (STT) and Indic Parler-TTS
(TTS) microservices, Tesseract-based OCR microservice, and a Groq-backed LLM
adapter for adaptive follow-up questions and report summarization.

See `docs/architecture.md` for the full design.

## Prerequisites

- Node.js 22+, pnpm
- Docker Desktop
- A Groq API key (free tier works) for adaptive questioning / summarization

## Setup

```bash
cp .env.example .env
# fill in GROQ_API_KEY and change the placeholder passwords/secrets

docker compose up -d postgres stt ocr
# Indic Parler-TTS benefits heavily from a GPU. See
# docker-compose.override.yml.example for the GPU-passthrough setup, or run
# python-services/tts/app.py natively on the host with CUDA instead.
docker compose up -d tts   # or run it on the host, see the override example

pnpm install
pnpm prisma migrate dev
pnpm prisma db seed

pnpm dev
```

Open http://localhost:3000 for the patient kiosk flow,
http://localhost:3000/doctor/login for the doctor dashboard
(`doctor@demo-hospital.org` / `doctor123` from the seed script), and
http://localhost:3000/admin/login for hospital survey configuration
(`admin@demo-hospital.org` / `admin123`).

## Known assumptions (see docs/architecture.md for detail)

- **Patient OTP is mocked** (`MOCK_OTP=true`): no SMS provider is wired up
  yet, so the code is returned in the API response / server logs instead of
  being texted. Swap in a real provider in `src/lib/otp/`.
- **OCR** uses Tesseract (`pytesseract`) — good for typed/printed documents,
  not handwriting-grade.
- **TTS GPU**: works on CPU but is much faster with an NVIDIA GPU; see
  `docker-compose.override.yml.example`.
