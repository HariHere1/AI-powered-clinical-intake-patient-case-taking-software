# Doctor Role — Frontend Requirements

**Project:** MediKiosk (SIH26047) — Multilingual clinical history intake kiosk for Indian hospital OPDs
**Scope:** Frontend only (`src/` React + Vite + TypeScript)
**Status:** Draft for hackathon MVP
**Related:** `README.md`, `medikiosk_supabase_schema.sql`, `src/screens/SummaryScreen.tsx`, `src/screens/EntryScreen.tsx` (`StaffPanel`), `src/context/AppContext.tsx`

---

## 1. Background & Gap

Today the kiosk implements the **patient path** only:

```
Entry → Language → Consent → Converse → Document Scan → Summary (patient-facing)
```

Gaps for `Doctor` user:

- `Screen = "staff"` exists in `src/context/AppContext.tsx:3` but `StaffPanel.handleLogin()` in `src/screens/EntryScreen.tsx:480` always returns `Invalid credentials`. Dead-end.
- `src/screens/SummaryScreen.tsx:7` renders hardcoded `MOCK_SUMMARY` (Sunita Devi) to the patient, not real `data.responses` to a doctor.
- Schema already anticipates doctor workflow (`kiosk_sessions.status`, `summaries.is_physician_edited/physician_edited_text/reviewed_at`, `audit_log`) but no frontend reads/writes it.

This doc defines what the **Doctor frontend** must do.

---

## 2. Persona & Design Constraints

**Persona:** Duty OPD doctor, Govt / AYUSH hospital. 60–100 patients/day, <2 min per chart, works in English/Hindi, uses desktop/tablet (not the kiosk touchscreen).

**Constraints:**

- High volume → triage at a glance, 2-click review-and-next.
- Low trust in kiosk STT/patient taps → must be able to correct quickly.
- DPDP 2023 → no raw ABHA/Aadhaar on screen, consent proof visible, audit on review.
- Accessibility inherits kiosk tokens (`hc-mode`, `large-text` in `src/index.css`).
- Offline-tolerant OPD → queue must render from cache, no autoplay audio.

Out of scope for frontend MVP: prescription writing, FHIR/ABDM push, OCR engine, analytics dashboards.

---

## 3. Information Architecture

Extend `Screen` type:

```ts
type Screen =
  | "entry" | "staff" | "language" | "consent" | "converse" | "scan" | "summary"
  | "doctor-queue" | "doctor-detail";
```

Routing:

- `StaffPanel` success (role=`doctor`) → `navigateTo("doctor-queue")`.
- `doctor-queue` row click → `doctor-detail/:sessionId`.
- `doctor-detail` Back → `doctor-queue`. No access to patient flow without logout.
- Kiosk `AccessibilityBar` brand remains; `StepIndicator` hidden on doctor screens (same as `staff` in `src/App.tsx:106`).

New files (proposed):

```
src/screens/doctor/DoctorQueueScreen.tsx
src/screens/doctor/DoctorDetailScreen.tsx
src/services/doctorService.ts  // Supabase read/write, mock fallback
```

---

## 4. Functional Requirements

### 4.1 Auth & Session

- **FR-DOC-01 — Doctor login:** Replace mock login with Supabase Auth. On success, store `role`, `doctorId`, route to `doctor-queue`. On failure show inline error (keep current UX).
- **FR-DOC-02 — Role guard:** `doctor-*` screens require `role==='doctor'`. Patient screens require no auth. Logout returns to `entry` and clears doctor state (do not clear kiosk patient state blindly).

### 4.2 Queue — `DoctorQueueScreen`

Source: `kiosk_sessions WHERE status='awaiting_review'`.

- **FR-DOC-03 — Sorted list:** `emergency_flag=true` first, then oldest `started_at`. Show count header (`3 urgent · 12 waiting`).
- **FR-DOC-04 — Row content:** token/MRN, age/sex, wait mins, chief-complaint 1-liner (first `conversation_responses` or `summaries.summary_text` truncated to 80 chars), language badge (`language_code`), docs count (`documents`), `URGENT` pill if flagged.
- **FR-DOC-05 — Refresh:** Poll every 15s + manual refresh. Empty state: `No patients awaiting review`.
- **FR-DOC-06 — Navigation:** Tap row → `doctor-detail` with `sessionId`. Preserve scroll on back.

### 4.3 Detail — `DoctorDetailScreen`

Source: `kiosk_sessions` + `conversation_responses` + `documents` + `summaries` + `consents`. Reuse section model from `ConverseScreen.tsx:6` and cards from `SummaryScreen.tsx`.

