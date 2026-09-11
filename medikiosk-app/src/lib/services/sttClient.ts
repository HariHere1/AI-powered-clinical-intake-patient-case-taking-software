export interface TranscribeResult {
  text: string;
  detectedLanguage: string;
  confidence: number;
}

export async function transcribeAudio(
  audioBlob: Blob,
  filename: string,
  languageHint?: string
): Promise<TranscribeResult> {
  const url = process.env.STT_SERVICE_URL ?? "http://localhost:8001";
  const form = new FormData();
  form.append("audio", audioBlob, filename);
  if (languageHint) form.append("language_hint", languageHint);

  const res = await fetch(`${url}/transcribe`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`STT service error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    text: data.text,
    detectedLanguage: data.detected_language,
    confidence: data.confidence,
  };
}
