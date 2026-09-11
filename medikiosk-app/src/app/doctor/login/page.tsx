"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function DoctorLoginPage() {
  const t = useTranslations("doctor");
  const tc = useTranslations("common");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      if (data.role !== "DOCTOR") throw new Error("Not a doctor account");
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">{t("loginTitle")}</h1>
        <label className="mb-4 flex flex-col gap-1 text-sm">
          {t("email")}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="mb-6 flex flex-col gap-1 text-sm">
          {t("password")}
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {t("login")}
        </button>
      </form>
    </main>
  );
}
