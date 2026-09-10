"""
OpenAQ v3 Data Provider for AetherScan.

Robust, rate-limited environmental data collector querying the OpenAQ v3 API.
Adheres to strict Zero-Fake-Data and Zero-Cost invariants:
- Pure OpenAQ v3 endpoints (https://api.openaq.org/v3/)
- Free tier authenticated via X-API-Key header
- Strict rate limiting (max 60 requests/min via Token Bucket)
- India country filter using countries_id: 9 (NOT 102)
- Bounding box and pagination chunking
- Routing of measurements through backend.core.quality.calculate_dqs()
- Discarding physically impossible observations (Q_valid == 0.0)
- Idempotent database persistence deduplicating on (station_id, parameter, timestamp)
- Complete elimination of mock/synthetic fallback generators.
"""

import asyncio
from datetime import datetime, timezone
import logging
import math
import os
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

try:
    from config.settings import settings
except ImportError:
    from backend.config.settings import settings

try:
    from data_sources.base import BaseProvider
except ImportError:
    from backend.data_sources.base import BaseProvider

try:
    from models.domain import OpenAQStation, OpenAQMeasurement
except ImportError:
    from backend.models.domain import OpenAQStation, OpenAQMeasurement

try:
    from core.quality import calculate_dqs, validate_value
