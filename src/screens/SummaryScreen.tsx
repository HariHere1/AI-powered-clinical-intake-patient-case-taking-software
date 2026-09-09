import { useState } from "react";
import { useApp } from "../context/AppContext";

const MOCK_SUMMARY = {
  patient: {
    name: "Sunita Devi",
    age: "58 years",
    sex: "Female",
    mrn: "OPD-2024-04821",
    date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    language: "Hindi",
  },
  sections: [
    {
      id: "complaint",
      title: "Chief Complaint",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
        </svg>
      ),
      color: "#1A5F75",
      items: [
        { label: "Primary complaint", value: "Chest pain and difficulty breathing" },
        { label: "Location", value: "Chest" },
        { label: "Severity", value: "7–8 · Severe" },
        { label: "Duration", value: "About a week" },
      ],
      emergency: true,
    },
    {
      id: "history",
      title: "Medical History",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      color: "#2E7D60",
      items: [
        { label: "Known conditions", value: "Diabetes, Hypertension" },
        { label: "Current medications", value: "Taking regularly (details to be noted by physician)" },
        { label: "Previous hospitalisations", value: "Yes, within last year" },
      ],
      emergency: false,
    },
    {
      id: "family",
      title: "Family History",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: "#7B5EA7",
      items: [
        { label: "Family history", value: "Heart disease (father), Diabetes (mother)" },
      ],
      emergency: false,
    },
    {
      id: "review",
      title: "Review of Systems",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      color: "#B5601F",
      items: [
        { label: "Chest pain", value: "⚠ Yes — happening now", isAlert: true },
        { label: "Breathing difficulty", value: "⚠ Yes — right now", isAlert: true },
        { label: "Dizziness / fainting", value: "No" },
        { label: "Nausea / vomiting", value: "Mild nausea only" },
      ],
      emergency: true,
    },
    {
      id: "documents",
      title: "Uploaded Documents",
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <rect x="2" y="7" width="20" height="15" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      ),
      color: "#5E6E75",
      items: [
        { label: "Document 1", value: "Prescription (scanned)" },
      ],
      emergency: false,
    },
  ],
};

