"""Speech-to-text microservice backed by faster-whisper.

Contract:
  POST /transcribe  (multipart form: audio=<file>, language_hint=<iso code>?)
    -> { text, detected_language, confidence }
  GET  /health
"""

import os
import tempfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from faster_whisper import WhisperModel

MODEL_SIZE = os.environ.get("WHISPER_MODEL_SIZE", "small")
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

app = FastAPI(title="MediKiosk STT Service")

_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
    return _model


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language_hint: str | None = Form(default=None),
):
    if not audio.filename:
        raise HTTPException(status_code=400, detail="audio file is required")

    suffix = os.path.splitext(audio.filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        model = get_model()
        segments, info = model.transcribe(
            tmp_path,
            language=language_hint if language_hint else None,
            vad_filter=True,
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": text,
            "detected_language": info.language,
            "confidence": round(float(info.language_probability), 4),
        }
    finally:
        os.unlink(tmp_path)
