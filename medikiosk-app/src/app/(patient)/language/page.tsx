"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/i18n/routing";

export default function LanguageSelectPage() {
  const t = useTranslations("language");
  const router = useRouter();

  async function selectLanguage(languageCode: string) {
    await fetch("/api/session/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ languageCode }),
    });
    // Cookie changed -> refresh forces the server layout (which reads the
    // locale cookie) to re-render in the new language before navigating.
    router.refresh();
    router.push("/consent");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">{t("title")}</h1>
        <p className="mb-6 text-sm text-slate-500">{t("subtitle")}</p>
        <div className="flex flex-col gap-3">
          {SUPPORTED_LOCALES.map((locale) => (
            <button
              key={locale}
              onClick={() => selectLanguage(locale)}
              className="rounded-lg border border-slate-300 px-4 py-3 text-left text-lg hover:border-slate-900"
            >
              {LOCALE_LABELS[locale]}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