export default function SummaryScreen() {
  const { data, navigateTo } = useApp();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("complaint");

  function handleSubmit() {
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        className="flex flex-col flex-1 items-center justify-center gap-8 px-6 screen-enter mk-transition"
        style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 100, height: 100, backgroundColor: "var(--mk-success-bg)", border: "3px solid var(--mk-success)" }}
        >
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--mk-success)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <div className="text-center" style={{ maxWidth: 500 }}>
          <h1
            className="font-bold mb-3"
            style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", color: "var(--mk-fg)" }}
          >
            History submitted
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "1rem", color: "var(--mk-fg-secondary)", lineHeight: 1.6 }}>
            Your health information has been sent to the doctor. Please go to the waiting area and you will be called when the doctor is ready.
          </p>
          <p
            className="mt-4"
            style={{ fontFamily: "var(--font-body)", fontSize: "0.88rem", color: "var(--mk-muted)" }}
          >
            आपकी जानकारी डॉक्टर के पास भेज दी गई है। कृपया प्रतीक्षा कक्ष में जाएं।
          </p>
        </div>

        <div
          className="rounded-2xl px-6 py-4 text-center"
          style={{ backgroundColor: "var(--mk-card)", border: "1.5px solid var(--mk-border)", maxWidth: 360, width: "100%" }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--mk-muted)", fontFamily: "var(--font-display)", letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
            Reference number
          </div>
          <div
            className="font-bold mt-1"
            style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--mk-primary)" }}
          >
            {MOCK_SUMMARY.patient.mrn}
          </div>
        </div>

        <button
          onClick={() => navigateTo("language")}
          className="rounded-2xl font-semibold mk-transition flex items-center gap-2"
          style={{
            minHeight: 60,
            padding: "0 32px",
            backgroundColor: "var(--mk-sand)",
            color: "var(--mk-fg)",
            fontFamily: "var(--font-display)",
            fontSize: "1rem",
            cursor: "pointer",
            border: "2px solid var(--mk-border)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Start over for next patient
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden screen-enter mk-transition"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      {/* Sticky header */}
      <div
        className="px-6 py-4 shrink-0"
        style={{ borderBottom: "1.5px solid var(--mk-border)", backgroundColor: "var(--mk-card)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div
              style={{ fontSize: "0.68rem", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}
            >
              Clinical History Summary · {MOCK_SUMMARY.patient.date}
            </div>
            <h1
              className="font-bold"
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)", color: "var(--mk-fg)" }}
            >
              {MOCK_SUMMARY.patient.name}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {[MOCK_SUMMARY.patient.age, MOCK_SUMMARY.patient.sex, `MRN: ${MOCK_SUMMARY.patient.mrn}`].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-0.5"
                  style={{
                    backgroundColor: "var(--mk-sand)",
                    color: "var(--mk-fg-secondary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.78rem",
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 shrink-0"
            style={{ backgroundColor: "var(--mk-emergency-bg)", border: "1.5px solid var(--mk-emergency-border)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--mk-emergency)" stroke="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span style={{ fontSize: "0.72rem", color: "var(--mk-emergency)", fontFamily: "var(--font-display)", fontWeight: 700 }}>
              URGENT FLAGS
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-5 flex flex-col gap-3">
        {MOCK_SUMMARY.sections.map((sec) => {
          const isOpen = expandedSection === sec.id;
          return (
            <div
              key={sec.id}
              className="rounded-2xl overflow-hidden"
              style={{
                border: sec.emergency ? `2px solid ${sec.color}33` : "1.5px solid var(--mk-border)",
                backgroundColor: "var(--mk-card)",
              }}
            >
              {/* Section header (tap to expand) */}
              <button
                onClick={() => setExpandedSection(isOpen ? "" : sec.id)}
                className="flex items-center gap-3 w-full p-4 mk-transition"
                style={{
                  backgroundColor: isOpen ? `${sec.color}10` : "transparent",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: isOpen ? `1px solid var(--mk-border)` : "none",
                  textAlign: "left",
                }}
              >
                <div
                  className="flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, backgroundColor: `${sec.color}18`, color: sec.color }}
                >
                  {sec.icon}
                </div>
                <div className="flex-1">
                  <div
                    className="font-semibold"
                    style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--mk-fg)" }}
                  >
                    {sec.title}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--mk-muted)", fontFamily: "var(--font-body)" }}>
                    {sec.items.length} recorded {sec.items.length === 1 ? "item" : "items"}
                    {sec.emergency && (
                      <span style={{ color: "var(--mk-emergency)", marginLeft: 8, fontWeight: 700 }}>· Urgent flag</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingSection !== sec.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingSection(sec.id === editingSection ? null : sec.id); }}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 mk-transition"
                      style={{
                        fontSize: "0.75rem",
                        fontFamily: "var(--font-display)",
                        color: "var(--mk-muted)",
                        backgroundColor: "var(--mk-sand)",
                        border: "1px solid var(--mk-border)",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      Edit
                    </button>
                  )}
                  <svg
                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mk-muted)" strokeWidth="2.5"
                    style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {/* Section items */}
              {isOpen && (
                <div className="flex flex-col divide-y" style={{ borderColor: "var(--mk-border)" }}>
                  {sec.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 px-5 py-3.5"
                      style={{ borderTop: i > 0 ? "1px solid var(--mk-border)" : undefined }}
                    >
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--mk-muted)",
                          fontFamily: "var(--font-display)",
                          fontWeight: 500,
                          width: 160,
                          flexShrink: 0,
                          paddingTop: 2,
                        }}
                      >
                        {item.label}
                      </div>
                      {editingSection === sec.id ? (
                        <input
                          defaultValue={item.value.replace(/^⚠ /, "")}
                          className="flex-1 rounded-lg px-3 py-2 mk-transition"
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "0.9rem",
                            color: "var(--mk-fg)",
                            backgroundColor: "var(--mk-sand)",
                            border: "1.5px solid var(--mk-border-strong)",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <div
                          className="flex-1 font-medium"
                          style={{
                            fontFamily: "var(--font-body)",
                            fontSize: "0.92rem",
                            color: (item as any).isAlert ? "var(--mk-emergency)" : "var(--mk-fg)",
                            fontWeight: (item as any).isAlert ? 600 : 400,
                          }}
                        >
                          {item.value}
                        </div>
                      )}
                    </div>
                  ))}
                  {editingSection === sec.id && (
                    <div className="flex items-center gap-2 px-5 py-3">
                      <button
                        onClick={() => setEditingSection(null)}
                        className="flex-1 rounded-xl py-2.5 font-semibold mk-transition"
                        style={{
                          backgroundColor: "var(--mk-primary)",
                          color: "var(--mk-primary-fg)",
                          fontFamily: "var(--font-display)",
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          border: "none",
                        }}
                      >
                        Save changes
                      </button>
                      <button
                        onClick={() => setEditingSection(null)}
                        className="rounded-xl py-2.5 px-4 mk-transition"
                        style={{
                          backgroundColor: "var(--mk-sand)",
                          color: "var(--mk-muted)",
                          fontFamily: "var(--font-display)",
                          fontSize: "0.88rem",
                          cursor: "pointer",
                          border: "1.5px solid var(--mk-border)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit bar */}
      <div
        className="shrink-0 px-6 py-4 flex items-center gap-3"
        style={{ borderTop: "1.5px solid var(--mk-border)", backgroundColor: "var(--mk-card)" }}
      >
        <button
          onClick={() => navigateTo("converse")}
          className="flex items-center justify-center gap-2 rounded-2xl font-semibold mk-transition"
          style={{
            minHeight: 64,
            padding: "0 24px",
            backgroundColor: "var(--mk-sand)",
            color: "var(--mk-fg-secondary)",
            fontFamily: "var(--font-display)",
            fontSize: "0.95rem",
            cursor: "pointer",
            border: "2px solid var(--mk-border)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <button
          onClick={handleSubmit}
          className="flex-1 flex items-center justify-center gap-3 rounded-2xl font-bold mk-transition"
          style={{
            minHeight: 64,
            backgroundColor: "var(--mk-primary)",
            color: "var(--mk-primary-fg)",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1rem, 2vw, 1.1rem)",
            cursor: "pointer",
            border: "none",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-primary-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--mk-primary)"; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Confirm &amp; Submit to Doctor
        </button>
      </div>
    </div>
  );
}
