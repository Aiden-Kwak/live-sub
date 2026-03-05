"""Translation proxy endpoints (POST /api/translate, GET /api/languages)."""

import os

import httpx
from fastapi import APIRouter, HTTPException

from schemas import LanguageItem, LanguagesResponse, TranslateRequest, TranslateResponse

router = APIRouter()

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
GOOGLE_LANGUAGES_URL = (
    "https://translation.googleapis.com/language/translate/v2/languages"
)


def _get_api_key() -> str:
    """Load Google Cloud API key from environment, raise 500 if missing."""
    key = os.getenv("GOOGLE_CLOUD_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLOUD_API_KEY is not configured",
        )
    return key


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(body: TranslateRequest) -> TranslateResponse:
    """Translate text via Google Cloud Translation API v2.

    Procedure:
    1. Validate text is not empty/whitespace.
    2. Validate language codes are not empty.
    3. Call Google Translation API.
    4. Return translated text.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    if not body.source_language:
        raise HTTPException(status_code=400, detail="source_language must not be empty")
    if not body.target_language:
        raise HTTPException(status_code=400, detail="target_language must not be empty")

    api_key = _get_api_key()

    params = {"key": api_key}
    payload = {
        "q": body.text,
        "source": body.source_language,
        "target": body.target_language,
        "format": "text",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(GOOGLE_TRANSLATE_URL, params=params, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        error_msg = str(exc)
        try:
            error_data = exc.response.json()
            error_msg = error_data.get("error", {}).get("message", error_msg)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Translation API error: {error_msg}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Translation API error: {exc}",
        )

    try:
        translated = data["data"]["translations"][0]["translatedText"]
    except (KeyError, IndexError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Translation API error: unexpected response format - {exc}",
        )

    return TranslateResponse(
        translated_text=translated,
        source_language=body.source_language,
        target_language=body.target_language,
    )


@router.get("/languages", response_model=LanguagesResponse)
async def list_languages() -> LanguagesResponse:
    """Fetch supported languages from Google Cloud Translation API v2.

    Procedure:
    1. Call Google Languages API with target=en for English names.
    2. Return list of {code, name} objects.
    """
    api_key = _get_api_key()

    params = {"key": api_key, "target": "en"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(GOOGLE_LANGUAGES_URL, params=params)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        error_msg = str(exc)
        try:
            error_data = exc.response.json()
            error_msg = error_data.get("error", {}).get("message", error_msg)
        except Exception:
            pass
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch languages: {error_msg}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch languages: {exc}",
        )

    try:
        raw_languages = data["data"]["languages"]
    except KeyError:
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch languages: unexpected response format",
        )

    languages = [
        LanguageItem(code=lang["language"], name=lang.get("name", lang["language"]))
        for lang in raw_languages
    ]

    return LanguagesResponse(languages=languages)
