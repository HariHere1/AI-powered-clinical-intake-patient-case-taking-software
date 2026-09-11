// Client for Bhashini's ULCA pipeline API (https://bhashini.gov.in), the
// government-backed ASR/NMT/TTS stack for Indian languages referenced in the
// MediKiosk problem statement. Requires BHASHINI_USER_ID / BHASHINI_ULCA_API_KEY
// from https://bhashini.gov.in — see .env.example.

const ULCA_BASE = "https://meity-auth.ulcacontrib.org";
const PIPELINE_ENDPOINT = "/ulca/apis/v0/model/getModelsPipeline";

// MeitY's standard published pipeline covering ASR + translation + TTS for
// the 11 core Indian languages. Override with BHASHINI_PIPELINE_ID if your
// registered account uses a different pipeline.
const DEFAULT_PIPELINE_ID = "64392f96daac500b55c543cd";

const CACHE_TTL_MS = 60 * 60 * 1000; // service/endpoint config changes rarely

let cache = null;
let cacheFetchPromise = null;

async function fetchPipelineConfig() {
  const userID = process.env.BHASHINI_USER_ID;
  const ulcaApiKey = process.env.BHASHINI_ULCA_API_KEY;
  const pipelineId = process.env.BHASHINI_PIPELINE_ID || DEFAULT_PIPELINE_ID;

  if (!userID || !ulcaApiKey) {
    throw new Error(
      "Missing BHASHINI_USER_ID / BHASHINI_ULCA_API_KEY environment variables. " +
        "Register at https://bhashini.gov.in to obtain credentials, then copy .env.example to .env.",
    );
  }

  const res = await fetch(`${ULCA_BASE}${PIPELINE_ENDPOINT}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      userID,
      ulcaApiKey,
    },
    body: JSON.stringify({
      pipelineTasks: [{ taskType: "tts" }],
      pipelineRequestConfig: { pipelineId },
    }),
  });

  if (!res.ok) {
    throw new Error(`Bhashini pipeline config request failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const ttsConfig = json.pipelineResponseConfig?.find((c) => c.taskType === "tts");
  const services = ttsConfig?.config || [];

  const servicesByLang = {};
  for (const svc of services) {
    const lang = svc.language?.sourceLanguage;
    if (lang) servicesByLang[lang] = svc.serviceId;
  }

  const endpoint = json.pipelineInferenceAPIEndPoint;
  if (!endpoint?.callbackUrl || !endpoint?.inferenceApiKey) {
    throw new Error("Bhashini response is missing pipelineInferenceAPIEndPoint");
  }

  return {
    servicesByLang,
    callbackUrl: endpoint.callbackUrl,
    inferenceHeaderName: endpoint.inferenceApiKey.name,
    inferenceHeaderValue: endpoint.inferenceApiKey.value,
    fetchedAt: Date.now(),
  };
}

async function getPipelineConfig() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache;
  // Coalesce concurrent cold-start requests into a single upstream call.
  if (!cacheFetchPromise) {
    cacheFetchPromise = fetchPipelineConfig()
      .then((config) => {
        cache = config;
        return config;
      })
      .finally(() => {
        cacheFetchPromise = null;
      });
  }
  return cacheFetchPromise;
}

export async function synthesizeSpeech(text, languageCode, gender = "female", samplingRate = 22050) {
  const { servicesByLang, callbackUrl, inferenceHeaderName, inferenceHeaderValue } = await getPipelineConfig();

  const serviceId = servicesByLang[languageCode];
  if (!serviceId) {
    throw new Error(
      `No Bhashini TTS service available for language "${languageCode}". Available: ${Object.keys(servicesByLang).join(", ")}`,
    );
  }

  const res = await fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [inferenceHeaderName]: inferenceHeaderValue,
    },
    body: JSON.stringify({
      pipelineTasks: [
        {
          taskType: "tts",
          config: {
            language: { sourceLanguage: languageCode },
            serviceId,
            gender,
            samplingRate,
          },
        },
      ],
      inputData: { input: [{ source: text }] },
    }),
  });

  if (!res.ok) {
    throw new Error(`Bhashini TTS inference failed: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  const audio = json.pipelineResponse?.[0]?.audio?.[0];
  if (!audio?.audioContent) {
    throw new Error("Bhashini TTS response is missing audio content");
  }

  return { audioContent: audio.audioContent, audioFormat: audio.audioFormat || "wav" };
}
