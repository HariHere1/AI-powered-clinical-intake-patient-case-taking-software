import { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { buildDoctorQueue, logAudit, sectionLabel } from "../../services/doctorService";

// FR-DOC-07..12: physician review of real kiosk responses (never MOCK_SUMMARY).
export default function DoctorDetailScreen() {
  const {
    data,
    navigateTo,
    selectedSessionId,
    selectDoctorSession,
    markSessionReviewed,
    physicianEdits,
    savePhysicianEdit,
    doctorId,
    reviewedIds,
  } = useApp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [done, setDone] = useState(false);

  const session = useMemo(() => {
    const all = buildDoctorQueue(data);
    return all.find((s) => s.id === selectedSessionId) ?? null;
  }, [data, selectedSessionId]);

  const savedEdit = session ? physicianEdits[session.id] : undefined;
  const alreadyReviewed = session ? reviewedIds.includes(session.id) : false;

  if (!session) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6" style={{ backgroundColor: "var(--mk-bg)" }}>
        <p style={{ fontFamily: "var(--font-body)", color: "var(--mk-muted)" }}>No session selected.</p>
        <button
          onClick={() => navigateTo("doctor-queue")}
          className="rounded-xl px-5 py-3"
          style={{ backgroundColor: "var(--mk-primary)", color: "var(--mk-primary-fg)", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Back to queue
        </button>
      </div>
    );
  }

  if (done || alreadyReviewed) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 px-6 text-center" style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}>
        <div className="rounded-full flex items-center justify-center" style={{ width: 72, height: 72, backgroundColor: "var(--mk-success-bg)", border: "2.5px solid var(--mk-success)" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--mk-success)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.5rem" }}>Reviewed — called next</h1>
        <p style={{ color: "var(--mk-muted)", maxWidth: 440 }}>{session.mrn} marked submitted. Audit logged{savedEdit ? " with physician edits" : ""}.</p>
        <button
          onClick={() => { selectDoctorSession(null); navigateTo("doctor-queue"); }}
          className="rounded-2xl px-8"
          style={{ minHeight: 56, backgroundColor: "var(--mk-primary)", color: "var(--mk-primary-fg)", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 700 }}
        >
          Back to queue
        </button>
      </div>
    );
  }

  const grouped = new Map<string, typeof session.responses>();
  for (const r of session.responses) {
    const list = grouped.get(r.section) ?? [];
    list.push(r);
    grouped.set(r.section, list);
  }

  function handleReview() {
    if (!session || !session.consent_given) return;
    logAudit("session_reviewed", session.id, { doctorId, edited: !!savedEdit });
    markSessionReviewed(session.id);
    setDone(true);
  }

  function handleSaveEdit() {
    if (!session) return;
    savePhysicianEdit(session.id, draft.trim());
    logAudit("summary_edited", session.id, { doctorId, chars: draft.trim().length });
    setEditing(false);
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden screen-enter" style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}>
      <div className="px-6 py-4 shrink-0" style={{ borderBottom: "1.5px solid var(--mk-border)", backgroundColor: "var(--mk-card)" }}>
        <button
          onClick={() => { selectDoctorSession(null); navigateTo("doctor-queue"); }}
          style={{ background: "none", border: "none", color: "var(--mk-muted)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "0.85rem", padding: 0, marginBottom: 10 }}
        >
          ← Back to queue
        </button>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div style={{ fontSize: "0.68rem", color: "var(--mk-muted)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              {session.mrn} · {session.age} · {session.sex} · {session.language_english} · {session.waitMins}m wait
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.4rem" }}>{session.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="rounded-full px-3 py-0.5" style={{ backgroundColor: session.consent_given ? "var(--mk-success-bg)" : "var(--mk-warn-bg)", border: "1px solid var(--mk-border)", fontSize: "0.75rem", fontFamily: "var(--font-body)" }}>
                Consent {session.consent_given ? `✓ ${session.consent_version} · ${new Date(session.consent_granted_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "✕ not confirmed"}
              </span>
              <span className="rounded-full px-3 py-0.5" style={{ backgroundColor: "var(--mk-sand)", fontSize: "0.75rem" }}>
                Summary: {session.summary_language.toUpperCase()}
              </span>
              {savedEdit && (
                <span className="rounded-full px-3 py-0.5" style={{ backgroundColor: "var(--mk-sand)", border: "1px solid var(--mk-border-strong)", fontSize: "0.75rem", fontWeight: 700 }}>
                  Physician-edited
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="rounded-xl px-4" style={{ height: 44, backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
              Print
            </button>
          </div>
        </div>
      </div>

      {session.emergency_flag && (
        <div className="mx-6 mt-4 rounded-2xl p-4 emergency-border" style={{ backgroundColor: "var(--mk-emergency-bg)", border: "2.5px solid var(--mk-emergency)" }}>
          <strong style={{ color: "var(--mk-emergency)", fontFamily: "var(--font-display)" }}>URGENT — red-flag symptom.</strong>
          <div style={{ fontSize: "0.9rem" }}>Triage first. Banner cannot be dismissed without review action.</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 flex flex-col gap-3" style={{ maxWidth: 860, width: "100%", margin: "0 auto" }}>
        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--mk-card)", border: "1.5px solid var(--mk-border)" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--mk-muted)", fontFamily: "var(--font-display)", marginBottom: 8 }}>
            Physician summary (EN)
          </div>
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                className="rounded-xl p-3"
                style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)", border: "1.5px solid var(--mk-border-strong)", outline: "none", fontFamily: "var(--font-body)", fontSize: "0.92rem", width: "100%" }}
              />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={!draft.trim()} className="flex-1 rounded-xl py-2.5" style={{ backgroundColor: "var(--mk-primary)", color: "var(--mk-primary-fg)", border: "none", cursor: draft.trim() ? "pointer" : "not-allowed", opacity: draft.trim() ? 1 : 0.6, fontWeight: 700 }}>
                  Save changes
                </button>
                <button onClick={() => setEditing(false)} className="rounded-xl px-4 py-2.5" style={{ backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", lineHeight: 1.6 }}>{savedEdit ?? session.summary_text}</p>
              <button
                onClick={() => { setDraft(savedEdit ?? session.summary_text); setEditing(true); }}
                className="mt-3 rounded-lg px-3 py-2"
                style={{ backgroundColor: "var(--mk-sand)", border: "1px solid var(--mk-border)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
              >
                Edit summary
              </button>
            </>
          )}
        </div>

        {[...grouped.entries()].map(([section, items]) => (
          <div key={section} className="rounded-2xl overflow-hidden" style={{ backgroundColor: "var(--mk-card)", border: "1.5px solid var(--mk-border)" }}>
            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--mk-border)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem" }}>
              {sectionLabel(section)} · {items.length}
            </div>
            {items.map((r) => (
              <div key={r.sequence_no} className="px-5 py-3" style={{ borderTop: "1px solid var(--mk-border)" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--mk-muted)" }}>Q{r.sequence_no}: {r.question_text}</div>
                <div style={{ fontSize: "0.95rem", fontWeight: r.is_red_flag ? 700 : 400, color: r.is_red_flag ? "var(--mk-emergency)" : "var(--mk-fg)", marginTop: 2 }}>
                  {r.is_red_flag ? "⚠ " : ""}{r.response_text}
                </div>
                <details style={{ fontSize: "0.78rem", color: "var(--mk-muted)", marginTop: 4 }}>
                  <summary style={{ cursor: "pointer" }}>Original [{r.language_code}]</summary>
                  <div style={{ marginTop: 4 }}>{r.response_text} · seq {r.sequence_no}</div>
                </details>
              </div>
            ))}
          </div>
        ))}

        <div className="rounded-2xl p-5" style={{ backgroundColor: "var(--mk-card)", border: "1.5px solid var(--mk-border)" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--mk-muted)", fontFamily: "var(--font-display)", marginBottom: 8 }}>
            Documents ({session.documents.length})
          </div>
          {session.documents.length === 0 ? (
            <div style={{ color: "var(--mk-muted)", fontSize: "0.88rem" }}>No documents uploaded.</div>
          ) : (
            session.documents.map((d) => (
              <div key={d.id} className="rounded-xl px-3 py-2.5 flex items-center justify-between" style={{ backgroundColor: "var(--mk-sand)", border: "1px solid var(--mk-border)", marginBottom: 8 }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{d.doc_type} · {d.id}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--mk-muted)" }}>OCR: {d.ocr_status}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 flex items-center gap-3" style={{ borderTop: "1.5px solid var(--mk-border)", backgroundColor: "var(--mk-card)" }}>
        {!session.consent_given && (
          <span style={{ fontSize: "0.82rem", color: "var(--mk-warn)", fontWeight: 600 }}>Awaiting consent — actions disabled.</span>
        )}
        <button
          onClick={handleReview}
          disabled={!session.consent_given}
          className="flex-1 rounded-2xl flex items-center justify-center gap-2"
          style={{ minHeight: 60, backgroundColor: session.consent_given ? "var(--mk-primary)" : "var(--mk-sand)", color: session.consent_given ? "var(--mk-primary-fg)" : "var(--mk-muted)", border: "none", cursor: session.consent_given ? "pointer" : "not-allowed", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem" }}
        >
          ✓ Mark Reviewed & Call Next
        </button>
      </div>
    </div>
  );
}
