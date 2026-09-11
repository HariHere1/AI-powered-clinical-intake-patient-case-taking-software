"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function ConsentPage() {
  const t = useTranslations("consent");
  const tc = useTranslations("common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(agree: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agree }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? tc("error"));
      }
      if (agree) {
        const intakeRes = await fetch("/api/intake", { method: "POST" });
        const intakeData = await intakeRes.json();
        if (!intakeRes.ok) throw new Error(intakeData.error ?? tc("error"));
        router.push(`/intake/${intakeData.sessionId}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm leading-relaxed text-slate-600">{t("body")}</p>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            disabled={loading}
            onClick={() => respond(true)}
            className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-white disabled:opacity-50"
          >
            {t("agree")}
          </button>
          <button
            disabled={loading}
            onClick={() => respond(false)}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 disabled:opacity-50"
          >
            {t("decline")}
          </button>
        </div>
      </div>
    </main>
  );
}
