"""Local TTS inference service wrapping AI4Bharat's Indic Parler-TTS
(https://huggingface.co/ai4bharat/indic-parler-tts) — a self-hosted,
open-source alternative to Bhashini's hosted API.

Run standalone: uvicorn tts_service.app:app --port 8788
(or `npm run tts-service`, which does the same).

The model is downloaded from Hugging Face on first run and cached locally
(~a few GB). Needs a Python 3.10-3.12 environment with a torch build
available for your platform (torch/parler-tts may not yet publish wheels
for the very latest Python versions — see requirements.txt).
"""

import base64
import io
import logging
import os
from typing import Optional

import soundfile as sf
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from parler_tts import ParlerTTSForConditionalGeneration
from pydantic import BaseModel
from transformers import AutoTokenizer

load_dotenv()  # picks up HF_TOKEN from the project's root .env

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("indic-parler-tts")

MODEL_ID = "ai4bharat/indic-parler-tts"
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

# ai4bharat/indic-parler-tts is a gated Hugging Face repo: you must
# (1) have a free HF account, (2) accept the model's terms on its model
# page, and (3) create an access token at https://huggingface.co/settings/tokens
# and set HF_TOKEN in .env. Without this, model download fails with a 401.
HF_TOKEN = os.environ.get("HF_TOKEN")

# App language code -> (language name, recommended speaker name, generic
# fallback description). Speaker names below are ones the model card lists
# as recommended for that language; where none is confirmed we fall back to
# a generic, unnamed voice description (the model card notes this also
# works, just with less consistent voice identity across requests).
LANGUAGE_INFO = {
    "en": ("English", "Rohit"),
    "hi": ("Hindi", "Rohit"),
    "ta": ("Tamil", "Jaya"),
    "te": ("Telugu", "Prakash"),
    "bn": ("Bengali", "Arjun"),
    "mr": ("Marathi", None),
    "pa": ("Punjabi", None),
    "kn": ("Kannada", None),
    "ml": ("Malayalam", None),
    "gu": ("Gujarati", None),
    "od": ("Odia", None),
    "ur": ("Urdu", None),
}

FEMALE_SPEAKERS = {"hi": "Divya", "te": "Lalitha", "bn": "Aditi"}


def build_description(language_code: str, gender: str) -> str:
    lang_name, default_speaker = LANGUAGE_INFO.get(language_code, ("English", "Rohit"))
    speaker = FEMALE_SPEAKERS.get(language_code) if gender == "female" else default_speaker
    speaker = speaker or default_speaker
    if speaker:
        return (
            f"{speaker}'s voice is clear, calm, and moderately paced, "
            f"speaking in {lang_name}, recorded in a quiet room with no background noise."
        )
    return (
        f"A clear, neutral, moderately paced voice speaking in {lang_name}, "
        "recorded in a quiet room with no background noise."
    )


class SynthesizeRequest(BaseModel):
    text: str
    languageCode: str = "en"
    gender: Optional[str] = "female"


app = FastAPI(title="MediKiosk Indic Parler-TTS service")

_model = None
_tokenizer = None
_description_tokenizer = None


@app.on_event("startup")
def load_model() -> None:
    global _model, _tokenizer, _description_tokenizer
    if not HF_TOKEN:
        log.warning(
            "HF_TOKEN not set — ai4bharat/indic-parler-tts is a gated model and download will "
            "likely fail with a 401. Accept the model's terms at "
            "https://huggingface.co/ai4bharat/indic-parler-tts, create a token at "
            "https://huggingface.co/settings/tokens, and set HF_TOKEN in .env."
        )
    log.info("Loading %s onto %s (first run downloads weights, may take a while)...", MODEL_ID, DEVICE)
    _model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID, token=HF_TOKEN).to(DEVICE)
    _tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, token=HF_TOKEN)
    _description_tokenizer = AutoTokenizer.from_pretrained(
        _model.config.text_encoder._name_or_path, token=HF_TOKEN
    )
    log.info("Model loaded.")


@app.get("/health")
def health():
    return {"ok": _model is not None}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    if _model is None:
        raise HTTPException(503, "Model still loading, try again shortly")
    if not req.text.strip():
        raise HTTPException(400, "text is required")

    description = build_description(req.languageCode, req.gender or "female")

    description_inputs = _description_tokenizer(description, return_tensors="pt").to(DEVICE)
    prompt_inputs = _tokenizer(req.text, return_tensors="pt").to(DEVICE)

    generation = _model.generate(
        input_ids=description_inputs.input_ids,
        attention_mask=description_inputs.attention_mask,
        prompt_input_ids=prompt_inputs.input_ids,
        prompt_attention_mask=prompt_inputs.attention_mask,
    )
    audio_arr = generation.cpu().numpy().squeeze()

    buffer = io.BytesIO()
    sf.write(buffer, audio_arr, _model.config.sampling_rate, format="WAV")
    audio_base64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    return {"audioContent": audio_base64, "audioFormat": "wav"}
