import os

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.core.config import settings

_is_test = os.getenv("APP_ENV") == "test"

_engine_kwargs = dict(
    echo=settings.DEBUG,
    pool_pre_ping=True,
)

if _is_test:
    # Tests use SQLite in-memory via conftest overrides.
    # NullPool prevents the module-level engine from hoarding PG connections
    # that are never used but count against max_connections.
    _engine_kwargs["poolclass"] = NullPool
else:
    # Production / development pool settings
    _engine_kwargs.update(
        pool_size=15,
        max_overflow=25,
        pool_recycle=300,
        pool_timeout=10,
    )

# Fly.io internal network between app and Postgres is already encrypted — no SSL needed
engine = create_async_engine(
    settings.async_database_url,
    connect_args={
        "ssl": False,
        "command_timeout": 30,
        "server_settings": {"statement_timeout": "30000"},
    },
    **_engine_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
