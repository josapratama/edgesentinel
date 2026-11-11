from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Safe auto-migration for newly added columns in existing SQLite databases
        columns_to_ensure = [
            ("cameras", "connection_status", "VARCHAR(30) DEFAULT 'online'"),
            ("cameras", "error_message", "TEXT"),
            ("cameras", "resolution", "VARCHAR(30)"),
            ("cameras", "roi_polygon_json", "TEXT"),
            ("cameras", "exclusion_zones_json", "TEXT"),
            ("security_events", "video_filename", "VARCHAR(255)"),
            ("security_events", "video_url", "VARCHAR(500)"),
            ("security_events", "is_loitering", "BOOLEAN DEFAULT 0"),
        ]
        for table, col, col_type in columns_to_ensure:
            try:
                await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
            except Exception:
                # Column already exists, safe to ignore
                pass
