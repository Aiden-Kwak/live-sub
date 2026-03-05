"""Health check endpoint."""

from datetime import datetime, timezone

from fastapi import APIRouter

from schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return server status and current UTC timestamp."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now(timezone.utc),
    )
