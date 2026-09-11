import { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";

type PatientMode = "home" | "abha" | "otp" | "walkin-confirm";
// ─── Helpers ────────────────────────────────────────────────────────────────

function maskId(id: string) {
  if (id.length <= 4) return id;
  return "·".repeat(id.length - 4) + id.slice(-4);
}

// ─── OTP digit strip ────────────────────────────────────────────────────────

function OtpInput({ onComplete }: { onComplete: (otp: string) => void }) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(i: number, val: string) {
    const ch = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = ch;
    setDigits(next);
    if (ch && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="rounded-xl text-center font-bold mk-transition"
          style={{
            width: 52,
            height: 64,
            fontSize: "1.5rem",
            backgroundColor: d ? "var(--mk-primary)" : "var(--mk-card)",
            color: d ? "var(--mk-primary-fg)" : "var(--mk-fg)",
            border: `2px solid ${d ? "var(--mk-primary)" : "var(--mk-border-strong)"}`,
            outline: "none",
            fontFamily: "var(--font-display)",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--mk-primary)"; }}
          onBlur={(e) => { if (!e.currentTarget.value) e.currentTarget.style.borderColor = "var(--mk-border-strong)"; }}
        />
      ))}
    </div>
  );
}

// ─── Patient side ────────────────────────────────────────────────────────────

