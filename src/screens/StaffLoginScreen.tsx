import { StaffPanel } from "./EntryScreen";
import { useApp } from "../context/AppContext";

export default function StaffLoginScreen() {
  const { navigateTo } = useApp();

  return (
    <div
      className="flex flex-1 overflow-y-auto scrollbar-hide screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      <div className="flex flex-col w-full max-w-xl mx-auto px-6 py-8">
        <button
          onClick={() => navigateTo("entry")}
          className="flex items-center gap-1 self-start mb-8 mk-transition"
          style={{
            background: "none",
            border: "none",
            color: "var(--mk-muted)",
            fontFamily: "var(--font-display)",
            fontSize: "0.85rem",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to patient check-in
        </button>

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl flex items-center justify-center"
              style={{ width: 48, height: 48, backgroundColor: "var(--mk-sand)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--mk-primary)" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h1
                className="font-bold"
                style={{ fontFamily: "var(--font-display)", fontSize: "1.7rem", color: "var(--mk-fg)", lineHeight: 1.2 }}
              >
                Staff sign in
              </h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--mk-muted)", marginTop: 4 }}>
                Access the clinical kiosk workspace.
              </p>
            </div>
          </div>
        </div>

        <StaffPanel dedicated />
      </div>
    </div>
  );
}