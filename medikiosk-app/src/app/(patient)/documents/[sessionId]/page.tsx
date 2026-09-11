"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const DOC_TYPES = ["PRESCRIPTION", "PHARMACY_BILL", "CONSULTATION_RECORD", "LAB_REPORT", "OTHER"] as const;

interface UploadedDoc {
  documentId: string;
  ocrStatus: string;
  fileName: string;
}

export default function DocumentsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const t = useTranslations("documents");
  const tc = useTranslations("common");
  const router = useRouter();

  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>("PRESCRIPTION");
  const [uploaded, setUploaded] = useState<UploadedDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);
      const res = await fetch(`/api/documents/${sessionId}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setUploaded((prev) => [...prev, { documentId: data.documentId, ocrStatus: data.ocrStatus, fileName: file.name }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  async function proceedToReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      router.push(`/report/${data.reportId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>

        <label className="mb-4 flex flex-col gap-1 text-sm">
          {t("type")}
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value as (typeof DOC_TYPES)[number])}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            {DOC_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </select>
        </label>

        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={loading}
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          className="mb-4 block w-full text-sm"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <ul className="mb-6 flex flex-col gap-2">
          {uploaded.map((doc) => (
            <li key={doc.documentId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              {doc.fileName} — {t(doc.ocrStatus === "DONE" ? "done" : doc.ocrStatus === "FAILED" ? "failed" : "processing")}
            </li>
          ))}
        </ul>

        <button
          disabled={loading}
          onClick={proceedToReport}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
        >
          {uploaded.length ? tc("continue") : t("skip")}
        </button>
      </div>
    </main>
  );
}
