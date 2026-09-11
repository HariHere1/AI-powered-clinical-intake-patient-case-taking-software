import { useCallback, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { speak as speakText, stopSpeaking } from "../services/ttsService";

/** Speaks text in the patient's selected language, with playback state for UI. */
export function useTTS() {
  const { data } = useApp();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef(0);

  const speak = useCallback(
    async (text: string, languageCode?: string) => {
      const lang = languageCode || data.language?.code || "en";
      const token = ++tokenRef.current;
      setError(null);
      setIsSpeaking(true);
      try {
        await speakText(text, lang);
      } catch (err) {
        if (token === tokenRef.current) {
          setError(err instanceof Error ? err.message : "Speech failed");
        }
      } finally {
        if (token === tokenRef.current) setIsSpeaking(false);
      }
    },
    [data.language],
  );

  const stop = useCallback(() => {
    tokenRef.current++;
    stopSpeaking();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, error };
}