function PatientPanel({ onCheckedIn }: { onCheckedIn: () => void }) {
  const [mode, setMode] = useState<PatientMode>("home");
  const [inputVal, setInputVal] = useState("");
  const [inputType, setInputType] = useState<"abha" | "aadhaar">("abha");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startResendTimer() {
    setResendTimer(30);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  function handleSendOtp() {
    if (inputVal.length < 10) return;
    setOtpSent(true);
    setMode("otp");
    startResendTimer();
  }

  function handleOtpComplete(otp: string) {
    // Simulate verification
    setTimeout(() => {
      setOtpVerified(true);
      setTimeout(onCheckedIn, 600);
    }, 800);
  }

  function handleResend() {
    setResendCount((c) => c + 1);
    startResendTimer();
  }

  if (mode === "walkin-confirm") {
    return (
      <div className="flex flex-col items-center gap-6 py-4 screen-enter">
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 72, height: 72, backgroundColor: "var(--mk-success-bg)", border: "2.5px solid var(--mk-success)" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--mk-success)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="text-center">
          <div
            className="font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", color: "var(--mk-fg)" }}
          >
            Welcome, new patient!
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--mk-muted)" }}>
            We'll collect your details as part of registration.
          </div>
        </div>
        <button
          onClick={onCheckedIn}
          className="w-full flex items-center justify-center gap-3 rounded-2xl font-bold mk-transition"
          style={{
            minHeight: 68,
            backgroundColor: "var(--mk-primary)",
            color: "var(--mk-primary-fg)",
            fontFamily: "var(--font-display)",
            fontSize: "1.05rem",
            cursor: "pointer",
            border: "none",
          }}
        >
          Begin registration
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
        <button
          onClick={() => setMode("home")}
          style={{ background: "none", border: "none", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontSize: "0.85rem", cursor: "pointer", textDecoration: "underline" }}
        >
          ← Back
        </button>
      </div>
    );
  }

  if (mode === "otp") {
    return (
      <div className="flex flex-col gap-5 screen-enter">
        {/* Back + heading */}
        <div>
          <button
            onClick={() => setMode("abha")}
            className="flex items-center gap-1 mb-3 mk-transition"
            style={{ background: "none", border: "none", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontSize: "0.82rem", cursor: "pointer", padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div
            className="font-bold"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--mk-fg)" }}
          >
            Enter the OTP
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--mk-muted)", marginTop: 4 }}>
            Sent to the mobile number linked with{" "}
            <strong style={{ color: "var(--mk-fg)" }}>
              {inputType === "abha" ? "ABHA" : "Aadhaar"} ···{inputVal.slice(-4)}
            </strong>
          </div>
        </div>

        {/* OTP digits */}
        {otpVerified ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 52, height: 52, backgroundColor: "var(--mk-success-bg)", border: "2px solid var(--mk-success)" }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--mk-success)" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--mk-success)", fontSize: "1rem" }}>
              Verified — checking you in…
            </span>
          </div>
        ) : (
          <OtpInput onComplete={handleOtpComplete} />
        )}

        {/* Resend */}
        {!otpVerified && (
          <div className="flex items-center justify-center gap-2">
            <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--mk-muted)" }}>
              Didn't receive it?
            </span>
            {resendTimer > 0 ? (
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.82rem", color: "var(--mk-muted)" }}>
                Resend in {resendTimer}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                style={{ background: "none", border: "none", color: "var(--mk-primary)", fontFamily: "var(--font-display)", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Resend OTP
              </button>
            )}
          </div>
        )}

        {/* Staff assist note */}
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-2"
          style={{ backgroundColor: "var(--mk-sand)", border: "1px solid var(--mk-border)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--mk-muted)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
          </svg>
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--mk-muted)" }}>
            No mobile number registered? Ask a staff member to check you in.
          </span>
        </div>
      </div>
    );
  }

  if (mode === "abha") {
    return (
      <div className="flex flex-col gap-5 screen-enter">
        <div>
          <button
            onClick={() => setMode("home")}
            className="flex items-center gap-1 mb-3"
            style={{ background: "none", border: "none", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontSize: "0.82rem", cursor: "pointer", padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <div
            className="font-bold mb-1"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem", color: "var(--mk-fg)" }}
          >
            Enter your ID to check in
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--mk-muted)" }}>
            We'll send an OTP to your registered mobile number.
          </div>
        </div>

        {/* Toggle ABHA / Aadhaar */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)" }}
        >
          {(["abha", "aadhaar"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setInputType(t); setInputVal(""); }}
              className="flex-1 rounded-lg py-2.5 font-semibold mk-transition"
              style={{
                backgroundColor: inputType === t ? "var(--mk-card)" : "transparent",
                color: inputType === t ? "var(--mk-primary)" : "var(--mk-muted)",
                fontFamily: "var(--font-display)",
                fontSize: "0.85rem",
                cursor: "pointer",
                border: inputType === t ? "1.5px solid var(--mk-border)" : "1.5px solid transparent",
                boxShadow: inputType === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t === "abha" ? "ABHA ID / Number" : "Aadhaar Number"}
            </button>
          ))}
        </div>

        {/* ID input */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="id-input"
            style={{ fontFamily: "var(--font-display)", fontSize: "0.78rem", color: "var(--mk-muted)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            {inputType === "abha" ? "ABHA ID or 14-digit Health ID" : "12-digit Aadhaar Number"}
          </label>
          <input
            id="id-input"
            type="text"
            inputMode="numeric"
            placeholder={inputType === "abha" ? "e.g. 91-XXXX-XXXX-XXXX" : "XXXX XXXX XXXX"}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value.replace(/[^0-9\-]/g, ""))}
            maxLength={inputType === "abha" ? 17 : 14}
            className="rounded-xl px-4 mk-transition"
            style={{
              height: 64,
              fontFamily: "var(--font-display)",
              fontSize: "1.15rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              backgroundColor: "var(--mk-card)",
              color: "var(--mk-fg)",
              border: "2px solid var(--mk-border-strong)",
              outline: "none",
              width: "100%",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--mk-primary)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--mk-border-strong)"; }}
          />
          {inputType === "aadhaar" && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ backgroundColor: "var(--mk-warn-bg)", border: "1px solid var(--mk-warn-border)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--mk-warn)" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span style={{ fontSize: "0.72rem", color: "var(--mk-warn)", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                Only last 4 digits are stored. Your Aadhaar is never saved in full.
              </span>
            </div>
          )}
        </div>

        <button
          onClick={handleSendOtp}
          disabled={inputVal.length < 10}
          className="w-full flex items-center justify-center gap-3 rounded-2xl font-bold mk-transition"
          style={{
            minHeight: 68,
            backgroundColor: inputVal.length >= 10 ? "var(--mk-primary)" : "var(--mk-sand)",
            color: inputVal.length >= 10 ? "var(--mk-primary-fg)" : "var(--mk-muted)",
            fontFamily: "var(--font-display)",
            fontSize: "1.05rem",
            cursor: inputVal.length >= 10 ? "pointer" : "not-allowed",
            border: "none",
            opacity: inputVal.length >= 10 ? 1 : 0.7,
          }}
        >
          Send OTP
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    );
  }

  // mode === "home"
  return (
    <div className="flex flex-col gap-4 screen-enter">
      {/* ABHA / Aadhaar check-in */}
      <button
        onClick={() => setMode("abha")}
        className="w-full flex items-center gap-5 rounded-2xl mk-transition"
        style={{
          minHeight: 92,
          padding: "20px 24px",
          backgroundColor: "var(--mk-primary)",
          color: "var(--mk-primary-fg)",
          border: "2px solid transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-primary-hover)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-primary)"; }}
      >
        {/* ABHA card icon */}
        <div
          className="rounded-xl flex items-center justify-center shrink-0"
          style={{ width: 52, height: 52, backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="2" y="5" width="20" height="14" rx="2.5" />
            <circle cx="8" cy="11" r="2" fill="currentColor" stroke="none" />
            <line x1="13" y1="9" x2="19" y2="9" /><line x1="13" y1="12" x2="17" y2="12" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
            Check in with ABHA or Aadhaar
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", opacity: 0.8 }}>
            Existing patient · OTP verification
          </div>
        </div>
        <svg
          className="ml-auto shrink-0"
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1" style={{ height: 1, backgroundColor: "var(--mk-border)" }} />
        <span style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", color: "var(--mk-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          or
        </span>
        <div className="flex-1" style={{ height: 1, backgroundColor: "var(--mk-border)" }} />
      </div>

      {/* Walk-in */}
      <button
        onClick={() => setMode("walkin-confirm")}
        className="w-full flex items-center gap-5 rounded-2xl mk-transition"
        style={{
          minHeight: 92,
          padding: "20px 24px",
          backgroundColor: "var(--mk-card)",
          color: "var(--mk-fg)",
          border: "2.5px dashed var(--mk-border-strong)",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mk-accent)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-sand)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--mk-border-strong)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-card)";
        }}
      >
        <div
          className="rounded-xl flex items-center justify-center shrink-0"
          style={{ width: 52, height: 52, backgroundColor: "var(--mk-sand)" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--mk-accent)" strokeWidth="1.8" strokeLinecap="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="font-bold" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--mk-fg)" }}>
            New patient / Walk-in
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--mk-muted)" }}>
            First visit · No ID required
          </div>
        </div>
        <svg
          className="ml-auto shrink-0"
          width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mk-muted)" strokeWidth="2.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}

