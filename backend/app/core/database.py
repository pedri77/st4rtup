from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


# Fly.io internal network between app and Postgres is already encrypted — no SSL needed
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DEBUG,
    pool_size=15,
    max_overflow=25,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=10,
    connect_args={
        "ssl": False,
        "command_timeout": 30,
        "server_settings": {"statement_timeout": "30000"},
    },
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
