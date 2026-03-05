"""Tests for POST /api/translate and GET /api/languages endpoints."""

import os
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_translate_empty_text(client: AsyncClient) -> None:
    """POST /api/translate with empty text should return 400."""
    payload = {"text": "", "source_language": "ko", "target_language": "en"}
    response = await client.post("/api/translate", json=payload)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_translate_whitespace_only(client: AsyncClient) -> None:
    """POST /api/translate with whitespace-only text should return 400."""
    payload = {"text": "   ", "source_language": "ko", "target_language": "en"}
    response = await client.post("/api/translate", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_translate_missing_api_key(client: AsyncClient) -> None:
    """POST /api/translate without API key should return 500."""
    with patch.dict(os.environ, {"GOOGLE_CLOUD_API_KEY": ""}, clear=False):
        payload = {"text": "hello", "source_language": "en", "target_language": "ko"}
        response = await client.post("/api/translate", json=payload)
        assert response.status_code == 500
        assert "not configured" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_translate_success(client: AsyncClient) -> None:
    """POST /api/translate should return translated text on success."""
    google_response = {
        "data": {"translations": [{"translatedText": "Hello"}]}
    }

    mock_response = httpx.Response(
        status_code=200,
        json=google_response,
        request=httpx.Request("POST", "https://example.com"),
    )

    with patch.dict(os.environ, {"GOOGLE_CLOUD_API_KEY": "test-key"}, clear=False):
        with patch("routers.translate.httpx.AsyncClient") as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = mock_response
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_instance

            payload = {"text": "hello", "source_language": "ko", "target_language": "en"}
            response = await client.post("/api/translate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["translated_text"] == "Hello"
    assert data["source_language"] == "ko"
    assert data["target_language"] == "en"


@pytest.mark.asyncio
async def test_translate_llm_missing_api_key(client: AsyncClient) -> None:
    """POST /api/translate with engine=llm without OPENAI_API_KEY should return 500."""
    with patch.dict(os.environ, {"OPENAI_API_KEY": ""}, clear=False):
        payload = {"text": "hello", "source_language": "en", "target_language": "ko", "engine": "llm"}
        response = await client.post("/api/translate", json=payload)
        assert response.status_code == 500
        assert "OPENAI_API_KEY" in response.json()["detail"]


@pytest.mark.asyncio
async def test_translate_llm_success(client: AsyncClient) -> None:
    """POST /api/translate with engine=llm should return LLM-translated text."""
    openai_response = {
        "choices": [{"message": {"content": "안녕하세요"}}]
    }

    mock_response = httpx.Response(
        status_code=200,
        json=openai_response,
        request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions"),
    )

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}, clear=False):
        with patch("routers.translate.httpx.AsyncClient") as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.post.return_value = mock_response
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_instance

            payload = {"text": "hello", "source_language": "en", "target_language": "ko", "engine": "llm"}
            response = await client.post("/api/translate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["translated_text"] == "안녕하세요"
    assert data["source_language"] == "en"
    assert data["target_language"] == "ko"


@pytest.mark.asyncio
async def test_translate_invalid_engine(client: AsyncClient) -> None:
    """POST /api/translate with invalid engine should return 422."""
    payload = {"text": "hello", "source_language": "en", "target_language": "ko", "engine": "invalid"}
    response = await client.post("/api/translate", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_languages_missing_api_key(client: AsyncClient) -> None:
    """GET /api/languages without API key should return 500."""
    with patch.dict(os.environ, {"GOOGLE_CLOUD_API_KEY": ""}, clear=False):
        response = await client.get("/api/languages")
        assert response.status_code == 500


@pytest.mark.asyncio
async def test_languages_success(client: AsyncClient) -> None:
    """GET /api/languages should return language list on success."""
    google_response = {
        "data": {
            "languages": [
                {"language": "ko", "name": "Korean"},
                {"language": "en", "name": "English"},
            ]
        }
    }

    mock_response = httpx.Response(
        status_code=200,
        json=google_response,
        request=httpx.Request("GET", "https://example.com"),
    )

    with patch.dict(os.environ, {"GOOGLE_CLOUD_API_KEY": "test-key"}, clear=False):
        with patch("routers.translate.httpx.AsyncClient") as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.get.return_value = mock_response
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=False)
            mock_client_cls.return_value = mock_instance

            response = await client.get("/api/languages")

    assert response.status_code == 200
    data = response.json()
    assert len(data["languages"]) == 2
    assert data["languages"][0]["code"] == "ko"
    assert data["languages"][0]["name"] == "Korean"
