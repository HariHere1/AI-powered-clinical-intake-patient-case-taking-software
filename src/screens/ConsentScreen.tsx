import { useState } from "react";
import { useApp } from "../context/AppContext";

const CONSENT_POINTS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "We will record your health history",
    body: "Your answers will be stored as a digital health record for this visit.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Shared only with your doctor",
    body: "Your information is shared with the treating doctor and hospital staff only. It is not sold or shared with any outside company.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Your data is kept secure",
    body: "All information is protected. Only authorised hospital staff can view your record.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    title: "You can decline",
    body: "If you decline, a staff member will fill in your history on paper instead. Your care will not be affected.",
  },
];

export default function ConsentScreen() {
  const { navigateTo, setConsent, data } = useApp();
  const [audioPlaying, setAudioPlaying] = useState(false);

  const lang = data.language;

  function handleAccept() {
    setConsent(true);
    navigateTo("converse");
  }

  function handleDecline() {
    setConsent(false);
    navigateTo("language");
  }

  function toggleAudio() {
    setAudioPlaying((v) => !v);
    // In production: play TTS audio; stub here
    if (!audioPlaying) {
      setTimeout(() => setAudioPlaying(false), 4000);
    }
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto scrollbar-hide screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      <div
        className="flex flex-col mx-auto w-full px-6 py-8"
        style={{ maxWidth: 720 }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--mk-muted)", fontFamily: "var(--font-display)" }}
            >
              Before we begin
            </div>
            <h1
              className="font-bold"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.6rem, 3.5vw, 2.2rem)",
                lineHeight: 1.15,
                color: "var(--mk-fg)",
              }}
            >
              How we use<br />your information
            </h1>
          </div>

          {/* Audio play button */}
          <button
            onClick={toggleAudio}
            aria-label={audioPlaying ? "Pause audio" : "Listen to this page"}
            className="flex flex-col items-center gap-1 rounded-2xl shrink-0 mk-transition"
            style={{
              width: 80,
              backgroundColor: audioPlaying ? "var(--mk-primary)" : "var(--mk-sand)",
              border: "2px solid var(--mk-border)",
              padding: "12px 8px",
              cursor: "pointer",
              color: audioPlaying ? "var(--mk-primary-fg)" : "var(--mk-fg)",
            }}
          >
            {audioPlaying ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
                <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
            <span style={{ fontSize: "0.65rem", fontFamily: "var(--font-display)", fontWeight: 600 }}>
              {audioPlaying ? "Playing…" : "Listen"}
            </span>
          </button>
        </div>

        {/* Audio progress bar */}
        {audioPlaying && (
          <div
            className="rounded-full mb-6 overflow-hidden"
            style={{ height: 4, backgroundColor: "var(--mk-border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: "60%",
                backgroundColor: "var(--mk-primary)",
                animation: "audioProgress 4s linear forwards",
              }}
            />
          </div>
        )}

        {/* Consent points */}
        <div className="flex flex-col gap-4 mb-8">
          {CONSENT_POINTS.map((point, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl p-5 mk-transition"
              style={{
                backgroundColor: "var(--mk-card)",
                border: "1.5px solid var(--mk-border)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "var(--mk-sand)",
                  color: "var(--mk-primary)",
                }}
              >
                {point.icon}
              </div>
              <div>
                <div
                  className="font-semibold mb-1"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1rem, 2vw, 1.1rem)",
                    color: "var(--mk-fg)",
                  }}
                >
                  {point.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "clamp(0.88rem, 1.6vw, 0.95rem)",
                    color: "var(--mk-fg-secondary)",
                    lineHeight: 1.55,
                  }}
                >
                  {point.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Language note */}
        {lang && lang.code !== "en" && (
          <div
            className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
            style={{ backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mk-primary)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: "0.88rem", color: "var(--mk-fg-secondary)", fontFamily: "var(--font-body)" }}>
              This session will continue in <strong>{lang.english}</strong>. Questions and options will be shown in your chosen language.
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 pb-6">
          <button
            onClick={handleDecline}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-semibold mk-transition"
            style={{
              minHeight: 72,
              backgroundColor: "var(--mk-card)",
              border: "2px solid var(--mk-border)",
              color: "var(--mk-fg-secondary)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 2vw, 1.1rem)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mk-border-strong)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mk-border)";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Decline
          </button>

          <button
            onClick={handleAccept}
            className="flex-[2] flex items-center justify-center gap-3 rounded-2xl font-bold mk-transition"
            style={{
              minHeight: 72,
              backgroundColor: "var(--mk-primary)",
              color: "var(--mk-primary-fg)",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.05rem, 2.2vw, 1.2rem)",
              cursor: "pointer",
              border: "2px solid transparent",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-primary-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-primary)";
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            I Agree — Continue
          </button>
        </div>
      </div>
    </div>
  );
}
