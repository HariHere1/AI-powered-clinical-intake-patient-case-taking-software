import { createContext, useContext, useState, ReactNode } from "react";

export type Screen =
  | "entry"
  | "staff"
  | "language"
  | "consent"
  | "converse"
  | "scan"
  | "summary"
  | "doctor-queue"
  | "doctor-detail";

export type UserRole = "doctor" | null;

export interface Language {
  code: string;
  native: string;
  english: string;
  script: string;
}

export interface ClinicalData {
  language: Language | null;
  responses: { section: string; question: string; answer: string }[];
  emergencyFlag: boolean;
  consentGiven: boolean;
}

interface AppContextValue {
  screen: Screen;
  navigateTo: (s: Screen) => void;
  hcMode: boolean;
  toggleHc: () => void;
  largeText: boolean;
  toggleLargeText: () => void;
  data: ClinicalData;
  setLanguage: (l: Language) => void;
  addResponse: (section: string, question: string, answer: string) => void;
  setEmergency: (v: boolean) => void;
  setConsent: (v: boolean) => void;
  // ── Doctor role (docs/doctor-requirements.md FR-DOC-01/02) ──
  userRole: UserRole;
  doctorId: string | null;
  loginDoctor: (id: string) => void;
  logoutDoctor: () => void;
  selectedSessionId: string | null;
  selectDoctorSession: (id: string | null) => void;
  reviewedIds: string[];
  markSessionReviewed: (id: string) => void;
  physicianEdits: Record<string, string>;
  savePhysicianEdit: (sessionId: string, text: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<Screen>("entry");
  const [hcMode, setHcMode] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [data, setData] = useState<ClinicalData>({
    language: null,
    responses: [],
    emergencyFlag: false,
    consentGiven: false,
  });
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [physicianEdits, setPhysicianEdits] = useState<Record<string, string>>({});

  function navigateTo(s: Screen) {
    setScreen(s);
  }

  function toggleHc() {
    setHcMode((v) => !v);
  }

  function toggleLargeText() {
    setLargeText((v) => !v);
  }

  function setLanguage(l: Language) {
    setData((d) => ({ ...d, language: l }));
  }

  function addResponse(section: string, question: string, answer: string) {
    setData((d) => ({
      ...d,
      responses: [...d.responses, { section, question, answer }],
    }));
  }

  function setEmergency(v: boolean) {
    setData((d) => ({ ...d, emergencyFlag: v }));
  }

  function setConsent(v: boolean) {
    setData((d) => ({ ...d, consentGiven: v }));
  }

  function loginDoctor(id: string) {
    setUserRole("doctor");
    setDoctorId(id);
    setSelectedSessionId(null);
  }

  function logoutDoctor() {
    setUserRole(null);
    setDoctorId(null);
    setSelectedSessionId(null);
    setScreen("entry");
  }

  function selectDoctorSession(id: string | null) {
    setSelectedSessionId(id);
  }

  function markSessionReviewed(id: string) {
    setReviewedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function savePhysicianEdit(sessionId: string, text: string) {
    setPhysicianEdits((prev) => ({ ...prev, [sessionId]: text }));
  }

  return (
    <AppContext.Provider
      value={{
        screen,
        navigateTo,
        hcMode,
        toggleHc,
        largeText,
        toggleLargeText,
        data,
        setLanguage,
        addResponse,
        setEmergency,
        setConsent,
        userRole,
        doctorId,
        loginDoctor,
        logoutDoctor,
        selectedSessionId,
        selectDoctorSession,
        reviewedIds,
        markSessionReviewed,
        physicianEdits,
        savePhysicianEdit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
