// Doctor-facing data layer — docs/doctor-requirements.md §6, §8.
// MVP: mock fallback shaped like Supabase rows (NFR-04). Swap the fetch
// functions for real `/api/doctor/*` calls once the backend exists; the
// screen components consume only the exported types + helpers below.

import type { ClinicalData } from "../context/AppContext";

export type SessionStatus = "awaiting_review" | "submitted";

export interface DoctorResponse {
  sequence_no: number;
  section: string;
  question_text: string;
  response_text: string;
  is_red_flag: boolean;
  language_code: string;
}

export interface DoctorDocument {
  id: string;
  doc_type: "prescription" | "report" | "id";
  ocr_status: "pending" | "processing" | "completed" | "failed" | "not_applicable";
  ocr_note?: string;
}

export interface DoctorSession {
  id: string;
  mrn: string;
  name: string;
  age: string;
  sex: string;
  language_code: string;
  language_english: string;
  started_at: string; // ISO
  waitMins: number;
  emergency_flag: boolean;
  consent_given: boolean;
  consent_version: string;
  consent_granted_at: string;
  consent_method: "ui_tap" | "audio_guided";
  status: SessionStatus;
  chief_complaint: string;
  responses: DoctorResponse[];
  documents: DoctorDocument[];
  summary_text: string;
  summary_language: string;
}

const RED_FLAG_ANSWERS = new Set([
  "Difficulty breathing",
  "Chest",
  "Yes — it is happening now",
  "Yes — right now",
  "Yes, I fainted recently",
]);

function toRedFlag(answer: string): boolean {
  return RED_FLAG_ANSWERS.has(answer);
}

function sectionLabel(section: string): string {
  switch (section) {
    case "complaint":
      return "Chief Complaint";
    case "history":
      return "Medical History";
    case "family":
      return "Family History";
    case "review":
      return "Review of Systems";
    default:
      return section;
  }
}

export { sectionLabel };

// ─── Seeded demo queue (US-01: 1 urgent + 2 routine) ──────────────────────
// Timestamps are relative to `now` so wait times always look live.

function seedSessions(now: number): DoctorSession[] {
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60_000).toISOString();
  return [
    {
      id: "sess-urgent-01",
      mrn: "OPD-2024-04821",
      name: "Sunita Devi",
      age: "58 years",
      sex: "Female",
      language_code: "hi",
      language_english: "Hindi",
      started_at: iso(42),
      waitMins: 42,
      emergency_flag: true,
      consent_given: true,
      consent_version: "v1",
      consent_granted_at: iso(40),
      consent_method: "ui_tap",
      status: "awaiting_review",
      chief_complaint: "Chest pain and difficulty breathing · 7–8 Severe · About a week",
      responses: [
        { sequence_no: 1, section: "complaint", question_text: "What is the main reason for your visit today?", response_text: "Difficulty breathing", is_red_flag: true, language_code: "hi" },
        { sequence_no: 2, section: "complaint", question_text: "Where is the pain or discomfort?", response_text: "Chest", is_red_flag: true, language_code: "hi" },
        { sequence_no: 3, section: "complaint", question_text: "How severe is it on a scale of 1 to 10?", response_text: "7–8  Severe", is_red_flag: false, language_code: "hi" },
        { sequence_no: 4, section: "review", question_text: "Are you experiencing any chest pain or pressure right now?", response_text: "Yes — it is happening now", is_red_flag: true, language_code: "hi" },
      ],
      documents: [{ id: "doc-1", doc_type: "prescription", ocr_status: "pending" }],
      summary_text:
        "58F with chest pain + dyspnoea x ~1 week, severe (7–8/10). Known diabetes + hypertension. Family: heart disease (father). ROS: active chest pain + dyspnoea now. Needs urgent triage.",
      summary_language: "en",
    },
    {
      id: "sess-routine-02",
      mrn: "OPD-2024-04822",
      name: "Ramesh Kumar",
      age: "44 years",
      sex: "Male",
      language_code: "hi",
      language_english: "Hindi",
      started_at: iso(25),
      waitMins: 25,
      emergency_flag: false,
      consent_given: true,
      consent_version: "v1",
      consent_granted_at: iso(23),
      consent_method: "ui_tap",
      status: "awaiting_review",
      chief_complaint: "Fever x 2–3 days, moderate",
      responses: [
        { sequence_no: 1, section: "complaint", question_text: "What is the main reason for your visit today?", response_text: "Fever or infection", is_red_flag: false, language_code: "hi" },
        { sequence_no: 2, section: "complaint", question_text: "How long have you had this problem?", response_text: "2–3 days", is_red_flag: false, language_code: "hi" },
        { sequence_no: 3, section: "history", question_text: "Do you have any known medical conditions?", response_text: "None of these", is_red_flag: false, language_code: "hi" },
      ],
      documents: [],
      summary_text: "44M, fever 2–3 days, no known comorbidities, no red flags. Routine review.",
      summary_language: "en",
    },
    {
      id: "sess-routine-03",
      mrn: "OPD-2024-04823",
      name: "Meena Nair",
      age: "31 years",
      sex: "Female",
      language_code: "ml",
      language_english: "Malayalam",
      started_at: iso(10),
      waitMins: 10,
      emergency_flag: false,
      consent_given: false,
      consent_version: "v1",
      consent_granted_at: iso(9),
      consent_method: "ui_tap",
      status: "awaiting_review",
      chief_complaint: "Routine follow-up",
      responses: [
        { sequence_no: 1, section: "complaint", question_text: "What is the main reason for your visit today?", response_text: "Routine follow-up", is_red_flag: false, language_code: "ml" },
      ],
      documents: [{ id: "doc-2", doc_type: "report", ocr_status: "processing" }],
      summary_text: "31F routine follow-up. Consent not yet confirmed — verify before action.",
      summary_language: "en",
    },
  ];
}

