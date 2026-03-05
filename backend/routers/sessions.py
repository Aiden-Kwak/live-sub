"""Session and log endpoints."""

import uuid as uuid_mod
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import TranslationLog, TranslationSession
from schemas import (
    LogCreateRequest,
    LogResponse,
    LogsResponse,
    SessionCreateRequest,
    SessionDetailResponse,
    SessionResponse,
)

router = APIRouter()


def _validate_uuid(session_id: str) -> str:
    """Validate that session_id is a valid UUID format."""
    try:
        uuid_mod.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")
    return session_id


async def _get_session(session_id: str, db: AsyncSession) -> TranslationSession:
    """Fetch a session by id, raise 404 if not found."""
    _validate_uuid(session_id)
    result = await db.execute(
        select(TranslationSession).where(TranslationSession.id == session_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# --- Session endpoints ---


@router.post("/sessions", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: SessionCreateRequest, db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    """Create a new translation session.

    Procedure:
    1. Validate source_language and target_language are not empty.
    2. Generate UUID v4.
    3. Set created_at to current UTC time.
    4. INSERT into DB.
    5. Return 201.
    """
    if not body.source_language or not body.source_language.strip():
        raise HTTPException(
            status_code=400,
            detail="source_language and target_language are required",
        )
    if not body.target_language or not body.target_language.strip():
        raise HTTPException(
            status_code=400,
            detail="source_language and target_language are required",
        )

    now = datetime.now(timezone.utc)
    session = TranslationSession(
        id=str(uuid_mod.uuid4()),
        source_language=body.source_language.strip(),
        target_language=body.target_language.strip(),
        created_at=now,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionResponse(
        id=session.id,
        source_language=session.source_language,
        target_language=session.target_language,
        created_at=session.created_at,
        ended_at=session.ended_at,
    )


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str, db: AsyncSession = Depends(get_db)
) -> SessionDetailResponse:
    """Get session detail with translation logs.

    Procedure:
    1. Validate UUID format.
    2. Fetch session from DB, 404 if not found.
    3. Fetch logs ordered by created_at ASC.
    4. Return session + logs.
    """
    session = await _get_session(session_id, db)

    result = await db.execute(
        select(TranslationLog)
        .where(TranslationLog.session_id == session_id)
        .order_by(TranslationLog.created_at.asc())
    )
    logs = result.scalars().all()

    return SessionDetailResponse(
        id=session.id,
        source_language=session.source_language,
        target_language=session.target_language,
        created_at=session.created_at,
        ended_at=session.ended_at,
        logs=[
            LogResponse(
                id=log.id,
                session_id=log.session_id,
                original_text=log.original_text,
                translated_text=log.translated_text,
                confidence=log.confidence,
                created_at=log.created_at,
            )
            for log in logs
        ],
    )


@router.patch("/sessions/{session_id}", response_model=SessionResponse)
async def end_session(
    session_id: str, db: AsyncSession = Depends(get_db)
) -> SessionResponse:
    """End a translation session by setting ended_at to current UTC time.

    Procedure:
    1. Validate UUID format.
    2. Fetch session, 404 if not found.
    3. If already ended, return 400.
    4. Set ended_at to now.
    5. Return updated session.
    """
    session = await _get_session(session_id, db)

    if session.ended_at is not None:
        raise HTTPException(status_code=400, detail="Session already ended")

    session.ended_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)

    return SessionResponse(
        id=session.id,
        source_language=session.source_language,
        target_language=session.target_language,
        created_at=session.created_at,
        ended_at=session.ended_at,
    )


# --- Log endpoints ---


@router.post(
    "/sessions/{session_id}/logs",
    response_model=LogResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_log(
    session_id: str,
    body: LogCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> LogResponse:
    """Add a translation log entry to a session.

    Procedure:
    1. Validate UUID format.
    2. Verify session exists, 404 if not.
    3. Validate original_text and translated_text are not empty.
    4. Validate confidence range if provided (handled by Pydantic ge/le).
    5. INSERT log into DB.
    6. Return 201.
    """
    await _get_session(session_id, db)

    if not body.original_text or not body.original_text.strip():
        raise HTTPException(
            status_code=400,
            detail="original_text and translated_text are required",
        )
    if not body.translated_text or not body.translated_text.strip():
        raise HTTPException(
            status_code=400,
            detail="original_text and translated_text are required",
        )

    now = datetime.now(timezone.utc)
    log = TranslationLog(
        session_id=session_id,
        original_text=body.original_text,
        translated_text=body.translated_text,
        confidence=body.confidence,
        created_at=now,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    return LogResponse(
        id=log.id,
        session_id=log.session_id,
        original_text=log.original_text,
        translated_text=log.translated_text,
        confidence=log.confidence,
        created_at=log.created_at,
    )


@router.get("/sessions/{session_id}/logs", response_model=LogsResponse)
async def list_logs(
    session_id: str, db: AsyncSession = Depends(get_db)
) -> LogsResponse:
    """List all translation logs for a session.

    Procedure:
    1. Validate UUID format.
    2. Verify session exists, 404 if not.
    3. Fetch logs ordered by created_at ASC.
    4. Return logs array.
    """
    await _get_session(session_id, db)

    result = await db.execute(
        select(TranslationLog)
        .where(TranslationLog.session_id == session_id)
        .order_by(TranslationLog.created_at.asc())
    )
    logs = result.scalars().all()

    return LogsResponse(
        logs=[
            LogResponse(
                id=log.id,
                session_id=log.session_id,
                original_text=log.original_text,
                translated_text=log.translated_text,
                confidence=log.confidence,
                created_at=log.created_at,
            )
            for log in logs
        ]
    )