// ─── Staff login panel ───────────────────────────────────────────────────────

export function StaffPanel({ dedicated = false }: { dedicated?: boolean }) {
  const { navigateTo } = useApp();
  const [open, setOpen] = useState(dedicated);
  const [staffId, setStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    if (!staffId || !password) { setError("Please fill in both fields."); return; }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // In production: real auth. For demo, any input proceeds.
      setError("Invalid credentials. Please try again or contact admin.");
    }, 1200);
  }

  if (!open && !dedicated) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 mk-transition"
        style={{
          background: "none",
          border: "none",
          color: "var(--mk-muted)",
          fontFamily: "var(--font-display)",
          fontSize: "0.8rem",
          fontWeight: 500,
          cursor: "pointer",
          padding: "8px 12px",
          borderRadius: 8,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--mk-fg)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--mk-muted)"; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Staff / Physician login
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 screen-enter"
      style={{
        backgroundColor: "var(--mk-card)",
        border: "1.5px solid var(--mk-border-strong)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--mk-muted)" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span
            style={{ fontFamily: "var(--font-display)", fontSize: "0.85rem", fontWeight: 700, color: "var(--mk-fg-secondary)", letterSpacing: "0.04em", textTransform: "uppercase" }}
          >
            Staff Login
          </span>
        </div>
        <button
          onClick={() => {
            if (dedicated) {
              navigateTo("entry");
            } else {
              setOpen(false);
              setError("");
              setStaffId("");
              setPassword("");
            }
          }}
          aria-label={dedicated ? "Back to patient check-in" : "Close staff login"}
          style={{ background: "none", border: "none", color: "var(--mk-muted)", cursor: "pointer", padding: 4 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label style={{ fontFamily: "var(--font-display)", fontSize: "0.72rem", color: "var(--mk-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Staff / Employee ID
          </label>
          <input
            type="text"
            placeholder="e.g. DOC-2047"
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="rounded-xl px-4 mk-transition"
            style={{
              height: 52,
              fontFamily: "var(--font-display)",
              fontSize: "0.95rem",
              backgroundColor: "var(--mk-bg)",
              color: "var(--mk-fg)",
              border: "1.5px solid var(--mk-border-strong)",
              outline: "none",
              width: "100%",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--mk-primary)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "var(--mk-border-strong)"; }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label style={{ fontFamily: "var(--font-display)", fontSize: "0.72rem", color: "var(--mk-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
              className="rounded-xl px-4 mk-transition"
              style={{
                height: 52,
                fontFamily: "var(--font-display)",
                fontSize: "0.95rem",
                backgroundColor: "var(--mk-bg)",
                color: "var(--mk-fg)",
                border: "1.5px solid var(--mk-border-strong)",
                outline: "none",
                width: "100%",
                paddingRight: 48,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--mk-primary)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--mk-border-strong)"; }}
            />
            <button
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "var(--mk-muted)", cursor: "pointer", padding: 0,
              }}
            >
              {showPw ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            className="rounded-lg px-3 py-2.5 flex items-center gap-2"
            style={{ backgroundColor: "var(--mk-emergency-bg)", border: "1px solid var(--mk-emergency-border)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="var(--mk-emergency)" stroke="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span style={{ fontSize: "0.78rem", color: "var(--mk-emergency)", fontFamily: "var(--font-body)" }}>{error}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl font-semibold mk-transition"
        style={{
          height: 52,
          backgroundColor: "var(--mk-fg)",
          color: "var(--mk-bg)",
          fontFamily: "var(--font-display)",
          fontSize: "0.92rem",
          cursor: loading ? "wait" : "pointer",
          border: "none",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Verifying…
          </>
        ) : (
          <>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Sign in
          </>
        )}
      </button>

      <div style={{ fontSize: "0.72rem", color: "var(--mk-muted)", fontFamily: "var(--font-body)", textAlign: "center" }}>
        Forgot password? Contact your system administrator.
      </div>
    </div>
  );
}

// ─── Main entry screen ───────────────────────────────────────────────────────

export default function EntryScreen() {
  const { navigateTo } = useApp();

  return (
    <div
      className="flex flex-1 overflow-hidden screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      {/* Left: decorative / branding column */}
      <div
        className="hidden md:flex flex-col justify-between p-10 shrink-0"
        style={{
          width: 340,
          background: "linear-gradient(160deg, #1A5F75 0%, #0F3D4F 100%)",
          color: "white",
        }}
      >
        {/* Top */}
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div
              className="rounded-xl flex items-center justify-center"
              style={{ width: 44, height: 44, backgroundColor: "rgba(255,255,255,0.15)" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", letterSpacing: "-0.01em" }}>
              MediKiosk
            </span>
          </div>

          <div
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2rem)", fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}
          >
            Good morning.<br />Welcome to<br />OPD check-in.
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", opacity: 0.7, lineHeight: 1.6 }}>
            This kiosk helps you share your health history with the doctor before your consultation.
          </div>
        </div>

        {/* Decorative steps */}
        <div className="flex flex-col gap-4">
          {[
            { n: "1", label: "Check in" },
            { n: "2", label: "Answer a few health questions" },
            { n: "3", label: "Doctor reviews your history" },
          ].map((step) => (
            <div key={step.n} className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-full shrink-0 font-bold"
                style={{ width: 28, height: 28, backgroundColor: "rgba(255,255,255,0.15)", fontSize: "0.8rem", fontFamily: "var(--font-display)" }}
              >
                {step.n}
              </div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", opacity: 0.85 }}>{step.label}</span>
            </div>
          ))}

          <div style={{ fontSize: "0.7rem", opacity: 0.4, fontFamily: "var(--font-body)", marginTop: 8 }}>
            सुप्रभात · காலை வணக்கம் · శుభోదయం
          </div>
        </div>
      </div>

      {/* Right: form column */}
      <div
        className="flex flex-col flex-1 overflow-y-auto scrollbar-hide"
        style={{ minWidth: 0 }}
      >
        <div
          className="flex flex-col mx-auto w-full px-6 py-8"
          style={{ maxWidth: 480, gap: "1.5rem" }}
        >
          {/* Mobile-only brand */}
          <div className="flex md:hidden items-center gap-2 mb-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mk-primary)" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: "var(--mk-primary)" }}>
              MediKiosk
            </span>
          </div>

          {/* Heading */}
          <div>
            <h1
              className="font-bold"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 1.9rem)", color: "var(--mk-fg)", lineHeight: 1.2 }}
            >
              Check in for your visit
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.92rem", color: "var(--mk-muted)", marginTop: 6, lineHeight: 1.5 }}>
              Choose how you'd like to continue. If you're unsure, tap{" "}
              <strong style={{ color: "var(--mk-fg)" }}>New patient</strong>.
            </p>
          </div>

          {/* Patient panel */}
          <PatientPanel onCheckedIn={() => navigateTo("language")} />

          {/* Separator */}
          <div style={{ height: 1, backgroundColor: "var(--mk-border)" }} />

          {/* Staff login — visually subdued, below the fold of attention */}
          <div className="flex flex-col items-start gap-2">
            <button
              onClick={() => navigateTo("staff")}
              className="flex items-center gap-2 mk-transition"
              style={{
                background: "none",
                border: "none",
                color: "var(--mk-muted)",
                fontFamily: "var(--font-display)",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Staff / Physician login
            </button>
          </div>

          {/* Footer */}
          <div
            className="text-center"
            style={{ fontSize: "0.7rem", color: "var(--mk-muted)", fontFamily: "var(--font-body)", opacity: 0.7, lineHeight: 1.7 }}
          >
            This kiosk is operated by the hospital. Your data is protected under Indian health privacy law.
            <br />
            Need assistance? Please ask the reception desk.
          </div>
        </div>
      </div>
    </div>
  );
}
