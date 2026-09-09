import { useState } from "react";
import { useApp } from "../context/AppContext";

type ScanState = "idle" | "scanning" | "captured";

export default function DocumentScan() {
  const { navigateTo } = useApp();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [capturedDocs, setCapturedDocs] = useState<string[]>([]);
  const [scanType, setScanType] = useState<"prescription" | "report" | "id">("prescription");

  const DOC_TYPES = [
    { id: "prescription" as const, label: "Prescription", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    )},
    { id: "report" as const, label: "Lab Report", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5z" /><polyline points="9 3 9 8 20 8" />
        <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
      </svg>
    )},
    { id: "id" as const, label: "ID / Health Card", icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )},
  ];

  function handleCapture() {
    setScanState("scanning");
    setTimeout(() => {
      setScanState("captured");
      setCapturedDocs((d) => [...d, `${scanType}_${Date.now()}`]);
      setTimeout(() => setScanState("idle"), 800);
    }, 2000);
  }

  function handleSkip() {
    navigateTo("summary");
  }

  function handleNext() {
    navigateTo("summary");
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-y-auto scrollbar-hide screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      <div className="flex flex-col mx-auto w-full px-6 py-6" style={{ maxWidth: 720, gap: "1.25rem" }}>
        {/* Header */}
        <div>
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--mk-muted)", fontFamily: "var(--font-display)" }}
          >
            Step 3 of 4
          </div>
          <h1
            className="font-bold"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--mk-fg)", lineHeight: 1.2 }}
          >
            Scan your documents
          </h1>
          <p style={{ color: "var(--mk-muted)", fontFamily: "var(--font-body)", fontSize: "0.95rem", marginTop: 6 }}>
            Old prescriptions and test reports help your doctor. You can skip this step.
          </p>
        </div>

        {/* Document type selector */}
        <div className="flex gap-3">
          {DOC_TYPES.map((dt) => (
            <button
              key={dt.id}
              onClick={() => setScanType(dt.id)}
              className="flex flex-1 flex-col items-center gap-2 rounded-xl py-4 px-2 mk-transition"
              style={{
                backgroundColor: scanType === dt.id ? "var(--mk-primary)" : "var(--mk-card)",
                color: scanType === dt.id ? "var(--mk-primary-fg)" : "var(--mk-fg)",
                border: `2px solid ${scanType === dt.id ? "var(--mk-primary)" : "var(--mk-border)"}`,
                cursor: "pointer",
              }}
            >
              {dt.icon}
              <span style={{ fontSize: "0.78rem", fontFamily: "var(--font-display)", fontWeight: 600 }}>{dt.label}</span>
            </button>
          ))}
        </div>

        {/* Camera viewfinder */}
        <div
          className="relative rounded-2xl overflow-hidden flex items-center justify-center"
          style={{
            backgroundColor: "#111",
            aspectRatio: "4/3",
            border: "2.5px solid var(--mk-border-strong)",
          }}
        >
          {/* Simulated camera feed */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: "#1a1a1a" }}
          >
            {/* Corner guides */}
            {[
              { top: 20, left: 20, borderTop: true, borderLeft: true },
              { top: 20, right: 20, borderTop: true, borderRight: true },
              { bottom: 20, left: 20, borderBottom: true, borderLeft: true },
              { bottom: 20, right: 20, borderBottom: true, borderRight: true },
            ].map((corner, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: 36,
                  height: 36,
                  top: corner.top,
                  right: (corner as any).right,
                  bottom: corner.bottom,
                  left: corner.left,
                  borderTop: corner.borderTop ? "3px solid #3EC9A7" : undefined,
                  borderBottom: corner.borderBottom ? "3px solid #3EC9A7" : undefined,
                  borderLeft: corner.borderLeft ? "3px solid #3EC9A7" : undefined,
                  borderRight: (corner as any).borderRight ? "3px solid #3EC9A7" : undefined,
                }}
              />
            ))}

            {/* Scan line animation */}
            {scanState === "scanning" && (
              <div
                className="absolute left-0 right-0"
                style={{
                  height: 2,
                  backgroundColor: "#3EC9A7",
                  boxShadow: "0 0 12px #3EC9A7",
                  animation: "scanLine 1.5s ease-in-out infinite",
                  top: "50%",
                }}
              />
            )}

            {scanState === "captured" ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 64, height: 64, backgroundColor: "#1A6940" }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ color: "#4ADE80", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem" }}>
                  Captured!
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 text-center px-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="15" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  <circle cx="12" cy="14" r="3" />
                </svg>
                <span style={{ color: "#666", fontFamily: "var(--font-display)", fontSize: "0.9rem" }}>
                  {scanState === "scanning" ? "Scanning document…" : "Position document in frame"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Captured docs */}
        {capturedDocs.length > 0 && (
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
              Captured ({capturedDocs.length})
            </div>
            <div className="flex gap-3 flex-wrap">
              {capturedDocs.map((doc, i) => (
                <div
                  key={doc}
                  className="flex items-center gap-2 rounded-xl px-4 py-3"
                  style={{ backgroundColor: "var(--mk-success-bg)", border: "1.5px solid var(--mk-border)", color: "var(--mk-success)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", fontWeight: 600 }}>
                    Document {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Camera controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleCapture}
            disabled={scanState === "scanning"}
            className="flex-[2] flex items-center justify-center gap-3 rounded-2xl font-bold mk-transition"
            style={{
              minHeight: 68,
              backgroundColor: "var(--mk-primary)",
              color: "var(--mk-primary-fg)",
              fontFamily: "var(--font-display)",
              fontSize: "1.05rem",
              cursor: scanState === "scanning" ? "wait" : "pointer",
              border: "none",
              opacity: scanState === "scanning" ? 0.7 : 1,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="15" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              <circle cx="12" cy="14" r="3" />
            </svg>
            {scanState === "scanning" ? "Scanning…" : "Capture Document"}
          </button>

          {capturedDocs.length > 0 && (
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl font-semibold mk-transition"
              style={{
                minHeight: 68,
                backgroundColor: "var(--mk-accent)",
                color: "var(--mk-accent-fg)",
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                cursor: "pointer",
                border: "none",
              }}
            >
              Next
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="flex items-center justify-center gap-2 mk-transition"
          style={{
            minHeight: 52,
            color: "var(--mk-muted)",
            fontFamily: "var(--font-display)",
            fontSize: "0.9rem",
            cursor: "pointer",
            background: "none",
            border: "none",
            textDecoration: "underline",
            textDecorationColor: "var(--mk-border)",
          }}
        >
          Skip this step — I have no documents to scan
        </button>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: 20%; }
          50% { top: 80%; }
          100% { top: 20%; }
        }
      `}</style>
    </div>
  );
}
