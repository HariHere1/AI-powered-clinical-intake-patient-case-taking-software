// Text-to-speech service. Primary path calls the MediKiosk backend, which
// synthesizes speech via Bhashini's Indian-language neural TTS models.
// Falls back to the browser's built-in speechSynthesis when the backend is
// unreachable or a language isn't covered, so the kiosk always speaks.

export interface SpeakOptions {
  gender?: "male" | "female";
}

// App language codes that differ from Bhashini's ISO codes.
const BHASHINI_LANG_MAP: Record<string, string> = {
  od: "or", // Odia
};

// BCP-47 tags for the browser SpeechSynthesis fallback.
const BCP47_MAP: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  bn: "bn-IN",
  mr: "mr-IN",
  pa: "pa-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  gu: "gu-IN",
  od: "or-IN",
  ur: "ur-IN",
};

function toBhashiniCode(code: string): string {
  return BHASHINI_LANG_MAP[code] || code;
}

function toBcp47(code: string): string {
  return BCP47_MAP[code] || "en-IN";
}

let currentAudio: HTMLAudioElement | null = null;

async function speakViaBhashini(text: string, languageCode: string, gender: string): Promise<void> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, languageCode: toBhashiniCode(languageCode), gender }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `TTS request failed: ${res.status}`);
  }

  const { audioContent, audioFormat } = await res.json();
  if (!audioContent) throw new Error("No audio returned from TTS backend");

  await new Promise<void>((resolve, reject) => {
    stopSpeaking();
    const audio = new Audio(`data:audio/${audioFormat || "wav"};base64,${audioContent}`);
    currentAudio = audio;
    audio.onended = () => {
      currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      currentAudio = null;
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch(reject);
  });
}

function speakViaBrowser(text: string, languageCode: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Speech synthesis is not supported in this browser"));
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = toBcp47(languageCode);
    utterance.onend = () => resolve();
    utterance.onerror = () => reject(new Error("Browser speech synthesis failed"));
    window.speechSynthesis.speak(utterance);
  });
}

/** Speaks `text` in the given app language code, preferring Bhashini TTS. */
export async function speak(text: string, languageCode: string, opts: SpeakOptions = {}): Promise<void> {
  if (!text?.trim()) return;
  try {
    await speakViaBhashini(text, languageCode, opts.gender || "female");
  } catch (err) {
    console.warn("Bhashini TTS unavailable, falling back to browser speech synthesis:", err);
    await speakViaBrowser(text, languageCode);
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
