"""Local TTS inference service wrapping AI4Bharat's Indic Parler-TTS
(https://huggingface.co/ai4bharat/indic-parler-tts) — a self-hosted,
open-source alternative to Bhashini's hosted API.

Run standalone: uvicorn tts_service.app:app --port 8788
(or `pnpm run tts-service`, which does the same).

The model is downloaded from Hugging Face on first run and cached locally
(~a few GB). Needs a Python 3.10-3.12 environment with a torch build
available for your platform (torch/parler-tts may not yet publish wheels
for the very latest Python versions — see requirements.txt).
"""

import base64
import hashlib
import io
import logging
import os
import re
import warnings
from pathlib import Path
from typing import Optional

import numpy as np

# parler_tts's own internals call the deprecated torch.jit.script API; this
# is a warning about their code, not ours, and there's nothing we can do
# about it short of patching the library, so silence just this one message.
warnings.filterwarnings("ignore", message="`torch.jit.script` is deprecated")

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

# The kiosk speaks a fixed, known set of strings — consent text, the
# interview questions, patient confirmations — identical for every patient.
# Generation time scales with text length, so caching these to disk means
# the (often long) consent/summary text is synthesized once ever, not once
# per patient. Not for arbitrary/dynamic text, just this small fixed set,
# so an unbounded cache is fine — there's no unbounded key space here.
CACHE_DIR = Path(__file__).parent / ".cache"
CACHE_DIR.mkdir(exist_ok=True)


def cache_key(text: str, language_code: str, gender: str) -> Path:
    digest = hashlib.sha256(f"{language_code}|{gender}|{text}".encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.wav"


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


# Consent screen body text (src/screens/ConsentScreen.tsx CONSENT_POINTS ->
# CONSENT_SPEECH_TEXT) and the fixed interview questions (ConverseScreen.tsx
# QUESTIONS). Duplicated here (not imported — this is Python, that's
# TypeScript) so the service can pre-warm the cache for them at startup.
# Keep in sync with the frontend if that copy changes.
CONSENT_TEXT = (
    "We will record your health history. Your answers will be stored as a digital health record for this visit. "
    "Shared only with your doctor. Your information is shared with the treating doctor and hospital staff only. "
    "It is not sold or shared with any outside company. "
    "Your data is kept secure. All information is protected. Only authorised hospital staff can view your record. "
    "You can decline. If you decline, a staff member will fill in your history on paper instead. "
    "Your care will not be affected."
)

INTERVIEW_QUESTIONS = [
    "What is the main reason for your visit today?",
    "Where is the pain or discomfort? Please point or describe.",
    "How severe is it on a scale of 1 to 10?",
    "How long have you had this problem?",
    "Do you have any known medical conditions?",
    "Are you currently taking any medicines or tablets?",
    "Have you been admitted to hospital before?",
    "Do any close family members (parents, siblings) have a serious health condition?",
    "Are you experiencing any chest pain or pressure right now?",
    "Any difficulty breathing or shortness of breath?",
    "Any recent dizziness, fainting, or loss of consciousness?",
    "Any nausea, vomiting, or inability to eat in the past 24 hours?",
]

# Patient-facing submission confirmation (src/utils/patientConfirmations.ts),
# already localized per language — unlike consent/questions above, this one
# is genuinely spoken in its matching language.
PATIENT_CONFIRMATION = {
    "en": "Your health information has been recorded and sent to the doctor. Please go to the waiting area.",
    "hi": "आपकी स्वास्थ्य जानकारी दर्ज कर ली गई है और डॉक्टर के पास भेज दी गई है। कृपया प्रतीक्षा कक्ष में जाएं।",
    "ta": "உங்கள் சுகாதாரத் தகவல் பதிவு செய்யப்பட்டு மருத்துவரிடம் அனுப்பப்பட்டுள்ளது. தயவுசெய்து காத்திருப்பு அறைக்குச் செல்லவும்.",
    "te": "మీ ఆరోగ్య సమాచారం నమోదు చేయబడి వైద్యుడికి పంపబడింది. దయచేసి వెయిటింగ్ ఏరియాకు వెళ్లండి.",
    "bn": "আপনার স্বাস্থ্য তথ্য রেকর্ড করা হয়েছে এবং ডাক্তারের কাছে পাঠানো হয়েছে। অনুগ্রহ করে অপেক্ষার জায়গায় যান।",
    "mr": "तुमची आरोग्य माहिती नोंदवली गेली असून डॉक्टरांकडे पाठवली आहे. कृपया प्रतीक्षा कक्षात जा.",
    "pa": "ਤੁਹਾਡੀ ਸਿਹਤ ਜਾਣਕਾਰੀ ਦਰਜ ਕਰ ਲਈ ਗਈ ਹੈ ਅਤੇ ਡਾਕਟਰ ਕੋਲ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਖੇਤਰ ਵਿੱਚ ਜਾਓ।",
    "kn": "ನಿಮ್ಮ ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ದಾಖಲಿಸಿ ವೈದ್ಯರಿಗೆ ಕಳುಹಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಕಾಯುವ ಕೊಠಡಿಗೆ ತೆರಳಿ.",
    "ml": "നിങ്ങളുടെ ആരോഗ്യ വിവരങ്ങൾ രേഖപ്പെടുത്തി ഡോക്ടർക്ക് അയച്ചിട്ടുണ്ട്. ദയവായി കാത്തിരിപ്പ് സ്ഥലത്തേക്ക് പോകുക.",
    "gu": "તમારી આરોગ્ય માહિતી નોંધવામાં આવી છે અને ડૉક્ટરને મોકલવામાં આવી છે. કૃપા કરીને પ્રતીક્ષા ખંડમાં જાઓ.",
    "od": "ଆପଣଙ୍କ ସ୍ୱାସ୍ଥ୍ୟ ସୂଚନା ରେକର୍ଡ ହୋଇ ଡାକ୍ତରଙ୍କ ନିକଟକୁ ପଠାଯାଇଛି। ଦୟାକରି ଅପେକ୍ଷା କକ୍ଷକୁ ଯାଆନ୍ତୁ।",
    "ur": "آپ کی صحت کی معلومات درج کر لی گئی ہیں اور ڈاکٹر کو بھیج دی گئی ہیں۔ براہ کرم انتظار گاہ میں جائیں۔",
}

# Languages to pre-warm consent text + questions for (those get spoken in
# whichever language the patient picked, so warming all 12 would mean
# 12 * 13 generations at startup — minutes of blocking boot time). English
# and Hindi cover the primary demo/test path; extend this list if you need
# more languages warmed ahead of time. Patient confirmations below are
# cheap (short, already localized) so all 12 of those are warmed regardless.
PREWARM_LANGUAGES = ["en", "hi"]


class SynthesizeRequest(BaseModel):
    text: str
    languageCode: str = "en"
    gender: Optional[str] = "female"


app = FastAPI(title="MediKiosk Indic Parler-TTS service")

_model = None
_tokenizer = None
_description_tokenizer = None


# No flash-attention on this platform (see the startup log warning), so the
# model runs eager attention, whose cost grows quadratically with sequence
# length. A single long block of text (e.g. the ~700-char consent script)
# generates disproportionately — not just slower but multi-minute and still
# climbing, observed directly during pre-warm testing. Splitting into
# sentence-sized chunks keeps each individual generation short (the
# quadratic-cost regime never kicks in) and bounds worst case, at the cost
# of a small pause between chunks in the final audio.
MAX_CHUNK_CHARS = 200
# Hard ceiling on generated tokens per chunk, as a backstop against a
# genuine runaway (missing/late EOS) rather than just a length guideline.
MAX_NEW_TOKENS = 1000


def _split_into_chunks(text: str) -> list[str]:
    sentences = re.split(r"(?<=[.!?।])\s+", text.strip())
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) + 1 > MAX_CHUNK_CHARS:
            chunks.append(current.strip())
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current.strip())
    return chunks or [text]


