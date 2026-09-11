"""OCR microservice backed by Tesseract (pytesseract).

Contract:
  POST /extract  (multipart form: file=<image or pdf>)
    -> { text, confidence, structuredFields }
  GET  /health

This is a simplified, "good enough for demo" implementation: structured
field extraction uses regex heuristics, not a medical NER model.
"""

import io
import os
import re

import pytesseract
from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image

app = FastAPI(title="MediKiosk OCR Service")

TESSERACT_CMD = os.environ.get("TESSERACT_CMD")
if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

DATE_PATTERN = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b")
MEDICINE_LINE_PATTERN = re.compile(
    r"\b([A-Z][a-zA-Z]{2,}(?:\s[A-Z]?[a-z]+)?)\s+(\d+\s?(?:mg|ml|mcg|g))\b"
)


def extract_structured_fields(text: str) -> dict:
    dates = DATE_PATTERN.findall(text)
    medicines = [
        {"name": name.strip(), "dose": dose.strip()}
        for name, dose in MEDICINE_LINE_PATTERN.findall(text)
    ]
    return {
        "dates": dates,
        "medicines": medicines,
    }


def load_image(raw: bytes, filename: str) -> Image.Image:
    if filename.lower().endswith(".pdf"):
        from pdf2image import convert_from_bytes

        pages = convert_from_bytes(raw)
        if not pages:
            raise HTTPException(status_code=400, detail="PDF has no pages")
        return pages[0]
    return Image.open(io.BytesIO(raw))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="file is required")

    raw = await file.read()
    image = load_image(raw, file.filename)

    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
    words = [w for w in data["text"] if w.strip()]
    confidences = [int(c) for c in data["conf"] if c not in ("-1", -1)]

    text = " ".join(words)
    avg_confidence = round(sum(confidences) / len(confidences) / 100, 4) if confidences else 0.0

    return {
        "text": text,
        "confidence": avg_confidence,
        "structuredFields": extract_structured_fields(text),
    }
