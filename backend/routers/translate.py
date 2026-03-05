"""Translation proxy endpoints (POST /api/translate, GET /api/languages)."""

import os

import httpx
from fastapi import APIRouter, Header, HTTPException

from schemas import LanguageItem, LanguagesResponse, TokenUsage, TranslateRequest, TranslateResponse

router = APIRouter()

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"
GOOGLE_LANGUAGES_URL = (
    "https://translation.googleapis.com/language/translate/v2/languages"
)
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"


def _get_google_api_key(header_key: str = "") -> str:
    """Use header key first, fall back to env. Raise 500 if both missing."""
    key = header_key or os.getenv("GOOGLE_CLOUD_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLOUD_API_KEY is not configured",
        )
    return key


def _get_openai_api_key(header_key: str = "") -> str:
    """Use header key first, fall back to env. Raise 500 if both missing."""
    key = header_key or os.getenv("OPENAI_API_KEY", "")
    if not key:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY is not configured. Set it in backend/.env or provide via settings.",
        )
    return key


async def _translate_google(text: str, source_language: str, target_language: str, api_key_override: str = "") -> str:
    """Translate text via Google Cloud Translation API v2."""
    api_key = _get_google_api_key(api_key_override)

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


async def _translate_llm(
    text: str,
    source_language: str,
    target_language: str,
    context: str = "",
    previous_translations: list[str] | None = None,
    api_key_override: str = "",
    model: str = "gpt-4.1-nano",
) -> tuple[str, TokenUsage]:
    """Translate text via OpenAI ChatGPT API. Returns (translated_text, token_usage)."""
    api_key = _get_openai_api_key(api_key_override)

    system_content = (
        f"You are a professional translator. "
        f"Translate the following text from {source_language} to {target_language}. "
        f"Output ONLY the translated text, nothing else. "
        f"Preserve the original tone and nuance."
    )

    if context:
        system_content += (
            f"\n\nIMPORTANT CONTEXT: The speech is about: {context}. "
            f"Use this context to correct any speech recognition errors "
            f"and choose the most appropriate terminology and translation."
        )

    if previous_translations:
        recent = previous_translations[-5:]
        history_text = "\n".join(f"- {t}" for t in recent)
        system_content += (
            f"\n\nRECENT CONVERSATION for context continuity:\n{history_text}\n"
            f"Use this conversation history to maintain consistency in terminology, "
            f"resolve ambiguous speech recognition, and understand the ongoing topic."
        )

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": text},
    ]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
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
        translated = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError) as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM Translation error: unexpected response format - {exc}",
        )

    usage = data.get("usage", {})
    token_usage = TokenUsage(
        prompt_tokens=usage.get("prompt_tokens", 0),
        completion_tokens=usage.get("completion_tokens", 0),
        total_tokens=usage.get("total_tokens", 0),
    )

    return translated, token_usage


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    body: TranslateRequest,
    x_google_api_key: str = Header("", alias="X-Google-API-Key"),
    x_openai_api_key: str = Header("", alias="X-OpenAI-API-Key"),
) -> TranslateResponse:
    """Translate text via Google Cloud Translation API v2 or OpenAI LLM."""
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    if not body.source_language:
        raise HTTPException(status_code=400, detail="source_language must not be empty")
    if not body.target_language:
        raise HTTPException(status_code=400, detail="target_language must not be empty")

    token_usage = None
    if body.engine == "llm":
        translated, token_usage = await _translate_llm(
            body.text,
            body.source_language,
            body.target_language,
            body.context,
            body.previous_translations,
            api_key_override=x_openai_api_key,
            model=body.model,
        )
    else:
        translated = await _translate_google(
            body.text, body.source_language, body.target_language,
            api_key_override=x_google_api_key,
        )

    return TranslateResponse(
        translated_text=translated,
        source_language=body.source_language,
        target_language=body.target_language,
        token_usage=token_usage,
    )


@router.post("/test-key")
async def test_api_key(
    x_google_api_key: str = Header("", alias="X-Google-API-Key"),
    x_openai_api_key: str = Header("", alias="X-OpenAI-API-Key"),
) -> dict:
    """Test if the provided API key is valid."""
    results: dict[str, str] = {}

    if x_google_api_key:
        try:
            await _translate_google("hello", "en", "ko", api_key_override=x_google_api_key)
            results["google"] = "ok"
        except HTTPException as exc:
            results["google"] = exc.detail

    if x_openai_api_key:
        try:
            await _translate_llm("hello", "en", "ko", api_key_override=x_openai_api_key)
            results["openai"] = "ok"
        except HTTPException as exc:
            results["openai"] = exc.detail

    if not results:
        raise HTTPException(status_code=400, detail="No API key provided")

    return results


@router.get("/languages", response_model=LanguagesResponse)
async def list_languages(
    x_google_api_key: str = Header("", alias="X-Google-API-Key"),
) -> LanguagesResponse:
    """Fetch supported languages from Google Cloud Translation API v2."""
    api_key = _get_google_api_key(x_google_api_key)

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
