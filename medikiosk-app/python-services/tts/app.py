"""Text-to-speech microservice backed by Indic Parler-TTS.

Contract:
  POST /synthesize  { text, language_code, voice_description? }
    -> audio/wav bytes
  GET  /health

GPU is strongly preferred (see docker-compose.override.yml.example for
passthrough setup / host-run fallback); this also runs on CPU, just slowly.
"""

import io
import os

import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from parler_tts import ParlerTTSForConditionalGeneration
from pydantic import BaseModel
from transformers import AutoTokenizer

MODEL_NAME = os.environ.get("PARLER_TTS_MODEL", "ai4bharat/indic-parler-tts")
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

DEFAULT_VOICE_DESCRIPTIONS: dict[str, str] = {
    "hi": "A clear, calm female Hindi speaker delivers the message at a moderate pace in a quiet room.",
    "en": "A clear, calm female English speaker delivers the message at a moderate pace in a quiet room.",
}
FALLBACK_VOICE_DESCRIPTION = (
    "A clear, calm speaker delivers the message at a moderate pace in a quiet room."
)

app = FastAPI(title="MediKiosk TTS Service")

_model: ParlerTTSForConditionalGeneration | None = None
_tokenizer = None
_description_tokenizer = None


def get_model():
    global _model, _tokenizer, _description_tokenizer
    if _model is None:
        _model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_NAME).to(DEVICE)
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _description_tokenizer = AutoTokenizer.from_pretrained(_model.config.text_encoder._name_or_path)
    return _model, _tokenizer, _description_tokenizer


class SynthesizeRequest(BaseModel):
    text: str
    language_code: str = "en"
    voice_description: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "device": DEVICE}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")

    model, tokenizer, description_tokenizer = get_model()
    description = (
        req.voice_description
        or DEFAULT_VOICE_DESCRIPTIONS.get(req.language_code, FALLBACK_VOICE_DESCRIPTION)
    )

    input_ids = description_tokenizer(description, return_tensors="pt").input_ids.to(DEVICE)
    prompt_input_ids = tokenizer(req.text, return_tensors="pt").input_ids.to(DEVICE)

    generation = model.generate(input_ids=input_ids, prompt_input_ids=prompt_input_ids)
    audio = generation.cpu().numpy().squeeze()

    buffer = io.BytesIO()
    sf.write(buffer, audio, model.config.sampling_rate, format="WAV")
    buffer.seek(0)

    return Response(content=buffer.read(), media_type="audio/wav")
