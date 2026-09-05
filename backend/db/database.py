import asyncio
import logging
import os
from pathlib import Path
from typing import Optional, Union, List, Dict, Any

import aiosqlite
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

try:
    from config.settings import settings
except ImportError:
    from backend.config.settings import settings

logger = logging.getLogger(__name__)

# Use absolute path for sqlite
db_path = Path(settings.DATABASE_PATH).resolve()
db_url_str = f"sqlite+aiosqlite:///{db_path}"

# Use asyncpg or aiosqlite based on connection string or setting
DATABASE_URL = os.environ.get("DATABASE_URL", db_url_str)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


def _ensure_models_registered() -> None:
    """Ensure all SQLAlchemy domain models are imported and registered on Base.metadata."""
    try:
        import models.domain  # noqa: F401
    except ImportError:
        try:
            import backend.models.domain  # noqa: F401
        except ImportError:
            pass


# Automatically register domain models upon module load
_ensure_models_registered()


async def get_db():
    """Dependency helper yielding an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session


async def init_db(engine_override=None):
    """
    Initialize database schema by creating all tables registered on Base.metadata.
    Accepts an optional engine_override for testing custom SQLite in-memory or file databases.
    """
    _ensure_models_registered()
    target_engine = engine_override or engine

    def _create_and_migrate(sync_conn):
        Base.metadata.create_all(sync_conn)
        try:
            for table_name in ("openaq_measurements", "nasa_firms_fires"):
                pragma_res = sync_conn.execute(text(f"PRAGMA table_info({table_name})"))
                cols = [row[1] for row in pragma_res.fetchall()]
                if cols and "dqs" not in cols:
                    sync_conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN dqs REAL"))
                    logger.info(f"Added missing 'dqs' column to {table_name}.")
        except Exception as mig_err:
            logger.debug(f"SQLite PRAGMA migration skipped: {mig_err}")

    try:
        async with target_engine.begin() as conn:
            await conn.run_sync(_create_and_migrate)
            logger.info("Database tables created successfully.")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


class DatabaseManager:
    """
    Backwards-compatibility singleton database manager.
    Provides raw async SQL execution and table management for legacy callers
    (main.py, test_server.py, census_loader.py, ogd_india_loader.py, facility_intelligence.py)
    while maintaining alignment with SQLAlchemy models.
    """

    _instance: Optional["DatabaseManager"] = None
    _db: Optional[aiosqlite.Connection] = None
    _db_path: Optional[str] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self, db_path: Optional[str] = None):
        """Initialize database connection and ensure all tables exist."""
        if self._db is None:
            self._db_path = db_path or str(Path(settings.DATABASE_PATH).resolve())
            if str(self._db_path) != ":memory:":
                Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)

            self._db = await aiosqlite.connect(self._db_path)
            self._db.row_factory = aiosqlite.Row

            if str(self._db_path) == ":memory:":
                await self._create_tables()
            else:
                await init_db()

    async def _create_tables(self):
        """Create standard tables for in-memory or raw SQLite instances."""
        _ensure_models_registered()
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS openaq_stations (
                station_id TEXT PRIMARY KEY,
                name TEXT,
                latitude REAL,
                longitude REAL,
                city TEXT,
                country TEXT,
                last_updated TEXT,
                parameters TEXT
            )
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS openaq_measurements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                station_id TEXT,
                parameter TEXT,
                value REAL,
                unit TEXT,
                timestamp TEXT,
                dqs REAL,
                FOREIGN KEY (station_id) REFERENCES openaq_stations(station_id)
            )
        """)
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_measurements_station
            ON openaq_measurements(station_id)
        """)
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_measurements_timestamp
            ON openaq_measurements(timestamp)
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS nasa_firms_fires (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                latitude REAL,
                longitude REAL,
                brightness REAL,
                scan REAL,
                track REAL,
                acq_date TEXT,
                acq_time TEXT,
                satellite TEXT,
                confidence TEXT,
                frp REAL,
                dqs REAL
            )
        """)
        await self._db.execute("""
            CREATE INDEX IF NOT EXISTS idx_fires_date
            ON nasa_firms_fires(acq_date)
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS industries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                type TEXT,
                latitude REAL,
                longitude REAL,
                state TEXT,
                capacity TEXT
            )
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS population_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                location TEXT,
                latitude REAL,
                longitude REAL,
                population INTEGER,
                density REAL,
                state TEXT
            )
        """)
        await self._db.execute("""
            CREATE TABLE IF NOT EXISTS cache_metadata (
                key TEXT PRIMARY KEY,
                timestamp TEXT,
                data_type TEXT,
                expiry TEXT
            )
        """)
        await self._db.commit()

    async def execute(self, query: str, params: Union[tuple, dict] = ()):
        """Execute a query and commit."""
        if self._db is None:
            await self.initialize()
        cursor = await self._db.execute(query, params)
        await self._db.commit()
        return cursor

    async def fetch_all(self, query: str, params: Union[tuple, dict] = ()):
        """Fetch all matching rows as aiosqlite.Row objects."""
        if self._db is None:
            await self.initialize()
        async with self._db.execute(query, params) as cursor:
            return await cursor.fetchall()

    async def fetch_one(self, query: str, params: Union[tuple, dict] = ()):
        """Fetch a single matching row as an aiosqlite.Row object."""
        if self._db is None:
            await self.initialize()
        async with self._db.execute(query, params) as cursor:
            return await cursor.fetchone()

    async def close(self):
        """Close database connection."""
        if self._db:
            await self._db.close()
            self._db = None


db_manager = DatabaseManager()

__all__ = [
    "Base",
    "engine",
    "AsyncSessionLocal",
    "get_db",
    "init_db",
    "db_manager",
    "DatabaseManager",
]
