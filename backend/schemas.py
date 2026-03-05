"""Pydantic request/response schemas for LiveSub API."""

from datetime import datetime

from pydantic import BaseModel, Field


# --- Translate ---


class TranslateRequest(BaseModel):
    text: str
    source_language: str = Field(..., max_length=10)
    target_language: str = Field(..., max_length=10)
    engine: str = Field(default="google", pattern="^(google|llm)$")


class TranslateResponse(BaseModel):
    translated_text: str
    source_language: str
    target_language: str


# --- Languages ---


class LanguageItem(BaseModel):
    code: str
    name: str


class LanguagesResponse(BaseModel):
    languages: list[LanguageItem]


# --- Session ---


class SessionCreateRequest(BaseModel):
    source_language: str = Field(..., max_length=10)
    target_language: str = Field(..., max_length=10)


class SessionResponse(BaseModel):
    id: str
    source_language: str
    target_language: str
    created_at: datetime
    ended_at: datetime | None = None


class SessionDetailResponse(SessionResponse):
    logs: list["LogResponse"] = []


# --- Log ---


class LogCreateRequest(BaseModel):
    original_text: str
    translated_text: str
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class LogResponse(BaseModel):
    id: int
    session_id: str
    original_text: str
    translated_text: str
    confidence: float | None = None
    created_at: datetime


class LogsResponse(BaseModel):
    logs: list[LogResponse]


# --- Health ---


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime
