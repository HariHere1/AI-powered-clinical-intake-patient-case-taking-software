import { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";

const SECTIONS = [
  { id: "complaint", label: "Chief Complaint", shortLabel: "Complaint", color: "var(--mk-primary)" },
  { id: "history",   label: "Medical History",  shortLabel: "History",   color: "#2E7D60" },
  { id: "family",    label: "Family History",   shortLabel: "Family",    color: "#7B5EA7" },
  { id: "review",    label: "Review of Systems", shortLabel: "Review",   color: "#B5601F" },
];

const QUESTIONS: Record<string, { q: string; options: string[]; emergency?: string[] }[]> = {
  complaint: [
    {
      q: "What is the main reason for your visit today?",
      options: ["Pain or discomfort", "Fever or infection", "Difficulty breathing", "Weakness / fatigue", "Routine follow-up", "Other"],
      emergency: ["Difficulty breathing"],
    },
    {
      q: "Where is the pain or discomfort? Please point or describe.",
      options: ["Chest", "Abdomen / stomach", "Head", "Joints or muscles", "Back", "Other area"],
      emergency: ["Chest"],
    },
    {
      q: "How severe is it on a scale of 1 to 10?",
      options: ["1–3  Mild", "4–6  Moderate", "7–8  Severe", "9–10  Very severe"],
    },
    {
      q: "How long have you had this problem?",
      options: ["Just started today", "2–3 days", "About a week", "2–4 weeks", "More than a month"],
    },
  ],
  history: [
    {
      q: "Do you have any known medical conditions?",
      options: ["Diabetes", "High blood pressure", "Heart disease", "Asthma / lung disease", "Kidney or liver disease", "None of these"],
    },
    {
      q: "Are you currently taking any medicines or tablets?",
      options: ["Yes, taking regularly", "Taking sometimes", "Stopped recently", "No medicines"],
    },
    {
      q: "Have you been admitted to hospital before?",
      options: ["Yes, recently (within 1 year)", "Yes, in the past", "Never", "Not sure"],
    },
  ],
  family: [
    {
      q: "Do any close family members (parents, siblings) have a serious health condition?",
      options: ["Heart disease", "Diabetes", "Cancer", "High blood pressure", "Kidney disease", "None / Not known"],
    },
  ],
  review: [
    {
      q: "Are you experiencing any chest pain or pressure right now?",
      options: ["Yes — it is happening now", "I had it earlier but not now", "No"],
      emergency: ["Yes — it is happening now"],
    },
    {
      q: "Any difficulty breathing or shortness of breath?",
      options: ["Yes — right now", "Only on exertion", "No"],
      emergency: ["Yes — right now"],
    },
    {
      q: "Any recent dizziness, fainting, or loss of consciousness?",
      options: ["Yes, I fainted recently", "I felt dizzy", "No"],
      emergency: ["Yes, I fainted recently"],
    },
    {
      q: "Any nausea, vomiting, or inability to eat in the past 24 hours?",
      options: ["Yes, severe vomiting", "Mild nausea only", "No"],
    },
  ],
};

type MicState = "idle" | "listening" | "processing";

export default function ConverseScreen() {
  const { navigateTo, addResponse, setEmergency, data } = useApp();

  const [sectionIdx, setSectionIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [micState, setMicState] = useState<MicState>("idle");
  const [transcript, setTranscript] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);

  const section = SECTIONS[sectionIdx];
  const sectionQuestions = QUESTIONS[section.id];
  const question = sectionQuestions[questionIdx];
  const totalQ = Object.values(QUESTIONS).flat().length;
  const answeredQ = SECTIONS.slice(0, sectionIdx).reduce((a, s) => a + QUESTIONS[s.id].length, 0) + questionIdx;
  const progress = totalQ > 0 ? answeredQ / totalQ : 0;

  function handleOptionSelect(opt: string) {
    setSelectedOption(opt);
    setTranscript(opt);
    if (question.emergency?.includes(opt)) {
      setShowEmergency(true);
      setEmergency(true);
    } else {
      setShowEmergency(false);
    }
  }

  function handleConfirm() {
    if (!selectedOption && !transcript) return;
    const answer = selectedOption || transcript;
    addResponse(section.id, question.q, answer);
    setSelectedOption(null);
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

  const isAnswered = !!(selectedOption || transcript);

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      {/* Progress bar: section segments */}
      <div className="flex gap-1.5 px-6 pt-4 shrink-0">
        {SECTIONS.map((s, i) => {
          const sectionQs = QUESTIONS[s.id].length;
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
                {s.shortLabel}
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
          {section.label}
        </span>
        <span style={{ color: "var(--mk-muted)", fontSize: "0.75rem", fontWeight: 400 }}>
          · {questionIdx + 1} of {sectionQuestions.length}
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
                Please inform staff immediately
              </div>
              <div style={{ color: "var(--mk-fg)", fontFamily: "var(--font-body)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                You described a symptom that may need urgent attention. Please tell the reception desk or nursing staff right now. You can continue filling in your history as you wait.
              </div>
              <div
                className="mt-2 font-medium"
                style={{ color: "var(--mk-muted)", fontSize: "0.82rem", fontFamily: "var(--font-body)" }}
              >
                कृपया तुरंत कर्मचारियों को सूचित करें · உடனடியாக ஊழியர்களை தெரிவிக்கவும்
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
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.2rem, 2.8vw, 1.5rem)",
              fontWeight: 700,
              color: "var(--mk-fg)",
              lineHeight: 1.3,
              marginBottom: "1.25rem",
            }}
          >
            {question.q}
          </h2>

          {/* Touch options */}
          <div className="flex flex-col gap-2.5">
            {question.options.map((opt) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleOptionSelect(opt)}
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
                  {opt}
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
              Or speak your answer
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
                    Listening…
                  </span>
                </div>
              )}

              {micState === "processing" && (
                <div style={{ color: "var(--mk-accent)", fontFamily: "var(--font-display)", fontSize: "0.85rem", fontWeight: 600 }}>
                  Understanding your response…
                </div>
              )}

              {micState === "idle" && !transcript && (
                <div style={{ color: "var(--mk-muted)", fontFamily: "var(--font-body)", fontSize: "0.9rem" }}>
                  Tap the microphone and speak clearly in your language.
                </div>
              )}

              {/* Live transcript */}
              {transcript && (
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)" }}
                >
                  <div style={{ fontSize: "0.68rem", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                    I heard:
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
          Confirm &amp; Continue
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}
