import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useTTS } from "../hooks/useTTS";
import ScreenBackButton from "../components/ScreenBackButton";

// Sections and questions are stored as i18n keys — all patient-facing text is
// resolved through t() so the whole interview follows the selected language.
// Option counts per question, and which option indices are emergency flags.
const QUESTION_COUNTS: Record<string, number[]> = {
  complaint: [6, 6, 4, 5],
  history: [6, 4, 4],
  family: [6],
  review: [3, 3, 3, 3],
};

const EMERGENCY_OPTS: Record<string, Record<number, number[]>> = {
  complaint: {
    0: [2], // Difficulty breathing
    1: [0], // Chest
  },
  review: {
    0: [0], // Happening now
    1: [0], // Right now
    2: [0], // Fainted recently
  },
};

const SECTIONS = [
  { id: "complaint", color: "var(--mk-primary)" },
  { id: "history", color: "#2E7D60" },
  { id: "family", color: "#7B5EA7" },
  { id: "review", color: "#B5601F" },
];

type MicState = "idle" | "listening" | "processing";

export default function ConverseScreen() {
  const { navigateTo, addResponse, setEmergency, t } = useApp();
  const { speak, stop, isSpeaking } = useTTS();

  const [sectionIdx, setSectionIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [micState, setMicState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);

  const section = SECTIONS[sectionIdx];
  const sectionQuestions = QUESTION_COUNTS[section.id];
  const questionCount = sectionQuestions[questionIdx];

  // Resolved, translated text for the current question and its options.
  const qKey = `q.${section.id}.${questionIdx}`;
  const qText = t(qKey);
  const options = Array.from({ length: questionCount }, (_, i) => ({
    idx: i,
    key: `opt.${section.id}.${questionIdx}.${i}`,
    text: t(`opt.${section.id}.${questionIdx}.${i}`),
  }));
  const totalQ = Object.values(QUESTION_COUNTS).flat().reduce((a, b) => a + b, 0);
  const answeredQ = SECTIONS.slice(0, sectionIdx).reduce((a, s) => a + QUESTION_COUNTS[s.id].length, 0) + questionIdx;
  const progress = totalQ > 0 ? answeredQ / totalQ : 0;

  // Read each question aloud in the patient's language as it appears —
  // kiosk users may be low-literacy or elderly and need zero-training
  // audio guidance. Re-speaks when the language changes too.
  useEffect(() => {
    speak(qText);
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id, questionIdx, qText]);

  function handleOptionSelect(i: number) {
    setSelectedIdx(i);
    setTranscript("");
    const emergencyIdx = EMERGENCY_OPTS[section.id]?.[questionIdx];
    setShowEmergency(!!emergencyIdx?.includes(i));
    if (emergencyIdx?.includes(i)) setEmergency(true);
  }

  function handleConfirm() {
    const answered = selectedIdx !== null || transcript;
    if (!answered) return;
    const answer = selectedIdx !== null ? options[selectedIdx].text : transcript;
    addResponse(section.id, qText, answer);
    setSelectedIdx(null);
    setTranscript("");
    setShowEmergency(false);

    // Advance
    if (questionIdx + 1 < sectionQuestions.length) {
      setQuestionIdx((q) => q + 1);
    } else if (sectionIdx + 1 < SECTIONS.length) {
      setSectionIdx((s) => s + 1);
      setQuestionIdx(0);
    } else {
      navigateTo("scan");
    }
  }

  function toggleMic() {
    if (micState === "idle") {
      setMicState("listening");
      // Simulate 3s of listening then processing
      setTimeout(() => {
        setMicState("processing");
        setTimeout(() => {
          setMicState("idle");
          setTranscript("Chest pain, started yesterday");
        }, 1200);
      }, 3000);
    } else {
      setMicState("idle");
    }
  }

  const isAnswered = selectedIdx !== null || !!transcript;

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      <div className="px-6 pt-4 shrink-0">
        <ScreenBackButton to="consent" label={t("back.consent")} />
      </div>
      {/* Progress bar: section segments */}
      <div className="flex gap-1.5 px-6 pt-4 shrink-0">
        {SECTIONS.map((s, i) => {
          const sectionQs = QUESTION_COUNTS[s.id].length;
          const isActive = i === sectionIdx;
          const isComplete = i < sectionIdx;
          const fillRatio = isComplete ? 1 : isActive ? (questionIdx / sectionQs) : 0;

          return (
            <div key={s.id} className="flex flex-col gap-1" style={{ flex: sectionQs }}>
              <div
                className="rounded-full overflow-hidden"
                style={{ height: 6, backgroundColor: "var(--mk-sand)" }}
              >
                <div
                  className="h-full rounded-full mk-transition"
                  style={{
                    width: `${fillRatio * 100}%`,
                    backgroundColor: isComplete || isActive ? s.color : "transparent",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
              <span
                className="font-medium"
                style={{
                  fontSize: "0.65rem",
                  color: isActive ? s.color : "var(--mk-muted)",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {t(`section.${s.id}.short`)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Section label */}
      <div
        className="flex items-center gap-2 px-6 pt-3 pb-1 shrink-0"
        style={{ color: section.color, fontFamily: "var(--font-display)" }}
      >
        <div
          className="rounded-full"
          style={{ width: 8, height: 8, backgroundColor: section.color }}
        />
        <span className="font-semibold" style={{ fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {t(`section.${section.id}.label`)}
        </span>
        <span style={{ color: "var(--mk-muted)", fontSize: "0.75rem", fontWeight: 400 }}>
          · {t("converse.qof", { i: questionIdx + 1, n: sectionQuestions.length })}
        </span>
      </div>

      {/* Main content — scrollable */}
      <div className="flex flex-col flex-1 overflow-y-auto scrollbar-hide px-6 pb-6 gap-4">

        {/* Emergency banner */}
        {showEmergency && (
          <div
            className="rounded-2xl p-5 flex items-start gap-4 emergency-border"
            style={{
              backgroundColor: "var(--mk-emergency-bg)",
              border: "2.5px solid var(--mk-emergency)",
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 52, height: 52, backgroundColor: "var(--mk-emergency)", color: "#fff" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
              </svg>
            </div>
            <div>
              <div
                className="font-bold mb-1"
                style={{ color: "var(--mk-emergency)", fontFamily: "var(--font-display)", fontSize: "1.05rem" }}
              >
                {t("converse.emergencyTitle")}
              </div>
              <div style={{ color: "var(--mk-fg)", fontFamily: "var(--font-body)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                {t("converse.emergencyBody")}
              </div>
            </div>
          </div>
        )}

        {/* Question card */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "var(--mk-card)",
            border: "1.5px solid var(--mk-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3" style={{ marginBottom: "1.25rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.2rem, 2.8vw, 1.5rem)",
                fontWeight: 700,
                color: "var(--mk-fg)",
                lineHeight: 1.3,
              }}
            >
              {qText}
            </h2>
            <button
              onClick={() => (isSpeaking ? stop() : speak(qText))}
              aria-label={isSpeaking ? "Stop reading question" : "Read question aloud"}
              className="flex items-center justify-center rounded-full shrink-0 mk-transition"
              style={{
                width: 44,
                height: 44,
                backgroundColor: isSpeaking ? "var(--mk-primary)" : "var(--mk-sand)",
                color: isSpeaking ? "var(--mk-primary-fg)" : "var(--mk-primary)",
                border: "2px solid var(--mk-border)",
                cursor: "pointer",
              }}
            >
              {isSpeaking ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
          </div>

          {/* Touch options */}
          <div className="flex flex-col gap-2.5">
            {options.map((opt) => {
              const isSelected = selectedIdx === opt.idx;
              return (
                <button
                  key={opt.idx}
                  onClick={() => handleOptionSelect(opt.idx)}
                  className="flex items-center gap-3 rounded-xl text-left mk-transition"
                  style={{
                    minHeight: 60,
                    padding: "14px 18px",
                    backgroundColor: isSelected ? "var(--mk-primary)" : "var(--mk-sand)",
                    color: isSelected ? "var(--mk-primary-fg)" : "var(--mk-fg)",
                    border: isSelected ? "2px solid var(--mk-primary)" : "2px solid transparent",
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.95rem, 1.8vw, 1.05rem)",
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <div
                    className="rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      width: 26,
                      height: 26,
                      border: `2px solid ${isSelected ? "rgba(255,255,255,0.5)" : "var(--mk-border-strong)"}`,
                      backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : "transparent",
                    }}
                  >
                    {isSelected && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  {opt.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Voice input row */}
        <div
          className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ backgroundColor: "var(--mk-card)", border: "1.5px solid var(--mk-border)" }}
        >
          <div className="flex items-center gap-2">
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--mk-muted)" }} />
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-display)", color: "var(--mk-muted)", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 600 }}>
              {t("converse.speakAnswer")}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Mic button */}
            <div className="relative flex items-center justify-center shrink-0" style={{ width: 88, height: 88 }}>
              {micState === "listening" && (
                <>
                  <div
                    className="mic-ring absolute rounded-full"
                    style={{ width: 88, height: 88, border: "3px solid var(--mk-primary)", borderRadius: "50%", opacity: 0.5 }}
                  />
                  <div
                    className="mic-ring-2 absolute rounded-full"
                    style={{ width: 88, height: 88, border: "3px solid var(--mk-primary)", borderRadius: "50%", opacity: 0.4 }}
                  />
                </>
              )}
              <button
                onClick={toggleMic}
                aria-label={micState === "idle" ? "Start speaking" : "Stop listening"}
                className="flex items-center justify-center rounded-full mk-transition"
                style={{
                  width: 76,
                  height: 76,
                  backgroundColor: micState === "listening" ? "var(--mk-primary)" : micState === "processing" ? "var(--mk-accent)" : "var(--mk-sand)",
                  border: `3px solid ${micState === "idle" ? "var(--mk-border-strong)" : "transparent"}`,
                  color: micState === "idle" ? "var(--mk-primary)" : "white",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {micState === "processing" ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="12" rx="3" fill={micState === "listening" ? "white" : "none"} />
                    <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                )}
              </button>
            </div>

            {/* Waveform / transcript */}
            <div className="flex flex-col flex-1 gap-3">
              {micState === "listening" && (
                <div className="flex items-center gap-1.5" style={{ height: 44 }}>
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="wave-bar"
                      style={{ backgroundColor: "var(--mk-primary)" }}
                    />
                  ))}
                  <span
                    className="ml-2"
                    style={{ color: "var(--mk-primary)", fontFamily: "var(--font-display)", fontSize: "0.85rem", fontWeight: 600 }}
                  >
                    {t("converse.listening")}
                  </span>
                </div>
              )}

              {micState === "processing" && (
                <div style={{ color: "var(--mk-accent)", fontFamily: "var(--font-display)", fontSize: "0.85rem", fontWeight: 600 }}>
                  {t("converse.processing")}
                </div>
              )}

              {micState === "idle" && !transcript && (
                <div style={{ color: "var(--mk-muted)", fontFamily: "var(--font-body)", fontSize: "0.9rem" }}>
                  {t("converse.micPrompt")}
                </div>
              )}

              {/* Live transcript */}
              {transcript && (
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)" }}
                >
                  <div style={{ fontSize: "0.68rem", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                    {t("converse.iHeard")}
                  </div>
                  <div style={{ color: "var(--mk-fg)", fontFamily: "var(--font-body)", fontSize: "0.95rem", fontStyle: "italic" }}>
                    "{transcript}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!isAnswered}
          className="rounded-2xl flex items-center justify-center gap-3 font-bold mk-transition"
          style={{
            minHeight: 68,
            backgroundColor: isAnswered ? "var(--mk-primary)" : "var(--mk-sand)",
            color: isAnswered ? "var(--mk-primary-fg)" : "var(--mk-muted)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1rem, 2vw, 1.15rem)",
            cursor: isAnswered ? "pointer" : "not-allowed",
            border: "none",
            opacity: isAnswered ? 1 : 0.7,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {t("converse.confirm")}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
