import { useEffect, type ReactNode } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import type { Screen } from "./context/AppContext";
import AccessibilityBar from "./components/AccessibilityBar";
import EntryScreen from "./screens/EntryScreen";
import StaffLoginScreen from "./screens/StaffLoginScreen";
import LanguageSelect from "./screens/LanguageSelect";
import ConsentScreen from "./screens/ConsentScreen";
import ConverseScreen from "./screens/ConverseScreen";
import DocumentScan from "./screens/DocumentScan";
import SummaryScreen from "./screens/SummaryScreen";
import DoctorQueueScreen from "./screens/doctor/DoctorQueueScreen";
import DoctorDetailScreen from "./screens/doctor/DoctorDetailScreen";

const workflowSteps: { screen: Exclude<Screen, "entry">; label: string }[] = [
  { screen: "language", label: "Language" },
  { screen: "consent", label: "Consent" },
  { screen: "converse", label: "Interview" },
  { screen: "scan", label: "Documents" },
  { screen: "summary", label: "Review & Submit" },
];

const screenContent: Record<Screen, ReactNode> = {
  entry: <EntryScreen />,
  staff: <StaffLoginScreen />,
  language: <LanguageSelect />,
  consent: <ConsentScreen />,
  converse: <ConverseScreen />,
  scan: <DocumentScan />,
  summary: <SummaryScreen />,
  "doctor-queue": <DoctorQueueScreen />,
  "doctor-detail": <DoctorDetailScreen />,
};

const PATIENT_SCREENS: Screen[] = ["language", "consent", "converse", "scan", "summary"];

function StepIndicator({ currentScreen }: { currentScreen: Exclude<Screen, "entry"> }) {
  const currentIndex = workflowSteps.findIndex(({ screen }) => screen === currentScreen);

  return (
    <div
      className="flex items-center justify-center gap-2 shrink-0 py-2"
      style={{ borderBottom: "1px solid var(--mk-border)" }}
    >
      {workflowSteps.map(({ screen: step, label }, index) => {
        const isCurrent = step === currentScreen;
        const isComplete = index < currentIndex;

        return (
          <div key={step} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className="mk-transition"
                style={{
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: isComplete ? "var(--mk-primary)" : "var(--mk-border)",
                }}
              />
            )}
            <div
              className="rounded-full mk-transition"
              style={{
                width: isCurrent ? 10 : 8,
                height: isCurrent ? 10 : 8,
                backgroundColor: isCurrent || isComplete ? "var(--mk-primary)" : "var(--mk-border)",
                opacity: isComplete ? 0.5 : 1,
              }}
            />
          </div>
        );
      })}
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "0.68rem",
          color: "var(--mk-muted)",
          fontWeight: 500,
          marginLeft: 10,
          letterSpacing: "0.02em",
        }}
      >
        {workflowSteps[currentIndex].label}
      </span>
    </div>
  );
}

function KioskShell() {
  const { screen, hcMode, largeText, userRole, navigateTo } = useApp();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("hc-mode", hcMode);
    root.classList.toggle("large-text", largeText);
  }, [hcMode, largeText]);

  // FR-DOC-02 role guard: doctor screens require doctor role.
  useEffect(() => {
    if ((screen === "doctor-queue" || screen === "doctor-detail") && userRole !== "doctor") {
      navigateTo("staff");
    }
  }, [screen, userRole, navigateTo]);

  return (
    <div
      className="flex flex-col"
      style={{
        height: "100dvh",
        width: "100%",
        backgroundColor: "var(--mk-bg)",
        fontFamily: "var(--font-body)",
        overflowX: "hidden",
      }}
    >
      <AccessibilityBar />

      {PATIENT_SCREENS.includes(screen) && screen !== "entry" && screen !== "staff" && (
        <StepIndicator currentScreen={screen as Exclude<Screen, "entry" | "staff" | "doctor-queue" | "doctor-detail">} />
      )}

      {/* Screen content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {screenContent[screen]}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <KioskShell />
    </AppProvider>
  );
}