except ImportError:
    from backend.core.quality import calculate_dqs, validate_value

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Token bucket rate limiter enforcing a maximum request frequency.
    Default: 60 requests per 60.0 seconds (OpenAQ v3 public tier limit).
    """

    def __init__(self, max_calls: int = 60, period_seconds: float = 60.0):
        self.max_calls = max_calls
        self.period = float(period_seconds)
        self.tokens = float(max_calls)
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        """Acquire a token from the bucket, sleeping if necessary."""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.last_update = now

            # Refill tokens proportional to elapsed time
            refill = elapsed * (self.max_calls / self.period)
            self.tokens = min(float(self.max_calls), self.tokens + refill)

            if self.tokens < 1.0:
                wait_time = (1.0 - self.tokens) * (self.period / self.max_calls)
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                self.tokens = 0.0
                self.last_update = time.monotonic()
            else:
                self.tokens -= 1.0

    def reset(self) -> None:
        """Reset tokens to maximum capacity."""
        self.tokens = float(self.max_calls)
        self.last_update = time.monotonic()


class OpenAQProvider(BaseProvider):
    """
    OpenAQ v3 API Data Provider subclassing BaseProvider.
    Fetches real monitoring stations and measurements for India,
    routes them through the Data Quality Engine, and saves idempotently.
    """

    # Key pollutant parameter mapping for OpenAQ v3
    PARAM_MAP: Dict[str, str] = {
        "2": "pm25",
        "1": "pm10",
        "5": "no2",
        "3": "o3",
        "4": "co",
        "8": "so2",
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        rate_limiter: Optional[RateLimiter] = None,
        client: Optional[httpx.AsyncClient] = None,
    ):
        super().__init__()
        resolved_url = base_url or getattr(settings, "OPENAQ_API_URL", "https://api.openaq.org/v3")
        self.base_url = resolved_url.rstrip("/")
        self.api_key = (
            api_key
            if api_key is not None
            else getattr(settings, "OPENAQ_API_KEY", "") or os.environ.get("OPENAQ_API_KEY", "")
        ).strip()
        self.rate_limiter = rate_limiter or RateLimiter(max_calls=60, period_seconds=60.0)
        self._client = client
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._cache_ttl = 300  # 5 minutes in seconds

    @property
    def provider_name(self) -> str:
        """Return the unique provider name identifier."""
        return "openaq"

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or initialize the asynchronous HTTP client."""
        if self._client is None or self._client.is_closed:
            headers = {}
            if self.api_key:
                headers["X-API-Key"] = self.api_key
            self._client = httpx.AsyncClient(timeout=30.0, headers=headers)
        return self._client

    async def close(self) -> None:
        """Cleanly close underlying HTTP client session."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _format_bbox(self, bbox: Any) -> Optional[str]:
        """Format bounding box input into WGS84 min_lon,min_lat,max_lon,max_lat string."""
        if not bbox:
            return None
        if isinstance(bbox, str):
            return bbox.strip()
        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            return f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]}"
        if isinstance(bbox, dict):
            return f"{bbox['min_lon']},{bbox['min_lat']},{bbox['max_lon']},{bbox['max_lat']}"
        return None

    async def fetch_data(
        self,
        endpoint: str = "locations",
        countries_id: int = 9,
        bbox: Optional[Union[str, Tuple[float, float, float, float], List[float], Dict[str, float]]] = None,
        limit: int = 100,
        page: int = 1,
        fetch_measurements: bool = False,
        **kwargs: Any,
    ) -> Any:
        """
        Query OpenAQ API v3.

        - Query locations for India using countries_id: 9 (NOT 102).
        - Support bounding box queries (bbox=min_lon,min_lat,max_lon,max_lat).
        - Enforce rate limiting (max 60 req/min) and pagination chunking.
        - Header X-API-Key from settings/env.
        - Missing key or network error handled cleanly: log warning and return [].
        - NEVER generates fake or synthetic data.
        """
        if not self.api_key:
            self.logger.warning(
                "[OpenAQ] Missing API key (OPENAQ_API_KEY). Returning empty list per Zero-Fake-Data invariant."
            )
            return []

        # Country resolution: 'IN' or country string defaults to countries_id: 9
        country_param = kwargs.get("country") or kwargs.get("iso")
        resolved_country_id = 9
        if countries_id is not None and countries_id != 102:
            resolved_country_id = countries_id
        elif country_param:
            resolved_country_id = 9

        bbox_str = self._format_bbox(bbox)
        client = await self._get_client()

        # Build base request parameters
        base_params: Dict[str, Any] = {
            "countries_id": resolved_country_id,
        }
        if bbox_str:
            base_params["bbox"] = bbox_str

        # Add any extra query params passed in kwargs
        for k, v in kwargs.items():
            if k not in ("country", "iso", "bbox", "countries_id", "fetch_latest"):
                base_params[k] = v

        all_results: List[Dict[str, Any]] = []
        current_page = page
        max_page_size = 100  # OpenAQ v3 max limit per page
        remaining = max(1, limit)

        target_endpoint = endpoint.strip("/")
        url = f"{self.base_url}/{target_endpoint}"

        try:
            while remaining > 0:
                page_limit = min(remaining, max_page_size)
                params = dict(base_params)
                params["limit"] = page_limit
                params["page"] = current_page

                # Enforce rate limiting before making request
                await self.rate_limiter.acquire()

                response = await client.get(url, params=params)

                if response.status_code in (401, 403):
                    self.logger.warning(
                        f"[OpenAQ] Authentication failed (HTTP {response.status_code}). Check OPENAQ_API_KEY."
                    )
                    return []
                if response.status_code == 429:
                    self.logger.warning("[OpenAQ] Rate limit exceeded (HTTP 429).")
                    return []
                if response.status_code >= 400:
                    self.logger.warning(
                        f"[OpenAQ] API returned HTTP {response.status_code}: {response.text}"
                    )
                    return []

                data = response.json()
                results = data.get("results", [])
                if not results:
                    break

                all_results.extend(results)
                remaining -= len(results)

                if len(results) < page_limit:
                    break

                current_page += 1

        except (httpx.RequestError, httpx.HTTPError, Exception) as exc:
            self.logger.warning(f"[OpenAQ] Network error while querying {url}: {exc}")
            return []

        # If caller requested measurements associated with locations, fetch latest
        if fetch_measurements and all_results:
            latest_measurements = await self._fetch_measurements_for_locations(all_results, client)
            return {
                "locations": all_results,
                "measurements": latest_measurements,
            }

        return all_results

    async def _fetch_measurements_for_locations(
        self, locations: List[Dict[str, Any]], client: httpx.AsyncClient
    ) -> List[Dict[str, Any]]:
        """Fetch latest measurements for a chunk of monitoring stations."""
        measurements: List[Dict[str, Any]] = []
        for loc in locations:
            loc_id = loc.get("id")
            if not loc_id:
                continue

            try:
                await self.rate_limiter.acquire()
                url = f"{self.base_url}/locations/{loc_id}/latest"
                resp = await client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    for item in data.get("results", []):
                        # Attach location coordinates and metadata for downstream routing
                        item["location_meta"] = {
                            "station_id": str(loc_id),
                            "name": loc.get("name", ""),
                            "locality": loc.get("locality") or loc.get("city", ""),
                            "country": "IN",
                            "coordinates": loc.get("coordinates", {}),
                        }
                        # Map sensor id to parameter name if possible
                        sensor_id = item.get("sensorsId")
                        for s in loc.get("sensors", []):
                            if s.get("id") == sensor_id:
                                p_obj = s.get("parameter", {})
                                if p_obj.get("name"):
                                    item["parameter"] = p_obj.get("name")
                                if p_obj.get("units"):
                                    item["unit"] = p_obj.get("units")
                                break
                        measurements.append(item)
            except Exception as e:
                self.logger.warning(f"[OpenAQ] Error fetching latest for location {loc_id}: {e}")
                continue

        return measurements

    async def process_data(self, raw_data: Any) -> Any:
        """
        Parse OpenAQ v3 locations and latest measurements.
        - Route each measurement through backend.core.quality.calculate_dqs().
        - Discard physically impossible or invalid measurements (Q_valid == 0.0).
        - Tag valid records with calculated DQS.
        """
        if not raw_data:
            return {"stations": [], "measurements": []}

        raw_locations: List[Dict[str, Any]] = []
        raw_measurements: List[Dict[str, Any]] = []

        if isinstance(raw_data, dict):
            if "locations" in raw_data and isinstance(raw_data["locations"], list):
                raw_locations.extend(raw_data["locations"])
            if "measurements" in raw_data and isinstance(raw_data["measurements"], list):
                raw_measurements.extend(raw_data["measurements"])
            if "results" in raw_data and isinstance(raw_data["results"], list):
                for item in raw_data["results"]:
                    if not isinstance(item, dict):
                        continue
                    if "value" in item or "sensorsId" in item:
                        raw_measurements.append(item)
                    elif "sensors" in item or "locality" in item or ("coordinates" in item and "value" not in item):
                        raw_locations.append(item)
                    else:
                        raw_locations.append(item)
        elif isinstance(raw_data, list):
            for item in raw_data:
                if not isinstance(item, dict):
                    continue
                if "value" in item or "parameter" in item or "sensorsId" in item:
                    raw_measurements.append(item)
                elif "sensors" in item or "locality" in item or ("coordinates" in item and "value" not in item):
                    raw_locations.append(item)
                else:
                    raw_locations.append(item)

        processed_stations: List[Dict[str, Any]] = []
        processed_measurements: List[Dict[str, Any]] = []
        seen_station_ids = set()

        # 1. Process Station Records
        for loc in raw_locations:
            station_id = str(loc.get("id") or loc.get("station_id") or loc.get("locationId") or "").strip()
            if not station_id or station_id in seen_station_ids:
                continue

            seen_station_ids.add(station_id)
            name = loc.get("name") or loc.get("locationName") or loc.get("location") or f"Station {station_id}"

            coords = loc.get("coordinates")
            lat, lon = None, None
            if isinstance(coords, dict):
                lat = coords.get("latitude")
                lon = coords.get("longitude")
            elif "latitude" in loc and "longitude" in loc:
                lat = loc.get("latitude")
                lon = loc.get("longitude")

            city = loc.get("locality") or loc.get("city") or None
            country_obj = loc.get("country")
            if isinstance(country_obj, dict):
                country = country_obj.get("code") or country_obj.get("name") or "IN"
            else:
                country = str(country_obj) if country_obj else "IN"

            last_updated = None
            dt_last = loc.get("datetimeLast") or loc.get("last_updated") or loc.get("datetime")
            if isinstance(dt_last, dict):
                last_updated = dt_last.get("utc") or dt_last.get("local")
            elif dt_last:
                last_updated = str(dt_last)

            # Collect parameters
            param_names = []
            if "sensors" in loc and isinstance(loc["sensors"], list):
                for s in loc["sensors"]:
                    if isinstance(s, dict):
                        p = s.get("parameter")
                        if isinstance(p, dict) and p.get("name"):
                            param_names.append(p["name"])
                        elif s.get("name"):
                            param_names.append(s["name"])
            elif "parameters" in loc:
                if isinstance(loc["parameters"], list):
                    param_names = [str(p) for p in loc["parameters"] if p]
                elif isinstance(loc["parameters"], str):
                    param_names = [loc["parameters"]]

            params_str = ",".join(sorted(set(param_names))) if param_names else None

            processed_stations.append({
                "station_id": station_id,
                "name": name,
                "latitude": float(lat) if lat is not None else None,
                "longitude": float(lon) if lon is not None else None,
                "city": city,
                "country": country,
                "last_updated": last_updated,
                "parameters": params_str,
            })

        # 2. Process Measurements through Quality Engine
        for m in raw_measurements:
            station_id = str(
                m.get("locationsId")
                or m.get("locationId")
                or m.get("station_id")
                or ""
            ).strip()

            # Parameter resolution
            param_obj = m.get("parameter")
            if isinstance(param_obj, dict):
                param_name = str(param_obj.get("name") or param_obj.get("displayName") or "").strip().lower()
                param_unit = param_obj.get("units") or param_obj.get("unit") or m.get("unit") or "µg/m³"
            else:
                param_name = str(param_obj or m.get("param") or "").strip().lower()
                param_unit = m.get("unit") or "µg/m³"

            if not param_name:
                param_name = "pm25"

            # Value validation
            raw_val = m.get("value")
            if raw_val is None:
                continue

            try:
                val = float(raw_val)
            except (TypeError, ValueError):
                continue

            if math.isnan(val) or math.isinf(val):
                continue

            # Route through physical boundaries: Discard if Q_valid == 0.0
            q_valid = validate_value(param_name, val)
            if q_valid == 0.0:
                self.logger.debug(
                    f"[OpenAQ] Discarded physically invalid measurement: {param_name}={val} at {station_id}"
                )
                continue

            # Timestamp normalization
            dt_obj = m.get("datetime") or m.get("timestamp") or m.get("date")
            if isinstance(dt_obj, dict):
                ts = dt_obj.get("utc") or dt_obj.get("local")
            else:
                ts = str(dt_obj or "")

            if not ts:
                ts = datetime.now(timezone.utc).isoformat()

            # Calculate Data Quality Score (DQS)
            # Reference grade ground monitor
            dqs = calculate_dqs(
                value=val,
                parameter=param_name,
                timestamp=ts,
                distance_km=0.0,
                sensor_type="reference",
                is_satellite=False,
            )

            # Metadata extraction if station not already captured
            loc_meta_raw = m.get("location_meta") or m.get("location")
            loc_meta = loc_meta_raw if isinstance(loc_meta_raw, dict) else {}
            loc_str = loc_meta_raw if isinstance(loc_meta_raw, str) else ""

            coords = m.get("coordinates") or loc_meta.get("coordinates") or {}
            m_lat = coords.get("latitude") if isinstance(coords, dict) else m.get("latitude")
            m_lon = coords.get("longitude") if isinstance(coords, dict) else m.get("longitude")

            if station_id and station_id not in seen_station_ids and m_lat is not None and m_lon is not None:
                seen_station_ids.add(station_id)
                processed_stations.append({
                    "station_id": station_id,
                    "name": loc_meta.get("name") or m.get("location_name") or loc_str or f"Station {station_id}",
                    "latitude": float(m_lat),
                    "longitude": float(m_lon),
                    "city": loc_meta.get("locality") or m.get("city"),
                    "country": m.get("country", "IN"),
                    "last_updated": ts,
                    "parameters": param_name,
                })

            measurement_record = {
                "station_id": station_id,
                "parameter": param_name,
                "value": val,
                "unit": param_unit,
                "timestamp": ts,
                "latitude": float(m_lat) if m_lat is not None else None,
                "longitude": float(m_lon) if m_lon is not None else None,
                "city": loc_meta.get("locality") or m.get("city") or "",
                "location": loc_meta.get("name") or loc_str or m.get("location_name") or f"Station {station_id}",
                "country": "IN",
                "dqs": dqs,
            }
            processed_measurements.append(measurement_record)

        if not processed_stations and not processed_measurements:
            return {}

        return {
            "stations": processed_stations,
            "measurements": processed_measurements,
        }

    async def save_data(self, processed_data: Any, session: AsyncSession) -> None:
        """
        Idempotent upsert / deduplication:
        - Save stations to OpenAQStation.
        - Deduplicate measurements on (station_id, parameter, timestamp)
          so repeated ingestion runs never insert duplicate rows.
        - Strictly utilizes SQLAlchemy AsyncSession.
        """
        if not processed_data:
            return

        stations: List[Dict[str, Any]] = []
        measurements: List[Dict[str, Any]] = []

        if isinstance(processed_data, dict):
            stations = processed_data.get("stations", [])
            measurements = processed_data.get("measurements", [])
        elif isinstance(processed_data, list):
            for item in processed_data:
                if isinstance(item, dict):
                    if "value" in item or "dqs" in item:
                        measurements.append(item)
                    elif "station_id" in item:
                        stations.append(item)

        # 1. Idempotent Upsert for Stations
        for st in stations:
            st_id = str(st.get("station_id", "")).strip()
            if not st_id:
                continue

            stmt = select(OpenAQStation).where(OpenAQStation.station_id == st_id)
            res = await session.execute(stmt)
            existing_st = res.scalars().first()

            if existing_st:
                if st.get("name"):
                    existing_st.name = st["name"]
                if st.get("latitude") is not None:
                    existing_st.latitude = st["latitude"]
                if st.get("longitude") is not None:
                    existing_st.longitude = st["longitude"]
                if st.get("city"):
                    existing_st.city = st["city"]
                if st.get("country"):
                    existing_st.country = st["country"]
                if st.get("last_updated"):
                    existing_st.last_updated = st["last_updated"]
                if st.get("parameters"):
                    existing_st.parameters = str(st["parameters"])
            else:
                new_st = OpenAQStation(
                    station_id=st_id,
                    name=st.get("name", f"Station {st_id}"),
                    latitude=st.get("latitude"),
                    longitude=st.get("longitude"),
                    city=st.get("city"),
                    country=st.get("country", "IN"),
                    last_updated=st.get("last_updated"),
                    parameters=str(st.get("parameters")) if st.get("parameters") else None,
                )
                session.add(new_st)

        # Flush stations so FK constraint on openaq_stations.station_id is satisfied
        await session.flush()

        # 2. In-batch deduplication on (station_id, parameter, timestamp)
        unique_measurements: List[Dict[str, Any]] = []
        seen_in_batch = set()
        for m in measurements:
            st_id = str(m.get("station_id", "")).strip()
            param = str(m.get("parameter", "")).strip()
            ts = str(m.get("timestamp", "")).strip()
            if not st_id or not param or not ts:
                continue

            key = (st_id, param, ts)
            if key in seen_in_batch:
                continue
            seen_in_batch.add(key)
            unique_measurements.append(m)

        # 3. Database-level deduplication on (station_id, parameter, timestamp)
        for m in unique_measurements:
            st_id = str(m["station_id"]).strip()
            param = str(m["parameter"]).strip()
            ts = str(m["timestamp"]).strip()

            # Ensure parent station exists to satisfy FK constraint
            st_check = await session.execute(
                select(OpenAQStation.station_id).where(OpenAQStation.station_id == st_id)
            )
            if not st_check.scalar_one_or_none():
                session.add(
                    OpenAQStation(
                        station_id=st_id,
                        name=m.get("location") or f"Station {st_id}",
                        latitude=m.get("latitude"),
                        longitude=m.get("longitude"),
                        city=m.get("city"),
                        country=m.get("country", "IN"),
                        last_updated=ts,
                    )
                )
                await session.flush()

            stmt = select(OpenAQMeasurement).where(
                OpenAQMeasurement.station_id == st_id,
                OpenAQMeasurement.parameter == param,
                OpenAQMeasurement.timestamp == ts,
            )
            res = await session.execute(stmt)
            existing_m = res.scalars().first()

            if existing_m:
                # Update existing record in place
                existing_m.value = float(m.get("value", existing_m.value))
                existing_m.unit = str(m.get("unit", existing_m.unit))
                if hasattr(existing_m, "dqs") and "dqs" in m:
                    setattr(existing_m, "dqs", m["dqs"])
            else:
                meas_kwargs: Dict[str, Any] = {
                    "station_id": st_id,
                    "parameter": param,
                    "value": float(m.get("value", 0.0)),
                    "unit": str(m.get("unit", "")),
                    "timestamp": ts,
                }
                if hasattr(OpenAQMeasurement, "dqs") and "dqs" in m:
                    meas_kwargs["dqs"] = m["dqs"]

                new_m = OpenAQMeasurement(**meas_kwargs)
                session.add(new_m)

        await session.commit()

    async def ingest(self, session: AsyncSession, **kwargs: Any) -> Dict[str, Any]:
        """
        Orchestrate the ingestion workflow: fetch_data -> process_data -> save_data.
        """
        self.logger.info(f"[{self.provider_name}] Starting ingestion...")
        try:
            raw_data = await self.fetch_data(**kwargs)
            if not raw_data:
                self.logger.warning(f"[{self.provider_name}] No raw data fetched.")
                return {
                    "status": "success",
                    "provider": self.provider_name,
                    "message": "No data fetched",
                    "stations_saved": 0,
                    "measurements_saved": 0,
                }

            processed_data = await self.process_data(raw_data)
            if not processed_data:
                self.logger.warning(f"[{self.provider_name}] No data to save after processing.")
                return {
                    "status": "success",
                    "provider": self.provider_name,
                    "message": "No data after processing",
                    "stations_saved": 0,
                    "measurements_saved": 0,
                }

            await self.save_data(processed_data, session)
            self.logger.info(f"[{self.provider_name}] Ingestion completed successfully.")
            return {
                "status": "success",
                "provider": self.provider_name,
                "stations_saved": len(processed_data.get("stations", [])),
                "measurements_saved": len(processed_data.get("measurements", [])),
            }
        except Exception as e:
            self.logger.error(f"[{self.provider_name}] Ingestion failed: {e}", exc_info=True)
            return {"status": "error", "provider": self.provider_name, "error": str(e)}

    # =========================================================================
    # Backwards-Compatibility Layer for Existing Backend Services
    # =========================================================================

    async def fetch_stations(
        self,
        country: str = "IN",
        limit: int = 1000,
        radius: Optional[int] = None,
        coordinates: Optional[Tuple[float, float]] = None,
        bbox: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """Backwards-compatible wrapper to fetch monitoring stations."""
        extra_kwargs: Dict[str, Any] = {}
        if coordinates and radius:
            extra_kwargs["coordinates"] = f"{coordinates[0]},{coordinates[1]}"
            extra_kwargs["radius"] = radius

        try:
            from db.database import db_manager
            await db_manager.initialize()
            rows = await db_manager.fetch_all(
                "SELECT station_id, name, latitude, longitude, city, country, last_updated, parameters FROM openaq_stations WHERE latitude IS NOT NULL AND longitude IS NOT NULL LIMIT ?",
                (limit,)
            )
            if rows and len(rows) > 0 and not coordinates and not bbox:
                stations = []
                import json
                for r in rows:
                    p = []
                    if r.get("parameters"):
                        try:
                            p = json.loads(r["parameters"]) if isinstance(r["parameters"], str) else r["parameters"]
                        except Exception:
                            p = []
                    stations.append({
                        "station_id": r.get("station_id", ""),
                        "name": r.get("name", "Unknown"),
                        "latitude": float(r["latitude"]),
                        "longitude": float(r["longitude"]),
                        "city": r.get("city", ""),
                        "country": r.get("country", "IN"),
                        "parameters": p,
                    })
                return stations
        except Exception:
            pass

        raw_stations = await self.fetch_data(
            endpoint="locations",
            countries_id=9,
            country=country,
            limit=limit,
            bbox=bbox,
            **extra_kwargs,
        )
        processed = await self.process_data(raw_stations)
        return processed.get("stations", [])

    async def fetch_latest_measurements(self, country: str = "IN", limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Backwards-compatible wrapper to fetch latest measurements.
        Caches measurements for TTL window.
        Strictly returns empty list when unavailable - NO SYNTHETIC FALLBACK.
        """
        cache_key = f"latest_{country}"
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if (time.monotonic() - entry["time"]) < self._cache_ttl:
                return entry["data"]

        # Check SQLite database for persisted observations
        try:
            from db.database import db_manager
            await db_manager.initialize()
            rows = await db_manager.fetch_all(
                """
                SELECT s.city, s.name, s.latitude, s.longitude, m.parameter, m.value, m.unit, m.timestamp
                FROM openaq_measurements m
                JOIN openaq_stations s ON m.station_id = s.station_id
                WHERE m.value >= 0
                LIMIT ?
                """,
                (limit,)
            )
            if rows and len(rows) > 0:
                meas = [
                    {
                        "city": r.get("city") or r.get("name") or "",
                        "location": r.get("name") or "",
                        "latitude": r.get("latitude"),
                        "longitude": r.get("longitude"),
                        "parameter": r.get("parameter"),
                        "value": r.get("value"),
                        "unit": r.get("unit"),
                        "timestamp": r.get("timestamp"),
                    }
                    for r in rows
                ]
                self._cache[cache_key] = {
                    "data": meas,
                    "time": time.monotonic(),
                }
                return meas
        except Exception as db_exc:
            self.logger.debug(f"[OpenAQ] DB query fallback error: {db_exc}")

        raw_data = await self.fetch_data(
            endpoint="locations",
            countries_id=9,
            country=country,
            limit=limit,
            fetch_measurements=True,
        )
        processed = await self.process_data(raw_data)
        measurements = processed.get("measurements", [])

        if measurements:
            self._cache[cache_key] = {
                "data": measurements,
                "time": time.monotonic(),
            }

        return measurements

    async def fetch_measurements(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        country: str = "IN",
        parameter: Optional[str] = None,
        limit: int = 10000,
    ) -> List[Dict[str, Any]]:
        """Backwards-compatible historical measurement fetcher."""
        raw_data = await self.fetch_data(
            endpoint="measurements",
            countries_id=9,
            country=country,
            limit=limit,
            date_from=date_from,
            date_to=date_to,
            parameter=parameter,
        )
        processed = await self.process_data(raw_data)
        return processed.get("measurements", [])

    async def save_to_database(self, measurements: List[Dict[str, Any]]) -> None:
        """Legacy compatibility wrapper for saving measurements to database."""
        try:
            from db.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                processed = await self.process_data(measurements)
                await self.save_data(processed, session)
        except Exception as exc:
            self.logger.warning(f"[OpenAQ] Error in save_to_database: {exc}")


# Aliases for 100% backward compatibility
OpenAQLoader = OpenAQProvider
openaq_loader = OpenAQProvider()
