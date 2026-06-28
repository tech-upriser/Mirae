"""
Mirae Intelligence Engine — FastAPI Microservice
==================================================
Endpoints:
  GET  /          — health check
  POST /analyze   — classify an email (relevant?, category, status)
  POST /match     — match email text to candidate cards via cosine similarity
  POST /extract   — regex-based field extraction (category-aware)
"""

import os
import pickle
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Startup — load models
# ---------------------------------------------------------------------------

_MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

MODELS_LOADED: bool = False
vectorizer = None
detector_model = None
category_model = None
status_model = None


def _load_models():
    """Attempt to load all .pkl artefacts.  Sets MODELS_LOADED flag."""
    global MODELS_LOADED, vectorizer, detector_model, category_model, status_model

    required = [
        "vectorizer.pkl",
        "detector_model.pkl",
        "category_model.pkl",
        "status_model.pkl",
    ]
    for fname in required:
        path = os.path.join(_MODEL_DIR, fname)
        if not os.path.isfile(path):
            print(f"[WARNING] Missing model file: {path}")
            MODELS_LOADED = False
            return

    with open(os.path.join(_MODEL_DIR, "vectorizer.pkl"), "rb") as f:
        vectorizer = pickle.load(f)
    with open(os.path.join(_MODEL_DIR, "detector_model.pkl"), "rb") as f:
        detector_model = pickle.load(f)
    with open(os.path.join(_MODEL_DIR, "category_model.pkl"), "rb") as f:
        category_model = pickle.load(f)
    with open(os.path.join(_MODEL_DIR, "status_model.pkl"), "rb") as f:
        status_model = pickle.load(f)

    MODELS_LOADED = True
    print("[OK] All models loaded successfully.")


_load_models()

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Mirae Intelligence Engine",
    version="1.0.0",
    description="Email classification, card matching, and field extraction.",
)


def _require_models():
    """Raise 503 when models are not available."""
    if not MODELS_LOADED:
        raise HTTPException(
            status_code=503,
            detail=(
                "ML models are not loaded. "
                "Run `python train_model.py` first to generate the .pkl files."
            ),
        )


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    subject: str
    sender: str
    snippet: str
    body: str = ""


class AnalyzeResponse(BaseModel):
    is_relevant: bool
    category: Optional[str] = None
    status: str
    confidence: float


class Candidate(BaseModel):
    id: str
    title: str
    company: str


class MatchRequest(BaseModel):
    email_text: str
    candidates: List[Candidate]


class MatchResponse(BaseModel):
    matched_id: Optional[str] = None
    confidence: float
    matched_title: str


class ExtractRequest(BaseModel):
    subject: str
    sender: str
    snippet: str
    body: str = ""
    category: str = "Jobs"


class ExtractResponse(BaseModel):
    date: str = ""
    time: str = ""
    meeting_link: str = ""
    interviewer: str = ""
    salary: str = ""
    deadline: str = ""
    platform: str = ""
    team_size: str = ""
    prize: str = ""
    stipend: str = ""
    duration: str = ""
    start_date: str = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def health_check():
    return {
        "service": "Mirae Intelligence Engine",
        "status": "healthy",
        "models_loaded": MODELS_LOADED,
    }


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    """Classify an email through the 3-stage pipeline."""
    _require_models()

    combined = f"sender: {req.sender} subject: {req.subject} snippet: {req.snippet} {req.body}"
    X = vectorizer.transform([combined])

    # Stage 1 — relevance
    det_proba = detector_model.predict_proba(X)[0]
    det_pred = detector_model.predict(X)[0]

    if det_pred == 0:
        return AnalyzeResponse(
            is_relevant=False,
            category=None,
            status="Not Relevant",
            confidence=round(float(det_proba.max()), 4),
        )

    # Stage 2 — category
    cat_proba = category_model.predict_proba(X)[0]
    cat_pred = category_model.predict(X)[0]

    # Stage 3 — status
    stat_proba = status_model.predict_proba(X)[0]
    stat_pred = status_model.predict(X)[0]

    # Overall confidence = average of category & status confidences
    confidence = round(float((cat_proba.max() + stat_proba.max()) / 2), 4)

    return AnalyzeResponse(
        is_relevant=True,
        category=str(cat_pred),
        status=str(stat_pred),
        confidence=confidence,
    )


@app.post("/match", response_model=MatchResponse)
def match(req: MatchRequest):
    """Match email text to the best candidate card via cosine similarity."""
    from sklearn.feature_extraction.text import TfidfVectorizer as _TfidfVec
    from sklearn.metrics.pairwise import cosine_similarity

    if not req.candidates:
        return MatchResponse(matched_id=None, confidence=0.0, matched_title="")

    candidate_texts = [f"{c.title} {c.company}" for c in req.candidates]
    all_texts = [req.email_text] + candidate_texts

    # Fit a fresh vectorizer on these texts only
    match_vec = _TfidfVec(stop_words="english")
    tfidf_matrix = match_vec.fit_transform(all_texts)

    email_vec = tfidf_matrix[0:1]
    candidate_vecs = tfidf_matrix[1:]

    similarities = cosine_similarity(email_vec, candidate_vecs).flatten()

    best_idx = int(similarities.argmax())
    best_score = float(similarities[best_idx])

    if best_score < 0.1:
        return MatchResponse(matched_id=None, confidence=round(best_score, 4), matched_title="")

    best_candidate = req.candidates[best_idx]
    return MatchResponse(
        matched_id=best_candidate.id,
        confidence=round(best_score, 4),
        matched_title=best_candidate.title,
    )


