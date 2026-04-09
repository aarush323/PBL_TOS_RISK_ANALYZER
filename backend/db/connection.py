import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# asyncpg doesn't support sslmode/channel_binding in URL query params - handle via connect_args
connect_args = {}
if DATABASE_URL:
    if "sslmode=disable" in DATABASE_URL:
        connect_args["ssl"] = False
        DATABASE_URL = DATABASE_URL.split("?")[0]
    elif "sslmode=require" in DATABASE_URL:
        # Strip all query params (sslmode, channel_binding, etc.) for asyncpg
        DATABASE_URL = DATABASE_URL.split("?")[0]
        connect_args["ssl"] = True

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency: yields an async DB session."""
    async with AsyncSessionLocal() as session:
        yield session
