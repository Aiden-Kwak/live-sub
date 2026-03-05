"""Database engine and session configuration for SQLite with SQLAlchemy async."""

from pathlib import Path

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite+aiosqlite:///{BASE_DIR / 'livesub.db'}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_connection: object, _connection_record: object) -> None:
    """Enable foreign key enforcement on every SQLite connection."""
    cursor = dbapi_connection.cursor()  # type: ignore[union-attr]
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.close()


async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    """Yield an async database session for FastAPI dependency injection."""
    async with async_session() as session:
        yield session