- **FR-DOC-07 — Header:** patient MRN/age/sex/visit date, consent proof (`consent_version`, `granted_at`, `method`), original language + `summary_language`.
- **FR-DOC-08 — Sections:** Chief Complaint / Medical History / Family History / Review of Systems / Documents. Each shows `question_text → response_text`, `is_red_flag` highlight. Never use `MOCK_SUMMARY`.
- **FR-DOC-09 — Bilingual:** Physician view defaults to `en` (`summaries.summary_text`). Expandable original-language transcript per turn (`conversation_responses.language_code`, `response_text`).
- **FR-DOC-10 — Emergency:** If any `is_red_flag` or `emergency_flag`, sticky top banner (reuse `ConverseScreen.tsx:223` styles). Must not be dismissible without review action.
- **FR-DOC-11 — Documents:** Thumbnails via `documents.storage_path`; show `ocr_status`; render `ocr_extracted_text` timeline if `completed`, else `pending` badge.
- **FR-DOC-12 — Actions:**
  - `Mark Reviewed & Call Next` → `kiosk_sessions.status='submitted'`, `summaries.reviewed_at=now()`, `audit_log('session_reviewed')`, return to queue.
  - `Edit & Save` → inline edit per section → `summaries.is_physician_edited=true`, `physician_edited_text`, `audit_log('summary_edited')`.
  - `Back to Queue`, `Print` (window.print with print CSS).

### 4.4 Audit & Privacy

- **FR-DOC-13:** Every review/edit writes `audit_log(session_id, event_type, event_data={doctorId})`.
- **FR-DOC-14:** Never render `patients.abha_id_hash/aadhaar_ref_hash` raw; show masked `···1234` only (reuse `maskId()` in `EntryScreen.tsx:7`).

---

## 5. Non-Functional Requirements

- **NFR-01 Performance:** Queue of 100 rows renders <1s, no blocking TTS fetch. No `speak()` autoplay on doctor screens.
- **NFR-02 Security:** RLS already denies `anon/authenticated` in schema; frontend must use server `/api/doctor/*` with service-role, never expose `SUPABASE_SERVICE_ROLE_KEY` to browser (per `README.md:161`).
- **NFR-03 Accessibility:** Keyboard navigable queue, `aria-pressed` on pills, inherits `hc-mode`/`large-text`.
- **NFR-04 Reliability:** If Supabase unreachable, fall back to in-memory `AppContext.data.responses` mock with `Demo data` badge so hackathon demo never blanks.

---

## 6. Data Mapping

| UI | Table.column |
|---|---|
| Queue row urgency | `kiosk_sessions.emergency_flag` |
| Queue wait | `kiosk_sessions.started_at` |
| Q&A lines | `conversation_responses.question_text/response_text/is_red_flag/sequence_no` |
| Doctor summary | `summaries.summary_text/summary_language` |
| Doctor edits | `summaries.is_physician_edited/physician_edited_text/reviewed_at` |
| Consent chip | `consents.consent_version/granted_at/method` |
| Docs | `documents.storage_path/doc_type/ocr_status/ocr_extracted_text` |
| Language badge | `kiosk_sessions.language_code` |

---

## 7. User Stories & Acceptance Criteria

**US-01 — Triage**
_As Doctor, I see urgent cases first so I triage._
AC: Seed 1 `emergency_flag=true` + 2 normal `awaiting_review` → urgent row top with `URGENT` pill; wait time increments.

**US-02 — Correct**
_As Doctor, I correct kiosk errors so record is safe._
AC: Edit Review-of-Systems line → Save → reload detail shows edited text; DB has `is_physician_edited=true`.

**US-03 — Finish fast**
_As Doctor, I finish review in 2 clicks._
AC: Detail → `Mark Reviewed & Call Next` → session removed from queue, `status='submitted'`, audit row exists.

**US-04 — Consent confidence**
_As Doctor, I verify consent before acting._
AC: Detail header shows version + timestamp; if `consent_given=false`, actions disabled with `Awaiting consent` notice.

---

## 8. MVP Build Order

1. `doctorService.ts` mock returning `AppContext.data` shaped as `summaries` + `conversation_responses`.
2. `DoctorQueueScreen` static list + urgent sort.
3. `DoctorDetailScreen` reading real context (kill `MOCK_SUMMARY` dependency).
4. Wire `StaffPanel` → `doctor-queue`.
5. Swap mock service for Supabase fetch + review/edit mutations.

---

## 9. Open Questions

- Same Vite app or separate doctor workstation build?
- Doctor language preference: English-only or English+Hindi toggle?
- Print format: full Q&A or 1-page SOAP note?
