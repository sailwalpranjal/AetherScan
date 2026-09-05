from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
import os
from pathlib import Path
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

# Use absolute path for sqlite
db_path = Path(settings.DATABASE_PATH).resolve()
# Remove drive letter on Windows for URL if needed, or just let SQLAlchemy handle it
db_url_str = f"sqlite+aiosqlite:///{db_path}"

# Use asyncpg or aiosqlite based on connection string or setting
DATABASE_URL = os.environ.get("DATABASE_URL", db_url_str)

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    future=True,
    pool_pre_ping=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise
