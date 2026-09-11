"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface PatientRow {
  keyId: string;
  patientId: string;
  fullName: string;
  reportId: string;
  reportStatus: string;
  activatedAt: string;
}

export default function DoctorDashboardPage() {
  const t = useTranslations("doctor");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/doctor/patients")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setPatients(data.patients);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  return (
    <main className="flex flex-1 justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-6 text-2xl font-semibold">{t("dashboardTitle")}</h1>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {patients.length === 0 && !error && (
          <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
            {t("noPatients")}
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {patients.map((p) => (
            <li
              key={p.keyId}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium">{p.fullName}</p>
                <p className="text-xs text-slate-500">{p.reportStatus}</p>
              </div>
              <Link
                href={`/report/${p.reportId}`}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
              >
                {t("viewReport")}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
