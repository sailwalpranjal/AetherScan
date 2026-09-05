"""
Database models and session re-exports for backward compatibility.
Provides direct access to Base, engine, AsyncSessionLocal, init_db, db_manager,
and all domain models.
"""
try:
    from db.database import (
        Base,
        engine,
        AsyncSessionLocal,
        get_db,
        init_db,
        db_manager,
        DatabaseManager,
    )
except ImportError:
    from backend.db.database import (
        Base,
        engine,
        AsyncSessionLocal,
        get_db,
        init_db,
        db_manager,
        DatabaseManager,
    )

try:
    from models.domain import (
        OpenAQStation,
        OpenAQMeasurement,
        NASAFirmsFire,
        Industry,
        PopulationData,
        CacheMetadata,
    )
except ImportError:
    from backend.models.domain import (
        OpenAQStation,
        OpenAQMeasurement,
        NASAFirmsFire,
        Industry,
        PopulationData,
        CacheMetadata,
    )

__all__ = [
    "Base",
    "engine",
    "AsyncSessionLocal",
    "get_db",
    "init_db",
    "db_manager",
    "DatabaseManager",
    "OpenAQStation",
    "OpenAQMeasurement",
    "NASAFirmsFire",
    "Industry",
    "PopulationData",
    "CacheMetadata",
]
