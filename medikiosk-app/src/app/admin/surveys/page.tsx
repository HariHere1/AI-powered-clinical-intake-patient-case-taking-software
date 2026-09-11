"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface Template {
  id: string;
  name: string;
  isActive: boolean;
  version: number;
  questions: { id: string }[];
}

export default function AdminSurveysPage() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadTemplates(hid: string) {
    const res = await fetch(`/api/admin/hospitals/${hid}/survey-templates`);
    const data = await res.json();
    if (res.ok) setTemplates(data.templates);
  }

  useEffect(() => {
    fetch("/api/auth/staff/me")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? tc("error"));
        setHospitalId(data.hospitalId);
        await loadTemplates(data.hospitalId);
      })
      .catch((e) => setError(e instanceof Error ? e.message : tc("error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createTemplate() {
    if (!hospitalId || !newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/hospitals/${hospitalId}/survey-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setNewName("");
      await loadTemplates(hospitalId);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(templateId: string, isActive: boolean) {
    if (!hospitalId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/survey-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? tc("error"));
      }
      await loadTemplates(hospitalId);
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">{t("surveyTitle")}</h1>

        <div className="mb-6 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New template name"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            disabled={loading || !newName.trim()}
            onClick={createTemplate}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {tc("save")}
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <ul className="flex flex-col gap-3">
          {templates.map((tmpl) => (
            <li key={tmpl.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{tmpl.name}</p>
                  <p className="text-xs text-slate-500">
                    {tmpl.questions.length} questions {tmpl.isActive ? "· active" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/surveys/${tmpl.id}/edit`}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
                  >
                    Edit
                  </Link>
                  <button
                    disabled={loading}
                    onClick={() => toggleActive(tmpl.id, !tmpl.isActive)}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
                  >
                    {tmpl.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
