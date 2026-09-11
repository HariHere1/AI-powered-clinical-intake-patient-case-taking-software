import { createContext, useContext, useState, ReactNode } from "react";
import { makeT, type TranslateFn } from "../i18n/translations";

export type Screen = "entry" | "staff" | "language" | "consent" | "converse" | "scan" | "summary";

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
  /** Translation function bound to the patient's selected language. */
  t: TranslateFn;
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

  const t = makeT(data.language?.code);

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

  return (
    <AppContext.Provider
      value={{
        screen,
        t,
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
