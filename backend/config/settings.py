import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # API Keys - Set these via environment variables or .env file
    # DO NOT hardcode API keys here
    NASA_FIRMS_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    OPENAQ_API_KEY: str = ""
    AQICN_API_TOKEN: str = ""
    NASA_EARTHDATA_API_KEY: str = ""
    MAPBOX_TOKEN: str = ""

    # Database
    DATABASE_PATH: str = "./cache/aetherscan.db"

    # Cache
    TILE_CACHE_DIR: str = "./cache/tiles"
    DATA_CACHE_DIR: str = str(Path(__file__).parent.parent / "cache" / "data")
    CACHE_EXPIRY_HOURS: int = 24

    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Data Source URLs
    OPENAQ_API_URL: str = "https://api.openaq.org/v3"
    OPENWEATHER_API_URL: str = "https://api.openweathermap.org/data/2.5"
    BHUVAN_WMS_URL: str = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms"
    NASA_FIRMS_URL: str = "https://firms.modaps.eosdis.nasa.gov/api"
    OGD_INDIA_URL: str = "https://data.gov.in"
    AQICN_API_URL: str = "https://api.waqi.info"

    # Geographic bounds (India)
    INDIA_BOUNDS: dict = {
        "min_lat": 6.0,
        "max_lat": 37.0,
        "min_lon": 68.0,
        "max_lon": 98.0
    }

    # IDW Parameters
    IDW_POWER: float = 2.0
    IDW_SMOOTHING: float = 0.0
    IDW_NEIGHBORS: int = 10

    # Tile Settings
    TILE_SIZE: int = 256
    MAX_ZOOM: int = 12
    MIN_ZOOM: int = 4

    class Config:
        env_file = ".env"
        case_sensitive = True

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    def ensure_cache_dirs(self):
        """Create cache directories if they don't exist"""
        Path(self.TILE_CACHE_DIR).mkdir(parents=True, exist_ok=True)
        Path(self.DATA_CACHE_DIR).mkdir(parents=True, exist_ok=True)
        Path(self.DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_cache_dirs()
