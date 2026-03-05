"""SQLAlchemy ORM models for LiveSub."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class TranslationSession(Base):
    __tablename__ = "translation_sessions"

    id: str = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_language: str = Column(String(10), nullable=False)
    target_language: str = Column(String(10), nullable=False)
    created_at: datetime = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    ended_at: datetime | None = Column(DateTime, nullable=True)

    logs = relationship(
        "TranslationLog", back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_session_created_at", "created_at"),
    )

    def __str__(self) -> str:
        return f"Session({self.id}, {self.source_language}->{self.target_language})"


class TranslationLog(Base):
    __tablename__ = "translation_logs"

    id: int = Column(Integer, primary_key=True, autoincrement=True)
    session_id: str = Column(
        String,
        ForeignKey("translation_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    original_text: str = Column(Text, nullable=False)
    translated_text: str = Column(Text, nullable=False)
    confidence: float | None = Column(Float, nullable=True)
    created_at: datetime = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    session = relationship("TranslationSession", back_populates="logs")

    __table_args__ = (
        Index("idx_log_session_id", "session_id"),
        Index("idx_log_created_at", "created_at"),
    )

    def __str__(self) -> str:
        return f"Log({self.id}, session={self.session_id})"
