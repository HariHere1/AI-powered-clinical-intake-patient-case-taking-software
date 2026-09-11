"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { VoiceRecorder } from "@/components/VoiceRecorder";

interface NextQuestionResponse {
  turnId?: string;
  questionText?: string;
  isFollowUp?: boolean;
  redFlag?: boolean;
  sessionComplete: boolean;
}

export default function IntakePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const t = useTranslations("intake");
  const tc = useTranslations("common");
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [current, setCurrent] = useState<NextQuestionResponse | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/${sessionId}/next-question`, { method: "POST" });
      const data: NextQuestionResponse = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? tc("error"));
      setCurrent(data);
      setTypedAnswer("");

      if (data.sessionComplete) {
        router.push(`/documents/${sessionId}`);
        return;
      }

      if (data.questionText) {
        const ttsRes = await fetch(`/api/intake/${sessionId}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: data.questionText }),
        });
        if (ttsRes.ok) {
          const blob = await ttsRes.blob();
          const url = URL.createObjectURL(blob);
          if (audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.play().catch(() => {});
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
    } finally {
      setLoading(false);
    }
  }, [sessionId, router, tc]);

  useEffect(() => {
    // Fetching the first/current question on mount necessarily sets loading
    // state synchronously (before the network round-trip resolves).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function submitTypedAnswer() {
    if (!current?.turnId || !typedAnswer.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intake/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ turnId: current.turnId, answerText: typedAnswer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      await fetchNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
      setLoading(false);
    }
  }

  async function submitAudioAnswer(blob: Blob) {
    if (!current?.turnId) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("turnId", current.turnId);
      form.append("audio", blob, "answer.webm");
      const res = await fetch(`/api/intake/${sessionId}/answer`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? tc("error"));
      await fetchNext();
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("error"));
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>

        {current?.redFlag && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {t("redFlagNotice")}
          </p>
        )}

        <p className="mb-6 text-lg">{current?.questionText}</p>

        <div className="mb-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => audioRef.current?.play()}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {t("playQuestion")}
          </button>
          <VoiceRecorder disabled={loading} onRecorded={submitAudioAnswer} label={t("listening")} />
        </div>

        <p className="mb-2 text-sm text-slate-500">{t("speakOrType")}</p>
        <div className="flex gap-2">
          <input
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitTypedAnswer()}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            disabled={loading || !typedAnswer.trim()}
            onClick={submitTypedAnswer}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {t("nextQuestion")}
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <audio ref={audioRef} className="hidden" />
      </div>
    </main>
  );
}