// Live kiosk session (current patient on this device) appended on top of seeds
// so the demo never blanks (NFR-04).
function liveSession(data: ClinicalData, now: number): DoctorSession | null {
  if (data.responses.length === 0 && !data.consentGiven && !data.emergencyFlag) return null;
  const lang = data.language;
  const responses: DoctorResponse[] = data.responses.map((r, i) => ({
    sequence_no: i + 1,
    section: r.section,
    question_text: r.question,
    response_text: r.answer,
    is_red_flag: toRedFlag(r.answer) || (data.emergencyFlag && i === 0),
    language_code: lang?.code ?? "en",
  }));
  const first = responses[0];
  return {
    id: "sess-live-kiosk",
    mrn: "OPD-LIVE",
    name: "Current kiosk patient",
    age: "—",
    sex: "—",
    language_code: lang?.code ?? "en",
    language_english: lang?.english ?? "English",
    started_at: new Date(now).toISOString(),
    waitMins: 0,
    emergency_flag: data.emergencyFlag || responses.some((r) => r.is_red_flag),
    consent_given: data.consentGiven,
    consent_version: "v1",
    consent_granted_at: new Date(now).toISOString(),
    consent_method: "ui_tap",
    status: "awaiting_review",
    chief_complaint: first ? `${first.response_text} — ${first.question_text}`.slice(0, 80) : "Intake in progress",
    responses,
    documents: [],
    summary_text:
      responses.length > 0
        ? responses.map((r) => `${r.question_text} → ${r.response_text}`).join(" | ").slice(0, 280)
        : "Intake in progress on this kiosk.",
    summary_language: "en",
  };
}

/** Full queue: live kiosk session first (if any), then seeds. */
export function buildDoctorQueue(data: ClinicalData): DoctorSession[] {
  const now = Date.now();
  const live = liveSession(data, now);
  const seeds = seedSessions(now);
  return live ? [live, ...seeds] : seeds;
}

/** FR-DOC-03: urgent first, then oldest wait. Excludes reviewed (submitted). */
export function sortQueue(sessions: DoctorSession[], reviewedIds: string[]): DoctorSession[] {
  return sessions
    .filter((s) => !reviewedIds.includes(s.id) && s.status === "awaiting_review")
    .sort((a, b) => {
      if (a.emergency_flag !== b.emergency_flag) return a.emergency_flag ? -1 : 1;
      return b.waitMins - a.waitMins;
    });
}

/** Minimal audit trail until `/api/doctor` exists (FR-DOC-13). */
export function logAudit(event_type: string, session_id: string, event_data: Record<string, unknown> = {}): void {
  const entry = { event_type, session_id, event_data, created_at: new Date().toISOString() };
  try {
    const key = "medikiosk.audit_log";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    prev.push(entry);
    localStorage.setItem(key, JSON.stringify(prev.slice(-100)));
  } catch {
    // localStorage unavailable (private mode) — console is enough for MVP.
  }
  console.info("[audit]", entry);
}

export function maskRef(mrn: string): string {
  if (mrn.length <= 4) return mrn;
  return `···${mrn.slice(-4)}`;
}
