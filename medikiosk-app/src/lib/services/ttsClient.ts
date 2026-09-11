export async function synthesizeSpeech(
  text: string,
  languageCode: string
): Promise<Buffer> {
  const url = process.env.TTS_SERVICE_URL ?? "http://localhost:8002";

  const res = await fetch(`${url}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language_code: languageCode }),
  });

  if (!res.ok) {
    throw new Error(`TTS service error: ${res.status} ${await res.text()}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
