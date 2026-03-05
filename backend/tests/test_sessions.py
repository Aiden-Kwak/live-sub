"""Tests for session and log CRUD endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient) -> None:
    """POST /api/sessions should create a session and return 201."""
    payload = {"source_language": "ko", "target_language": "en"}
    response = await client.post("/api/sessions", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["source_language"] == "ko"
    assert data["target_language"] == "en"
    assert "id" in data
    assert "created_at" in data
    assert data.get("ended_at") is None


@pytest.mark.asyncio
async def test_create_session_empty_language(client: AsyncClient) -> None:
    """POST /api/sessions with empty language should return 400."""
    payload = {"source_language": "", "target_language": "en"}
    response = await client.post("/api/sessions", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_session_detail(client: AsyncClient) -> None:
    """GET /api/sessions/{id} should return session with empty logs."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    response = await client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session_id
    assert data["logs"] == []


@pytest.mark.asyncio
async def test_get_session_not_found(client: AsyncClient) -> None:
    """GET /api/sessions/{id} for non-existent session should return 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/sessions/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_session_invalid_uuid(client: AsyncClient) -> None:
    """GET /api/sessions/{id} with invalid UUID should return 400."""
    response = await client.get("/api/sessions/not-a-uuid")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_end_session(client: AsyncClient) -> None:
    """PATCH /api/sessions/{id} should set ended_at."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    response = await client.patch(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["ended_at"] is not None


@pytest.mark.asyncio
async def test_end_session_twice(client: AsyncClient) -> None:
    """PATCH /api/sessions/{id} on already-ended session should return 400."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    await client.patch(f"/api/sessions/{session_id}")
    response = await client.patch(f"/api/sessions/{session_id}")
    assert response.status_code == 400
    assert "already ended" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_log(client: AsyncClient) -> None:
    """POST /api/sessions/{id}/logs should create a log and return 201."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    log_payload = {
        "original_text": "hello",
        "translated_text": "world",
        "confidence": 0.95,
    }
    response = await client.post(f"/api/sessions/{session_id}/logs", json=log_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["original_text"] == "hello"
    assert data["translated_text"] == "world"
    assert data["confidence"] == 0.95
    assert data["session_id"] == session_id


@pytest.mark.asyncio
async def test_create_log_empty_text(client: AsyncClient) -> None:
    """POST /api/sessions/{id}/logs with empty text should return 400."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    response = await client.post(
        f"/api/sessions/{session_id}/logs",
        json={"original_text": "", "translated_text": "hi"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_create_log_invalid_confidence(client: AsyncClient) -> None:
    """POST /api/sessions/{id}/logs with confidence > 1.0 should return 422."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    response = await client.post(
        f"/api/sessions/{session_id}/logs",
        json={"original_text": "hi", "translated_text": "hello", "confidence": 1.5},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_log_session_not_found(client: AsyncClient) -> None:
    """POST /api/sessions/{id}/logs for non-existent session should return 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.post(
        f"/api/sessions/{fake_id}/logs",
        json={"original_text": "hi", "translated_text": "hello"},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_logs(client: AsyncClient) -> None:
    """GET /api/sessions/{id}/logs should return logs for the session."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ko", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    # Add two logs
    await client.post(
        f"/api/sessions/{session_id}/logs",
        json={"original_text": "one", "translated_text": "uno"},
    )
    await client.post(
        f"/api/sessions/{session_id}/logs",
        json={"original_text": "two", "translated_text": "dos"},
    )

    response = await client.get(f"/api/sessions/{session_id}/logs")
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 2
    assert data["logs"][0]["original_text"] == "one"
    assert data["logs"][1]["original_text"] == "two"


@pytest.mark.asyncio
async def test_list_logs_session_not_found(client: AsyncClient) -> None:
    """GET /api/sessions/{id}/logs for non-existent session should return 404."""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = await client.get(f"/api/sessions/{fake_id}/logs")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_session_detail_includes_logs(client: AsyncClient) -> None:
    """GET /api/sessions/{id} should include logs in response."""
    create_resp = await client.post(
        "/api/sessions", json={"source_language": "ja", "target_language": "en"}
    )
    session_id = create_resp.json()["id"]

    await client.post(
        f"/api/sessions/{session_id}/logs",
        json={"original_text": "konnichiwa", "translated_text": "hello", "confidence": 0.9},
    )

    response = await client.get(f"/api/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["logs"]) == 1
    assert data["logs"][0]["original_text"] == "konnichiwa"
