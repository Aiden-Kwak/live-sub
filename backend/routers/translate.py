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
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"


def _get_google_api_key() -> str:
    """Load Google Cloud API key from environment, raise 500 if missing."""
    key = os.getenv("GOOGLE_CLOUD_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLOUD_API_KEY is not configured",
        )
    return key


def _get_openai_api_key() -> str:
    """Load OpenAI API key from environment, raise 500 if missing."""
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Set it in backend/.env to use LLM translation.",
        )
    return key


async def _translate_google(text: str, source_language: str, target_language: str) -> str:
    """Translate text via Google Cloud Translation API v2."""
    api_key = _get_google_api_key()

    params = {"key": api_key}
    payload = {
        "q": text,
        "source": source_language,
        "target": target_language,
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
        return data["data"]["translations"][0]["translatedText"]
    except (KeyError, IndexError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Translation API error: unexpected response format - {exc}",
        )


async def _translate_llm(text: str, source_language: str, target_language: str) -> str:
    """Translate text via OpenAI ChatGPT API."""
    api_key = _get_openai_api_key()

    messages = [
        {
            "role": "system",
            "content": (
                f"You are a professional translator. "
                f"Translate the following text from {source_language} to {target_language}. "
                f"Output ONLY the translated text, nothing else. "
                f"Preserve the original tone and nuance."
            ),
        },
        {"role": "user", "content": text},
    ]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "gpt-4o-mini",
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 1024,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(OPENAI_CHAT_URL, headers=headers, json=payload)
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
            detail=f"LLM Translation error: {error_msg}",
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM Translation error: {exc}",
        )

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM Translation error: unexpected response format - {exc}",
        )


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(body: TranslateRequest) -> TranslateResponse:
    """Translate text via Google Cloud Translation API v2 or OpenAI LLM.

    Procedure:
    1. Validate text is not empty/whitespace.
    2. Validate language codes are not empty.
    3. Route to appropriate engine (google or llm).
    4. Return translated text.
    """
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    if not body.source_language:
        raise HTTPException(status_code=400, detail="source_language must not be empty")
    if not body.target_language:
        raise HTTPException(status_code=400, detail="target_language must not be empty")

    if body.engine == "llm":
        translated = await _translate_llm(
            body.text, body.source_language, body.target_language
        )
    else:
        translated = await _translate_google(
            body.text, body.source_language, body.target_language
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
    api_key = _get_google_api_key()

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
