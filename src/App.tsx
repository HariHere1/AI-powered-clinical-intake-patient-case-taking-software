import { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import AccessibilityBar from "./components/AccessibilityBar";
import EntryScreen from "./screens/EntryScreen";
import LanguageSelect from "./screens/LanguageSelect";
import ConsentScreen from "./screens/ConsentScreen";
import ConverseScreen from "./screens/ConverseScreen";
import DocumentScan from "./screens/DocumentScan";
import SummaryScreen from "./screens/SummaryScreen";

function KioskShell() {
  const { screen, hcMode, largeText } = useApp();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("hc-mode", hcMode);
    root.classList.toggle("large-text", largeText);
  }, [hcMode, largeText]);

  const screens: Record<typeof screen, React.ReactNode> = {
    entry:    <EntryScreen />,
    language: <LanguageSelect />,
    consent:  <ConsentScreen />,
    converse: <ConverseScreen />,
    scan:     <DocumentScan />,
    summary:  <SummaryScreen />,
  };

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

      {/* Step indicator — hidden on entry screen */}
      {screen !== "entry" && (
        <div
          className="flex items-center justify-center gap-2 shrink-0 py-2"
          style={{ borderBottom: "1px solid var(--mk-border)" }}
        >
          {(["language", "consent", "converse", "scan", "summary"] as const).map((s, i) => {
            const isCurrent = s === screen;
            const stepIdx = ["language", "consent", "converse", "scan", "summary"].indexOf(screen);
            const isComplete = i < stepIdx;
            return (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div
                    className="mk-transition"
                    style={{ width: 20, height: 2, borderRadius: 1, backgroundColor: isComplete ? "var(--mk-primary)" : "var(--mk-border)" }}
                  />
                )}
                <div
                  className="rounded-full mk-transition"
                  style={{
                    width: isCurrent ? 10 : 8,
                    height: isCurrent ? 10 : 8,
                    backgroundColor: isCurrent ? "var(--mk-primary)" : isComplete ? "var(--mk-primary)" : "var(--mk-border)",
                    opacity: isComplete ? 0.5 : 1,
                  }}
                />
              </div>
            );
          })}
          <span
            style={{ fontFamily: "var(--font-display)", fontSize: "0.68rem", color: "var(--mk-muted)", fontWeight: 500, marginLeft: 10, letterSpacing: "0.02em" }}
          >
            {screen === "language" ? "Language" : screen === "consent" ? "Consent" : screen === "converse" ? "Interview" : screen === "scan" ? "Documents" : "Review & Submit"}
          </span>
        </div>
      )}

      {/* Screen content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {screens[screen]}
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