@app.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest):
    """Regex-based, category-aware field extraction."""
    combined = f"{req.subject} {req.sender} {req.snippet} {req.body}"

    result = ExtractResponse()

    # ── Shared regex helpers ──────────────────────────────────────────────
    # Date patterns  — "July 8", "Jul 8th", "07/08/2026", "June 15, 2026"
    _DATE_PATTERN = (
        r"(?:"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
        r"\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?"
        r"|"
        r"\d{1,2}/\d{1,2}/\d{2,4}"
        r")"
    )
    # Time patterns  — "11 AM", "3:30 PM", "11:00 AM PST"
    _TIME_PATTERN = r"\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\s*(?:[A-Z]{2,4})?"
    # URL patterns
    _MEET_PATTERN = r"https?://(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)[^\s,)\"']+"
    # Dollar amounts — "$120,000", "$85K", "$5,000"
    _DOLLAR_PATTERN = r"\$[\d,]+(?:K|k)?"

    category = req.category.strip().capitalize()
    if category == "Hackathons":
        category = "Hackathons"

    if category == "Jobs":
        # date
        m = re.search(_DATE_PATTERN, combined, re.IGNORECASE)
        if m:
            result.date = m.group(0).strip()

        # time
        m = re.search(_TIME_PATTERN, combined)
        if m:
            result.time = m.group(0).strip()

        # meeting_link
        m = re.search(_MEET_PATTERN, combined)
        if m:
            result.meeting_link = m.group(0).strip()

        # interviewer — "with Dr. Smith", "interviewer: Jane Doe"
        m = re.search(
            r"(?:with|interviewer[:\s]+)\s*([A-Z][a-z]+(?:\.\s*)?(?:[A-Z][a-z]+)?(?:\s+[A-Z][a-z]+)*)",
            combined,
        )
        if m:
            result.interviewer = m.group(1).strip()

        # salary
        m = re.search(_DOLLAR_PATTERN, combined)
        if m:
            result.salary = m.group(0).strip()

        # deadline — "deadline: July 20", "respond by July 20", "accept by July 25"
        m = re.search(
            r"(?:deadline|respond by|accept by)[:\s]*(" + _DATE_PATTERN + r")",
            combined,
            re.IGNORECASE,
        )
        if m:
            result.deadline = m.group(1).strip()

    elif category == "Hackathons":
        # platform
        for platform_name in ["Devpost", "Unstop", "MLH", "HackerEarth", "Devfolio"]:
            if re.search(platform_name, combined, re.IGNORECASE):
                result.platform = platform_name
                break

        # team_size — "team of 4", "max 4 members", "team size: 4"
        m = re.search(
            r"(?:team\s+(?:of|size)[:\s]*|max\s+)(\d+)\s*(?:members|people|participants)?",
            combined,
            re.IGNORECASE,
        )
        if m:
            result.team_size = m.group(1).strip()

        # submission_deadline (reuses date pattern near "submission" / "due" / "deadline")
        m = re.search(
            r"(?:submissions?\s+(?:due|deadline)|due|deadline)[:\s]*(" + _DATE_PATTERN + r")",
            combined,
            re.IGNORECASE,
        )
        if m:
            result.deadline = m.group(1).strip()
        else:
            m = re.search(_DATE_PATTERN, combined, re.IGNORECASE)
            if m:
                result.deadline = m.group(0).strip()

        # prize
        m = re.search(_DOLLAR_PATTERN, combined)
        if m:
            result.prize = m.group(0).strip()
        else:
            m = re.search(
                r"(?:prize|reward|award)[:\s]*([\w\s,$]+)",
                combined,
                re.IGNORECASE,
            )
            if m:
                result.prize = m.group(1).strip()[:80]

    else:  # Others
        # stipend
        m = re.search(
            r"(?:stipend)[:\s]*(" + _DOLLAR_PATTERN + r")",
            combined,
            re.IGNORECASE,
        )
        if m:
            result.stipend = m.group(1).strip()
        else:
            m = re.search(_DOLLAR_PATTERN, combined)
            if m:
                result.stipend = m.group(0).strip()

        # duration — "3 months", "12 weeks", "10 months"
        m = re.search(r"(\d+)\s*(?:months?|weeks?)", combined, re.IGNORECASE)
        if m:
            result.duration = m.group(0).strip()

        # start_date
        m = re.search(
            r"(?:start(?:s|ing)?(?:\s+date)?)[:\s]*(" + _DATE_PATTERN + r")",
            combined,
            re.IGNORECASE,
        )
        if m:
            result.start_date = m.group(1).strip()
        else:
            m = re.search(_DATE_PATTERN, combined, re.IGNORECASE)
            if m:
                result.start_date = m.group(0).strip()

    return result
