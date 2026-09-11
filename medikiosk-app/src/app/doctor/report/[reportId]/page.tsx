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

export default function DoctorReportEditPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const t = useTranslations("report");
  const td = useTranslations("doctor");
  const tc = useTranslations("common");

  const [content, setContent] = useState<ReportContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/reports/${reportId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? tc("error"));
        setContent(data.content);
      })
      .catch((e) => setError(e instanceof Error ? e.message : tc("error")));
  }, [reportId, tc]);

  function updateField(key: keyof ReportContent, value: string) {
    setContent((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setError(null);
    setSavedMessage(null);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setSavedMessage(`Saved as version ${data.versionNo}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

        {content && (
          <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-sm">
            {SECTION_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="font-semibold text-slate-500">{t(key)}</span>
                <textarea
                  value={content[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  rows={3}
                  className="rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            ))}
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {savedMessage && <p className="mb-4 text-sm text-green-700">{savedMessage}</p>}

        <button
          disabled={saving || !content}
          onClick={save}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {td("saveChanges")}
        </button>
      </div>
    </main>
  );
}
