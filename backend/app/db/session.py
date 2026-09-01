from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings

# Determine async database URL
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    if "aiosqlite" not in db_url:
        db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://")

# Async Engine
engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Sync Engine (for scripts / migrations / sync fallback)
sync_db_url = settings.SYNC_DATABASE_URL
if sync_db_url.startswith("sqlite"):
    sync_engine = create_engine(sync_db_url, connect_args={"check_same_thread": False})
else:
    sync_engine = create_engine(sync_db_url)

SyncSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
