import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../context/AppContext";
import { buildDoctorQueue, sortQueue } from "../../services/doctorService";

// FR-DOC-03..06: sorted awaiting-review queue, urgent first.
export default function DoctorQueueScreen() {
  const { data, navigateTo, selectDoctorSession, reviewedIds, logoutDoctor, doctorId } = useApp();
  const [refreshTick, setRefreshTick] = useState(0);
  const [query, setQuery] = useState("");

  // FR-DOC-05: 15s poll + manual refresh.
  useEffect(() => {
    const t = setInterval(() => setRefreshTick((v) => v + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const queue = useMemo(() => {
    void refreshTick;
    const all = buildDoctorQueue(data);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? all.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.mrn.toLowerCase().includes(q) ||
            s.chief_complaint.toLowerCase().includes(q),
        )
      : all;
    return sortQueue(filtered, reviewedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, reviewedIds, refreshTick, query]);

  const urgentCount = queue.filter((s) => s.emergency_flag).length;

  function openSession(id: string) {
    selectDoctorSession(id);
    navigateTo("doctor-detail");
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden screen-enter"
      style={{ backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)" }}
    >
      <div
        className="px-6 py-4 shrink-0 flex items-center justify-between gap-3 flex-wrap"
        style={{ borderBottom: "1.5px solid var(--mk-border)", backgroundColor: "var(--mk-card)" }}
      >
        <div>
          <div
            style={{ fontSize: "0.68rem", color: "var(--mk-muted)", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}
          >
            Doctor workspace {doctorId ? `· ${doctorId}` : ""} · Demo data
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", fontWeight: 800 }}>
            Awaiting review ({queue.length})
          </h1>
          <div style={{ fontSize: "0.82rem", color: "var(--mk-muted)", fontFamily: "var(--font-body)" }}>
            {urgentCount} urgent · {queue.length - urgentCount} routine · auto-refresh 15s
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / MRN"
            aria-label="Search queue"
            className="rounded-xl px-3"
            style={{ height: 44, minWidth: 200, backgroundColor: "var(--mk-bg)", color: "var(--mk-fg)", border: "1.5px solid var(--mk-border)", outline: "none", fontSize: "0.9rem" }}
          />
          <button
            onClick={() => setRefreshTick((t) => t + 1)}
            className="rounded-xl px-4"
            style={{ height: 44, backgroundColor: "var(--mk-sand)", border: "1.5px solid var(--mk-border)", cursor: "pointer", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.85rem" }}
          >
            Refresh
          </button>
          <button
            onClick={logoutDoctor}
            className="rounded-xl px-4"
            style={{ height: 44, backgroundColor: "transparent", border: "1.5px solid var(--mk-border)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: "0.85rem", color: "var(--mk-muted)" }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 flex flex-col gap-3" style={{ maxWidth: 860, width: "100%", margin: "0 auto" }}>
        {queue.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: "var(--mk-card)", border: "1.5px solid var(--mk-border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem" }}>No patients awaiting review</div>
            <div style={{ color: "var(--mk-muted)", fontSize: "0.88rem", marginTop: 6 }}>New kiosk check-ins will appear here.</div>
          </div>
        )}
        {queue.map((s) => (
          <button
            key={s.id}
            onClick={() => openSession(s.id)}
            className="rounded-2xl p-4 text-left mk-transition w-full"
            style={{
              backgroundColor: "var(--mk-card)",
              border: s.emergency_flag ? "2px solid var(--mk-emergency)" : "1.5px solid var(--mk-border)",
              cursor: "pointer",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1" style={{ minWidth: 0 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>{s.name}</span>
                  {s.emergency_flag && (
                    <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: "var(--mk-emergency-bg)", border: "1px solid var(--mk-emergency-border)", color: "var(--mk-emergency)", fontSize: "0.7rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>
                      URGENT
                    </span>
                  )}
                  {!s.consent_given && (
                    <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: "var(--mk-warn-bg)", border: "1px solid var(--mk-warn-border)", color: "var(--mk-warn)", fontSize: "0.7rem", fontWeight: 700 }}>
                      NO CONSENT
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--mk-muted)", fontFamily: "var(--font-body)", marginTop: 2 }}>
                  {s.age} · {s.sex} · MRN {s.mrn} · {s.language_english} · {s.waitMins}m wait · {s.documents.length} docs
                </div>
                <div style={{ fontSize: "0.9rem", marginTop: 6, fontFamily: "var(--font-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.chief_complaint}
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mk-muted)" strokeWidth="2.5" className="shrink-0" style={{ marginTop: 4 }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
