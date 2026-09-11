"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function PatientEntryPage() {
  const t = useTranslations("patientEntry");
  const tc = useTranslations("common");
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/patient/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      setMockCode(data.mockOtp ? data.code : null);
      setStep("otp");
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/patient/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      router.push("/language");
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>

        {step === "details" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              requestOtp();
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              {t("nameLabel")}
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("phoneLabel")}
              <input
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading}
              type="submit"
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {t("requestOtp")}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyOtp();
            }}
            className="flex flex-col gap-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              {t("otpLabel")}
              <input
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 tracking-widest"
                maxLength={6}
              />
            </label>
            {mockCode && (
              <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
                {t("mockOtpNotice")} <strong>{mockCode}</strong>
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              disabled={loading}
              type="submit"
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {t("verifyOtp")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