def _generate_chunk(text: str, language_code: str, gender: str) -> np.ndarray:
    description = build_description(language_code, gender)
    description_inputs = _description_tokenizer(description, return_tensors="pt").to(DEVICE)
    prompt_inputs = _tokenizer(text, return_tensors="pt").to(DEVICE)

    generation = _model.generate(
        input_ids=description_inputs.input_ids,
        attention_mask=description_inputs.attention_mask,
        prompt_input_ids=prompt_inputs.input_ids,
        prompt_attention_mask=prompt_inputs.attention_mask,
        max_new_tokens=MAX_NEW_TOKENS,
    )
    return generation.cpu().numpy().squeeze()


def _generate(text: str, language_code: str, gender: str) -> bytes:
    """Runs the model and returns WAV bytes, writing through to the disk cache."""
    cache_path = cache_key(text, language_code, gender)
    if cache_path.exists():
        return cache_path.read_bytes()

    chunks = _split_into_chunks(text)
    sample_rate = _model.config.sampling_rate
    gap = np.zeros(int(sample_rate * 0.25), dtype=np.float32)  # brief pause between chunks

    pieces = []
    for i, chunk in enumerate(chunks):
        if i > 0:
            pieces.append(gap)
        pieces.append(_generate_chunk(chunk, language_code, gender))
    audio_arr = np.concatenate(pieces) if len(pieces) > 1 else pieces[0]

    buffer = io.BytesIO()
    sf.write(buffer, audio_arr, sample_rate, format="WAV")
    audio_bytes = buffer.getvalue()
    cache_path.write_bytes(audio_bytes)
    return audio_bytes


def prewarm_cache() -> None:
    """Generates audio for every fixed, known kiosk string ahead of time, so
    no real patient ever waits on a cold generation for standard content."""
    jobs = []
    for lang in PREWARM_LANGUAGES:
        jobs.append((CONSENT_TEXT, lang, "female"))
        for question in INTERVIEW_QUESTIONS:
            jobs.append((question, lang, "female"))
    for lang, text in PATIENT_CONFIRMATION.items():
        jobs.append((text, lang, "female"))

    to_generate = [j for j in jobs if not cache_key(j[0], j[1], j[2]).exists()]
    if not to_generate:
        log.info("Pre-warm cache: all %d fixed prompts already cached.", len(jobs))
        return

    log.info("Pre-warming cache: %d/%d prompts to generate...", len(to_generate), len(jobs))
    for i, (text, lang, gender) in enumerate(to_generate, 1):
        _generate(text, lang, gender)
        log.info("Pre-warm %d/%d done (%s).", i, len(to_generate), lang)
    log.info("Pre-warm cache complete.")


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
    prewarm_cache()


@app.get("/health")
def health():
    return {"ok": _model is not None}


@app.post("/synthesize")
def synthesize(req: SynthesizeRequest):
    if not req.text.strip():
        raise HTTPException(400, "text is required")

    gender = req.gender or "female"
    cache_path = cache_key(req.text, req.languageCode, gender)
    if cache_path.exists():
        return {"audioContent": base64.b64encode(cache_path.read_bytes()).decode("ascii"), "audioFormat": "wav"}

    if _model is None:
        raise HTTPException(503, "Model still loading, try again shortly")

    audio_bytes = _generate(req.text, req.languageCode, gender)
    return {"audioContent": base64.b64encode(audio_bytes).decode("ascii"), "audioFormat": "wav"}
