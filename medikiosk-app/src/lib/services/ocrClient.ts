export interface OcrResult {
  text: string;
  confidence: number;
  structuredFields: Record<string, unknown>;
}

export async function extractDocumentText(
  fileBlob: Blob,
  filename: string
): Promise<OcrResult> {
  const url = process.env.OCR_SERVICE_URL ?? "http://localhost:8003";
  const form = new FormData();
  form.append("file", fileBlob, filename);

  const res = await fetch(`${url}/extract`, { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`OCR service error: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    text: data.text,
    confidence: data.confidence,
    structuredFields: data.structuredFields,
  };
}
