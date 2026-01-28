import aiosqlite
from pathlib import Path
from typing import Optional
from config.settings import settings

class DatabaseManager:
    """Singleton database manager for SQLite"""

    _instance: Optional['DatabaseManager'] = None
    _db: Optional[aiosqlite.Connection] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self):
        """Initialize database and create tables"""
        if self._db is None:
            db_path = Path(settings.DATABASE_PATH)
            db_path.parent.mkdir(parents=True, exist_ok=True)

            self._db = await aiosqlite.connect(str(db_path))
            self._db.row_factory = aiosqlite.Row

            await self._create_tables()

    async def _create_tables(self):
        """Create all required tables"""
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
                frp REAL
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

    async def execute(self, query: str, params: tuple = ()):
        """Execute a query"""
        if self._db is None:
            await self.initialize()
        cursor = await self._db.execute(query, params)
        await self._db.commit()
        return cursor

    async def fetch_all(self, query: str, params: tuple = ()):
        """Fetch all results"""
        if self._db is None:
            await self.initialize()
        async with self._db.execute(query, params) as cursor:
            return await cursor.fetchall()

    async def fetch_one(self, query: str, params: tuple = ()):
        """Fetch one result"""
        if self._db is None:
            await self.initialize()
        async with self._db.execute(query, params) as cursor:
            return await cursor.fetchone()

    async def close(self):
        """Close database connection"""
        if self._db:
            await self._db.close()
            self._db = None

db_manager = DatabaseManager()
