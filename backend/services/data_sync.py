"""
AetherScan Data Synchronization & Real Ingestion Engine
Automates downloading, DQS quality processing, and local database caching for:
1. NASA FIRMS VIIRS/MODIS active fires across India
2. OpenAQ v3 monitoring stations & real pollutant measurements across India
3. WRI Global Power Plant Database industrial facilities

Ensures all layer endpoints (/layers/pollution-heatmap, /layers/state-heatmap,
/layers/aqi-heatmap, /layers/sensors, /layers/crop-burning) respond in <20ms directly
from local SQLite database without 30-second network stalls.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

try:
    from config.settings import settings
except ImportError:
    from backend.config.settings import settings

try:
    from db.database import db_manager
except ImportError:
    from backend.db.database import db_manager

try:
    from core.quality import calculate_dqs
except ImportError:
    from backend.core.quality import calculate_dqs

try:
    from data_sources.nasa_firms_loader import nasa_firms_loader
except ImportError:
    from backend.data_sources.nasa_firms_loader import nasa_firms_loader

try:
    from data_sources.global_power_plant_loader import global_power_plant_loader
except ImportError:
    from backend.data_sources.global_power_plant_loader import global_power_plant_loader

logger = logging.getLogger(__name__)

# Global in-memory cache for aggregated layer responses (TTL = 5 minutes)
_LAYER_CACHE: Dict[str, Dict[str, Any]] = {}
_CACHE_TTL = 300.0


def get_cached_layer(layer_key: str) -> Optional[Dict[str, Any]]:
    """Retrieve layer from memory cache if not expired."""
    import os
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None
    entry = _LAYER_CACHE.get(layer_key)
    if entry and (time.monotonic() - entry["timestamp"]) < _CACHE_TTL:
        return entry["data"]
    return None


def set_cached_layer(layer_key: str, data: Dict[str, Any]) -> None:
    """Store layer in memory cache with current timestamp."""
    _LAYER_CACHE[layer_key] = {
        "timestamp": time.monotonic(),
        "data": data
    }


class DataSyncService:
    """Service managing automated ingestion of real environmental datasets into SQLite."""

    def __init__(self):
        self.openaq_api_key = getattr(settings, "OPENAQ_API_KEY", "") or ""
        self.firms_api_key = getattr(settings, "NASA_FIRMS_API_KEY", "") or ""

    async def sync_industries(self) -> int:
        """Seed GPPD power plants into industries table if empty."""
        await db_manager.initialize()
        row = await db_manager.fetch_one("SELECT count(*) as cnt FROM industries")
        if row and row["cnt"] > 3:
            logger.info(f"[DATA_SYNC] Industries already seeded ({row['cnt']} facilities).")
            return row["cnt"]
        if row and row["cnt"] > 0:
            await db_manager.execute("DELETE FROM industries")

        plants = global_power_plant_loader.load_india_power_plants()
        if not plants:
            logger.warning("[DATA_SYNC] No GPPD power plants found in CSV loader.")
            return 0

        rows = [
            (
                p.get("name", "Unknown Plant"),
                p.get("primary_fuel", "power_plant"),
                float(p.get("latitude")),
                float(p.get("longitude")),
                "IND",
                f"{p.get('capacity_mw', 0)} MW"
            )
            for p in plants
            if p.get("latitude") is not None and p.get("longitude") is not None
        ]

        if rows and db_manager._db:
            await db_manager._db.executemany(
                """
                INSERT INTO industries (name, type, latitude, longitude, state, capacity)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                rows
            )
            await db_manager._db.commit()
            logger.info(f"[DATA_SYNC] Successfully seeded {len(rows)} industrial facilities into SQLite.")
            return len(rows)
        return 0

    async def sync_nasa_firms(self, days: int = 3) -> int:
        """Fetch real active fire hotspots from NASA FIRMS and save to SQLite."""
        await db_manager.initialize()
        logger.info(f"[DATA_SYNC] Fetching NASA FIRMS active fire hotspots (past {days} days)...")
        try:
            fires = await nasa_firms_loader.fetch_active_fires(days=days)
            if not fires:
                logger.warning("[DATA_SYNC] No fires returned by NASA FIRMS.")
                return 0

            await nasa_firms_loader.save_to_database(fires)
            row = await db_manager.fetch_one("SELECT count(*) as cnt FROM nasa_firms_fires")
            total = row["cnt"] if row else len(fires)
            logger.info(f"[DATA_SYNC] Successfully stored {len(fires)} active fires (Total in DB: {total}).")
            return len(fires)
        except Exception as e:
            logger.error(f"[DATA_SYNC] Failed to sync NASA FIRMS data: {e}", exc_info=True)
            return 0

    async def sync_openaq(self, location_limit: int = 50) -> Dict[str, int]:
        """
        Fetch real OpenAQ v3 monitoring stations & latest measurements for India.
        Computes observation-level DQS and batch inserts into SQLite.
        """
        await db_manager.initialize()
        logger.info(f"[DATA_SYNC] Querying OpenAQ v3 for India (limit={location_limit} locations)...")

        headers = {}
        if self.openaq_api_key:
            headers["X-API-Key"] = self.openaq_api_key

        st_rows = []
        m_rows = []
        sem = asyncio.Semaphore(6)

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.get(
                    "https://api.openaq.org/v3/locations?countries_id=9&limit=" + str(location_limit),
                    headers=headers
                )
                if resp.status_code != 200:
                    logger.warning(f"[DATA_SYNC] OpenAQ locations returned HTTP {resp.status_code}: {resp.text[:100]}")
                    return {"stations": 0, "measurements": 0}

                data = resp.json()
                locations = data.get("results", [])
                logger.info(f"[DATA_SYNC] Discovered {len(locations)} OpenAQ locations in India.")

                async def fetch_station_latest(loc: Dict[str, Any]):
                    loc_id = loc.get("id")
                    if not loc_id:
                        return

                    coords = loc.get("coordinates") or {}
                    lat = coords.get("latitude")
                    lon = coords.get("longitude")
                    if lat is None or lon is None:
                        return

                    name = loc.get("name", f"Station {loc_id}")
                    city = loc.get("locality") or loc.get("city") or ""
                    sensors = loc.get("sensors") or []
                    param_names = [s.get("parameter", {}).get("name") for s in sensors if s.get("parameter", {}).get("name")]
                    last_dt = loc.get("datetimeLast", {})
                    last_updated_str = last_dt.get("utc", "") if isinstance(last_dt, dict) else ""

                    st_rows.append((
                        str(loc_id),
                        name,
                        float(lat),
                        float(lon),
                        city,
                        "IN",
                        last_updated_str,
                        json.dumps(param_names)
                    ))

                    # Fetch latest real observations
                    async with sem:
                        try:
                            m_resp = await client.get(
                                f"https://api.openaq.org/v3/locations/{loc_id}/latest",
                                headers=headers
                            )
                            if m_resp.status_code == 200:
                                m_data = m_resp.json()
                                for item in m_data.get("results", []):
                                    sensor_id = item.get("sensorsId")
                                    val = item.get("value")
                                    dt_info = item.get("datetime") or {}
                                    ts = dt_info.get("utc", "") if isinstance(dt_info, dict) else ""

                                    param = "pm25"
                                    unit = "ug/m3"
                                    for s in sensors:
                                        if s.get("id") == sensor_id:
                                            p_obj = s.get("parameter", {})
                                            param = p_obj.get("name", "pm25").lower()
                                            unit = p_obj.get("units", "ug/m3")
                                            break

                                    if val is not None and ts:
                                        try:
                                            f_val = float(val)
                                            if f_val >= 0:
                                                dqs_score = calculate_dqs(
                                                    value=f_val,
                                                    parameter=param,
                                                    timestamp=ts,
                                                    sensor_type="ground_station",
                                                    distance_km=0.0
                                                )
                                                m_rows.append((
                                                    str(loc_id),
                                                    param,
                                                    f_val,
                                                    unit,
                                                    ts,
                                                    dqs_score
                                                ))
                                        except (ValueError, TypeError):
                                            continue
                        except Exception as m_err:
                            logger.debug(f"[DATA_SYNC] Error fetching latest for station {loc_id}: {m_err}")

                # Run concurrent latest measurement queries
                tasks = [fetch_station_latest(loc) for loc in locations]
                await asyncio.gather(*tasks)

                # Batch insert stations into SQLite
                if st_rows and db_manager._db:
                    await db_manager._db.executemany(
                        """
                        INSERT OR REPLACE INTO openaq_stations
                        (station_id, name, latitude, longitude, city, country, last_updated, parameters)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        st_rows
                    )
                    await db_manager._db.commit()

                # Batch insert measurements into SQLite
                if m_rows and db_manager._db:
                    await db_manager._db.executemany(
                        """
                        INSERT INTO openaq_measurements
                        (station_id, parameter, value, unit, timestamp, dqs)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        m_rows
                    )
                    await db_manager._db.commit()

                logger.info(f"[DATA_SYNC] Stored {len(st_rows)} stations and {len(m_rows)} real observations in SQLite.")
                return {"stations": len(st_rows), "measurements": len(m_rows)}
        except Exception as e:
            logger.error(f"[DATA_SYNC] OpenAQ sync error: {e}", exc_info=True)
            return {"stations": 0, "measurements": 0}

    async def sync_openmeteo(self) -> Dict[str, int]:
        """
        Fetch real-time Copernicus ECMWF/CAMS observations across India from Open-Meteo.
        Computes observation-level DQS and batch inserts into SQLite.
        Runs without requiring any API keys.
        """
        await db_manager.initialize()
        logger.info("[DATA_SYNC] Querying Open-Meteo / Copernicus ECMWF for India...")

        try:
            from data_sources.openmeteo_provider import openmeteo_provider
            raw_data = await openmeteo_provider.fetch_data()
            if not raw_data:
                logger.warning("[DATA_SYNC] No data returned by Open-Meteo.")
                return {"stations": 0, "measurements": 0}

            processed = await openmeteo_provider.process_data(raw_data)
            stations = processed.get("stations", [])
            measurements = processed.get("measurements", [])

            st_rows = [
                (
                    s["station_id"],
                    s["name"],
                    s["latitude"],
                    s["longitude"],
                    s["city"],
                    s["country"],
                    s["last_updated"],
                    s["parameters"]
                )
                for s in stations
            ]

            m_rows = [
                (
                    m["station_id"],
                    m["parameter"],
                    m["value"],
                    m["unit"],
                    m["timestamp"],
                    m["dqs"]
                )
                for m in measurements
            ]

            if st_rows and db_manager._db:
                await db_manager._db.executemany(
                    """
                    INSERT OR REPLACE INTO openaq_stations
                    (station_id, name, latitude, longitude, city, country, last_updated, parameters)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    st_rows
                )
                await db_manager._db.commit()

            if m_rows and db_manager._db:
                await db_manager._db.executemany(
                    """
                    INSERT INTO openaq_measurements
                    (station_id, parameter, value, unit, timestamp, dqs)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    m_rows
                )
                await db_manager._db.commit()

            logger.info(f"[DATA_SYNC] Stored {len(st_rows)} Copernicus stations and {len(m_rows)} real observations in SQLite.")
            return {"stations": len(st_rows), "measurements": len(m_rows)}
        except Exception as e:
            logger.error(f"[DATA_SYNC] Open-Meteo sync error: {e}", exc_info=True)
            return {"stations": 0, "measurements": 0}

    async def run_full_sync(self):
        """Run all data synchronization tasks concurrently."""
        logger.info("[DATA_SYNC] Starting full environmental intelligence synchronization...")
        t0 = time.monotonic()
        results = await asyncio.gather(
            self.sync_industries(),
            self.sync_nasa_firms(days=3),
            self.sync_openaq(location_limit=40),
            self.sync_openmeteo(),
            return_exceptions=True
        )
        elapsed = time.monotonic() - t0
        logger.info(f"[DATA_SYNC] Full synchronization finished in {elapsed:.2f}s: {results}")


data_sync_service = DataSyncService()

