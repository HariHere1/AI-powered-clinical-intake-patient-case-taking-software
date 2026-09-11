"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface ReportContent {
  chiefComplaint: string;
  hpi: string;
  pastMedical: string;
  drugAllergy: string;
  family: string;
  personal: string;
  ros: string;
  priorInvestigations: string;
}

interface KeyRow {
  keyId: string;
  code: string;
  isActive: boolean;
}

const SECTION_KEYS: (keyof ReportContent)[] = [
  "chiefComplaint",
  "hpi",
  "pastMedical",
  "drugAllergy",
  "family",
  "personal",
  "ros",
  "priorInvestigations",
];

export default function PatientReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const t = useTranslations("report");
  const tc = useTranslations("common");

  const [content, setContent] = useState<ReportContent | null>(null);
  const [doctorEmail, setDoctorEmail] = useState("");
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/reports/${reportId}`)
      .then((res) => res.json())
      .then((data) => setContent(data.content))
      .catch(() => setError(tc("error")));
  }, [reportId, tc]);

  async function createKey() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, doctorEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setKeys((prev) => [...prev, { keyId: data.keyId, code: data.code, isActive: data.isActive }]);
      setDoctorEmail("");
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleKey(keyId: string, activate: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys/${keyId}/${activate ? "activate" : "deactivate"}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setKeys((prev) => prev.map((k) => (k.keyId === keyId ? { ...k, isActive: data.isActive } : k)));
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

        {content && (
          <div className="mb-8 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
            {SECTION_KEYS.map((key) => (
              <div key={key}>
                <h2 className="text-sm font-semibold text-slate-500">{t(key)}</h2>
                <p className="whitespace-pre-wrap text-slate-800">{content[key] || "—"}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">{t("shareWithDoctor")}</h2>
          <div className="mb-4 flex gap-2">
            <input
              type="email"
              placeholder="doctor@hospital.org"
              value={doctorEmail}
              onChange={(e) => setDoctorEmail(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
            />
            <button
              disabled={loading || !doctorEmail}
              onClick={createKey}
              className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {t("generateKey")}
            </button>
          </div>

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <ul className="flex flex-col gap-2">
            {keys.map((k) => (
              <li
                key={k.keyId}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  {t("keyLabel")}: <code className="font-mono">{k.code}</code> —{" "}
                  {k.isActive ? t("active") : t("inactive")}
                </span>
                <button
                  disabled={loading}
                  onClick={() => toggleKey(k.keyId, !k.isActive)}
                  className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  {k.isActive ? t("deactivate") : t("activate")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
