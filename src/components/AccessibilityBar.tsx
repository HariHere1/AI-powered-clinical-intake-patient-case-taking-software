import { useApp } from "../context/AppContext";

export default function AccessibilityBar() {
  const { hcMode, toggleHc, largeText, toggleLargeText, data } = useApp();

  return (
    <header
      className="flex items-center justify-between px-6 shrink-0 mk-transition"
      style={{
        height: 60,
        backgroundColor: "var(--mk-primary)",
        color: "var(--mk-primary-fg)",
        fontFamily: "var(--font-display)",
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <div className="font-bold tracking-wide" style={{ fontSize: "1.05rem", lineHeight: 1 }}>
            MediKiosk
          </div>
          {data.language && (
            <div style={{ fontSize: "0.7rem", opacity: 0.75, lineHeight: 1.2 }}>
              {data.language.english}
            </div>
          )}
        </div>
      </div>

      {/* Accessibility controls */}
      <div className="flex items-center gap-2">
        {/* High contrast toggle */}
        <button
          onClick={toggleHc}
          title="Toggle high-contrast mode"
          aria-pressed={hcMode}
          className="flex items-center gap-1.5 rounded-lg px-3 font-semibold mk-transition"
          style={{
            height: 40,
            fontSize: "0.8rem",
            backgroundColor: hcMode ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
            color: hcMode ? "var(--mk-primary)" : "var(--mk-primary-fg)",
            border: "2px solid rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
          </svg>
          <span>HC</span>
        </button>

        {/* Large text toggle */}
        <button
          onClick={toggleLargeText}
          title="Toggle large text"
          aria-pressed={largeText}
          className="flex items-center gap-1.5 rounded-lg px-3 font-bold mk-transition"
          style={{
            height: 40,
            fontSize: largeText ? "1rem" : "0.8rem",
            backgroundColor: largeText ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)",
            color: largeText ? "var(--mk-primary)" : "var(--mk-primary-fg)",
            border: "2px solid rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          Aa
        </button>

        {/* Help */}
        <button
          title="Get help from staff"
          className="flex items-center justify-center rounded-lg mk-transition"
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(255,255,255,0.15)",
            color: "var(--mk-primary-fg)",
            border: "2px solid rgba(255,255,255,0.4)",
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <circle cx="12" cy="17" r="0.5" fill="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  );
}
