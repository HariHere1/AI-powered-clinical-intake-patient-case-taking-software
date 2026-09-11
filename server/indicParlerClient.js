// Client for the local Indic Parler-TTS inference service (tts_service/app.py),
// a self-hosted, open-source alternative to Bhashini's hosted API — used because
// the Bhashini dashboard was unavailable to register for API credentials.

const SERVICE_URL = process.env.PARLER_SERVICE_URL || "http://127.0.0.1:8788";

export async function synthesizeSpeech(text, languageCode, gender = "female") {
  let res;
  try {
    res = await fetch(`${SERVICE_URL}/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, languageCode, gender }),
    });
  } catch (err) {
    throw new Error(
      `Could not reach Indic Parler-TTS service at ${SERVICE_URL}. ` +
        `Start it with "npm run tts-service" (see tts_service/requirements.txt). ` +
        `Original error: ${err instanceof Error ? err.message : err}`,
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Indic Parler-TTS service request failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  if (!json.audioContent) {
    throw new Error("Indic Parler-TTS service response is missing audio content");
  }

  return { audioContent: json.audioContent, audioFormat: json.audioFormat || "wav" };
}
