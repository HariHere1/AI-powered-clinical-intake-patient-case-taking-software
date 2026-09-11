"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";

type InputType = "VOICE_TEXT" | "CHOICE" | "SCALE";
type FollowUpStrategy = "NONE" | "LLM_ADAPTIVE" | "SOCRATES";

export default function EditSurveyTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = use(params);
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  const [code, setCode] = useState("");
  const [promptText, setPromptText] = useState("");
  const [inputType, setInputType] = useState<InputType>("VOICE_TEXT");
  const [followUpStrategy, setFollowUpStrategy] = useState<FollowUpStrategy>("NONE");
  const [required, setRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function addQuestion() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/survey-templates/${templateId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          promptText,
          inputType,
          followUpStrategy,
          isRequired: required,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setMessage(`Added question "${data.question.code}"`);
      setCode("");
      setPromptText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">{t("addQuestion")}</h1>

        <label className="mb-4 flex flex-col gap-1 text-sm">
          {t("questionCode")}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. chief_complaint"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="mb-4 flex flex-col gap-1 text-sm">
          {t("questionText")}
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={2}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            {t("inputType")}
            <select
              value={inputType}
              onChange={(e) => setInputType(e.target.value as InputType)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="VOICE_TEXT">Voice / text</option>
              <option value="CHOICE">Choice</option>
              <option value="SCALE">Scale</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            {t("followUpStrategy")}
            <select
              value={followUpStrategy}
              onChange={(e) => setFollowUpStrategy(e.target.value as FollowUpStrategy)}
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="NONE">None</option>
              <option value="LLM_ADAPTIVE">AI adaptive</option>
              <option value="SOCRATES">SOCRATES (symptoms)</option>
            </select>
          </label>
        </div>

        <label className="mb-6 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          {t("required")}
        </label>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-4 text-sm text-green-700">{message}</p>}

        <button
          disabled={loading || !code || !promptText}
          onClick={addQuestion}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {t("addQuestion")}
        </button>
      </div>
    </main>
  );
}
