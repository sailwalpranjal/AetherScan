"""
NASA FIRMS (Fire Information for Resource Management System) Data Provider.

Robust, rate-limited environmental data collector querying the NASA FIRMS Area API.
Adheres to strict Zero-Fake-Data and Zero-Cost invariants:
- Pure NASA FIRMS Area API CSV endpoints
- Free tier authenticated via MAP_KEY
- Strict rate limiting via Token Bucket
- Support for VIIRS and MODIS satellite products
- Bounding box and day-range chunking (max 10 days per query)
- Routing of thermal observations through backend.core.quality.calculate_dqs()
- Discarding physically invalid brightness observations (Q_valid == 0.0)
- Idempotent database persistence deduplicating on (latitude, longitude, acq_date, acq_time, satellite)
- Complete elimination of mock/synthetic fallback generators.
"""

import asyncio
import csv
from datetime import datetime, timedelta, timezone
import io
import logging
import math
import os
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx
from sqlalchemy import select, and_, func
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
    from models.domain import NASAFirmsFire
except ImportError:
    from backend.models.domain import NASAFirmsFire

try:
    from core.quality import calculate_dqs, validate_value
except ImportError:
    from backend.core.quality import calculate_dqs, validate_value

try:
    from db.database import db_manager
except ImportError:
    try:
        from backend.db.database import db_manager
    except ImportError:
        db_manager = None

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Token bucket rate limiter enforcing a maximum request frequency.
    Default: 60 requests per 60.0 seconds.
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


class NASAFIRMSProvider(BaseProvider):
    """
    NASA FIRMS Active Fire Data Provider subclassing BaseProvider.
    Fetches real active fire detections from VIIRS and MODIS satellites via
    the NASA FIRMS Area API CSV endpoint.
    Strictly adheres to Zero-Fake-Data and Zero-Cost invariants.
    """

    DEFAULT_SOURCE = "VIIRS_NOAA20_NRT"
    SUPPORTED_SOURCES = {
        "VIIRS_NOAA20_NRT",
        "VIIRS_SNPP_NRT",
        "VIIRS_NOAA21_NRT",
        "MODIS_NRT",
        "MODIS_SP",
    }
    # Standard W, S, E, N bounding box for India
    DEFAULT_BBOX = (68.0, 6.0, 97.5, 37.5)

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        rate_limiter: Optional[RateLimiter] = None,
        client: Optional[httpx.AsyncClient] = None,
        map_key: Optional[str] = None,
    ):
        super().__init__()
        resolved_url = base_url or getattr(
            settings, "NASA_FIRMS_URL", "https://firms.modaps.eosdis.nasa.gov/api"
        )
        self.base_url = resolved_url.rstrip("/")
        resolved_key = api_key if api_key is not None else map_key
        self.api_key = (
            resolved_key
            if resolved_key is not None
            else getattr(settings, "NASA_FIRMS_API_KEY", "")
            or os.environ.get("NASA_FIRMS_API_KEY", "")
        ).strip()
        self.map_key = self.api_key
        self.rate_limiter = rate_limiter or RateLimiter(max_calls=60, period_seconds=60.0)
        self._client = client

        # Backwards compatibility legacy bbox (min_lat, min_lon, max_lat, max_lon)
        india_bounds = getattr(settings, "INDIA_BOUNDS", {}) or {}
        self.india_bbox = (
            india_bounds.get("min_lat", 6.0),
            india_bounds.get("min_lon", 68.0),
            india_bounds.get("max_lat", 37.0),
            india_bounds.get("max_lon", 98.0),
        )

    @property
    def provider_name(self) -> str:
        """Return the unique provider name identifier."""
        return "nasa_firms"

    def _is_valid_api_key(self) -> bool:
        """Check whether the configured API key is valid and not a placeholder."""
        if not self.api_key or self.api_key in (
            "your_nasa_firms_api_key_here",
            "None",
            "none",
            '""',
            "''",
        ):
            return False
        return True

    def _check_api_key(self) -> bool:
        """Legacy helper for checking API key presence."""
        valid = self._is_valid_api_key()
        if not valid:
            self.logger.warning("[NASA FIRMS] API key not configured or using placeholder.")
        return valid

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or initialize the asynchronous HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def close(self) -> None:
        """Cleanly close underlying HTTP client session."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _format_area(self, bbox: Any) -> str:
        """
        Format bounding box into WGS84 decimal degrees: west,south,east,north
        (i.e. min_lon,min_lat,max_lon,max_lat) as required by NASA FIRMS Area API.
        """
        if bbox is None:
            return f"{self.DEFAULT_BBOX[0]},{self.DEFAULT_BBOX[1]},{self.DEFAULT_BBOX[2]},{self.DEFAULT_BBOX[3]}"

        if isinstance(bbox, str):
            return bbox.strip()

        if isinstance(bbox, dict):
            if "west" in bbox and "south" in bbox and "east" in bbox and "north" in bbox:
                return f"{bbox['west']},{bbox['south']},{bbox['east']},{bbox['north']}"
            if "min_lon" in bbox and "min_lat" in bbox and "max_lon" in bbox and "max_lat" in bbox:
                return f"{bbox['min_lon']},{bbox['min_lat']},{bbox['max_lon']},{bbox['max_lat']}"
            if "min_lat" in bbox and "min_lon" in bbox and "max_lat" in bbox and "max_lon" in bbox:
                return f"{bbox['min_lon']},{bbox['min_lat']},{bbox['max_lon']},{bbox['max_lat']}"

        if isinstance(bbox, (list, tuple)) and len(bbox) == 4:
            a, b, c, d = float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])
            # Detect legacy (min_lat, min_lon, max_lat, max_lon) for Indian sub-continent coordinates
            if a < b and 0.0 <= a <= 45.0 and 50.0 <= b <= 110.0:
                min_lon, min_lat, max_lon, max_lat = b, a, d, c
            else:
                # Standard W, S, E, N: min_lon, min_lat, max_lon, max_lat
                min_lon, min_lat, max_lon, max_lat = a, b, c, d
            return f"{min_lon},{min_lat},{max_lon},{max_lat}"

        return f"{self.DEFAULT_BBOX[0]},{self.DEFAULT_BBOX[1]},{self.DEFAULT_BBOX[2]},{self.DEFAULT_BBOX[3]}"

    async def fetch_data(
        self,
        source: str = "VIIRS_NOAA20_NRT",
        area: Optional[Any] = None,
        days: int = 1,
        date: Optional[str] = None,
        **kwargs: Any,
    ) -> Any:
        """
        Query NASA FIRMS Area API CSV endpoint:
        https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{SOURCE}/{AREA}/{DAY_RANGE}/{DATE}

        - Enforces rate limiting with token bucket.
        - Clamps day range [1, 10] per NASA FIRMS specification.
        - Sequentially chunks wider day ranges (> 10 days) into <= 10 day queries.
        - Strict Zero-Fake-Data: if key is missing/placeholder or HTTP 401/429/error,
          logs warning and returns [] without synthetic fallbacks.
        """
        if not self._is_valid_api_key():
            self.logger.warning(
                "[NASA FIRMS] Missing or placeholder API key. Returning [] per Zero-Fake-Data invariant."
            )
            return []

        resolved_source = source if source in self.SUPPORTED_SOURCES else self.DEFAULT_SOURCE
        area_str = self._format_area(area)

        # Clamping and chunking: Area API requires DAY_RANGE in [1, 10]
        total_days = max(1, int(days))

        # Build list of (chunk_days, chunk_date_str) chunks
        chunks: List[Tuple[int, Optional[str]]] = []
        if date:
            clean_date = str(date).strip()
            try:
                start_dt = datetime.strptime(clean_date, "%Y-%m-%d").date()
            except ValueError:
                start_dt = datetime.now(timezone.utc).date()

            cur_dt = start_dt
            remaining = total_days
            while remaining > 0:
                chunk_days = min(remaining, 10)
                chunks.append((chunk_days, cur_dt.strftime("%Y-%m-%d")))
                cur_dt = cur_dt + timedelta(days=chunk_days)
                remaining -= chunk_days
        else:
            if total_days <= 10:
                chunks.append((total_days, None))
            else:
                # For recent days spanning > 10 days, calculate date offsets from today
                today = datetime.now(timezone.utc).date()
                start_dt = today - timedelta(days=total_days - 1)
                cur_dt = start_dt
                remaining = total_days
                while remaining > 0:
                    chunk_days = min(remaining, 10)
                    chunks.append((chunk_days, cur_dt.strftime("%Y-%m-%d")))
                    cur_dt = cur_dt + timedelta(days=chunk_days)
                    remaining -= chunk_days

        client = await self._get_client()
        all_rows: List[Dict[str, Any]] = []
        raw_csv_texts: List[str] = []

        try:
            for chunk_days, chunk_date in chunks:
                await self.rate_limiter.acquire()

                if chunk_date:
                    url = f"{self.base_url}/area/csv/{self.api_key}/{resolved_source}/{area_str}/{chunk_days}/{chunk_date}"
                else:
                    url = f"{self.base_url}/area/csv/{self.api_key}/{resolved_source}/{area_str}/{chunk_days}"

                response = await client.get(url)

                if response.status_code in (401, 403):
                    self.logger.warning(
                        f"[NASA FIRMS] Authentication failed (HTTP {response.status_code}). Check MAP_KEY."
                    )
                    return []
                if response.status_code == 429:
                    self.logger.warning("[NASA FIRMS] Rate limit exceeded (HTTP 429).")
                    return []
                if response.status_code >= 400:
                    self.logger.warning(
                        f"[NASA FIRMS] API returned HTTP {response.status_code}: {response.text[:100]}"
                    )
                    return []

                body = response.text.strip()
                if not body:
                    continue

                # Check for NASA FIRMS inline text errors (e.g. Invalid MAP_KEY, Error: ...)
                lower_body = body.lower()
                if "invalid map_key" in lower_body or lower_body.startswith("error:"):
                    self.logger.warning(f"[NASA FIRMS] API response error: {body[:100]}")
                    return []

                raw_csv_texts.append(body)
                reader = csv.DictReader(io.StringIO(body))
                for row in reader:
                    r_dict = dict(row)
                    if "source" not in r_dict and "satellite" not in r_dict:
                        r_dict["satellite"] = resolved_source
                    all_rows.append(r_dict)

        except (httpx.RequestError, httpx.HTTPError, Exception) as exc:
            self.logger.warning(f"[NASA FIRMS] Network or request exception: {exc}")
            return []

        if kwargs.get("return_csv", False):
            return "\n".join(raw_csv_texts)

        return all_rows

    async def process_data(
        self,
        raw_data: Any,
        ref_time: Optional[Union[datetime, str, float, int]] = None,
        **kwargs: Any,
    ) -> List[Dict[str, Any]]:
        """
        Process and validate raw CSV rows or dictionaries from NASA FIRMS.

        - Multi-source CSV parsing: maps VIIRS bright_ti4 (or MODIS brightness) to brightness.
        - Discards any physically invalid brightness (validate_value("brightness", val) == 0.0).
        - Normalizes confidence: VIIRS 'l'/'n'/'h' -> 'low'/'nominal'/'high' (25/50/90),
          MODIS numeric -> categories.
        - Zero-pads acq_time to 4 digits ("0430") and builds ISO 8601 UTC timestamp.
        - Routes through Data Quality Engine (calculate_dqs) and tags item with dqs.
        """
        if not raw_data:
            return []

        rows: List[Dict[str, Any]] = []

        if isinstance(raw_data, str):
            cleaned = raw_data.strip()
            if not cleaned or "invalid map_key" in cleaned.lower() or cleaned.lower().startswith("error:"):
                return []
            reader = csv.DictReader(io.StringIO(cleaned))
            rows = [dict(r) for r in reader]
        elif isinstance(raw_data, list):
            for item in raw_data:
                if isinstance(item, dict):
                    rows.append(item)
                elif isinstance(item, str):
                    cleaned = item.strip()
                    if cleaned:
                        reader = csv.DictReader(io.StringIO(cleaned))
                        rows.extend([dict(r) for r in reader])
        elif isinstance(raw_data, dict):
            rows = [raw_data]
        else:
            return []

        processed: List[Dict[str, Any]] = []

        for row in rows:
            # 1. Coordinate Extraction & Bounds Check
            try:
                lat = float(row.get("latitude"))
                lon = float(row.get("longitude"))
                if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                    continue
            except (TypeError, ValueError):
                continue

            # 2. Brightness Resolution & Physical Boundaries
            # VIIRS uses bright_ti4 (and bright_ti5); MODIS uses brightness
            raw_bright = row.get("bright_ti4") or row.get("brightness") or row.get("bright_ti5")
            if raw_bright is None or raw_bright == "":
                continue

            try:
                brightness = float(raw_bright)
            except (TypeError, ValueError):
                continue

            if math.isnan(brightness) or math.isinf(brightness):
                continue

            # Validate physical boundaries: discard row if Q_valid == 0.0
            if validate_value("brightness", brightness) == 0.0:
                self.logger.debug(
                    f"[NASA FIRMS] Discarded physically invalid brightness: {brightness} K at ({lat}, {lon})"
                )
                continue

            # 3. Confidence Normalization
            raw_conf = row.get("confidence")
            conf_str = str(raw_conf).strip().lower() if raw_conf is not None else ""
            if conf_str in ("l", "low"):
                conf_cat = "low"
                conf_num = 25.0
            elif conf_str in ("n", "nominal"):
                conf_cat = "nominal"
                conf_num = 50.0
            elif conf_str in ("h", "high"):
                conf_cat = "high"
                conf_num = 90.0
            else:
                try:
                    val_conf = float(conf_str)
                    conf_num = val_conf
                    if val_conf >= 80.0:
                        conf_cat = "high"
                    elif val_conf >= 30.0:
                        conf_cat = "nominal"
                    else:
                        conf_cat = "low"
                except (ValueError, TypeError):
                    conf_cat = "nominal"
                    conf_num = 50.0

            # 4. Date & Time Normalization
            acq_date = str(row.get("acq_date", "")).strip().replace("/", "-")
            raw_acq_time = str(row.get("acq_time", "")).strip()

            # Zero-pad acq_time to 4 digits ("0430")
            acq_time = raw_acq_time.zfill(4) if raw_acq_time else "0000"
            if len(acq_time) > 4:
                acq_time = acq_time[:4]

            # Assemble ISO 8601 UTC timestamp
            if acq_date and len(acq_time) == 4:
                timestamp = f"{acq_date}T{acq_time[:2]}:{acq_time[2:]}:00Z"
            else:
                timestamp = datetime.now(timezone.utc).isoformat()

            # 5. Ancillary Measurements
            try:
                frp = float(row.get("frp", 0.0) or 0.0)
            except (ValueError, TypeError):
                frp = 0.0

            try:
                scan = float(row.get("scan", 1.0) or 1.0)
            except (ValueError, TypeError):
                scan = 1.0

            try:
                track = float(row.get("track", 1.0) or 1.0)
            except (ValueError, TypeError):
                track = 1.0

            satellite = str(row.get("satellite") or row.get("instrument") or "VIIRS").strip()
            daynight = str(row.get("daynight", "D")).strip()

            # 6. Route through Data Quality Engine (DQS)
            # Satellite sensor observation: is_satellite=True, sensor_type="satellite", is_cloud_free=True
            dqs = calculate_dqs(
                value=brightness,
                parameter="brightness",
                timestamp=timestamp,
                distance_km=0.0,
                sensor_type="satellite",
                is_satellite=True,
                is_cloud_free=True,
                ref_time=ref_time,
            )

            processed.append({
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "brightness": round(brightness, 2),
                "scan": scan,
                "track": track,
                "acq_date": acq_date,
                "acq_time": acq_time,
                "satellite": satellite,
                "confidence": conf_cat,
                "confidence_numeric": conf_num,
                "frp": frp,
                "daynight": daynight,
                "timestamp": timestamp,
                "dqs": dqs,
            })

        return processed

    async def save_data(self, processed_data: Any, session: AsyncSession) -> None:
        """
        Idempotent database persistence:
        - In-batch deduplication on (round(lat, 5), round(lon, 5), acq_date, acq_time, satellite).
        - Database deduplication on NASAFirmsFire (nasa_firms_fires table) using AsyncSession.
        - Updates existing records or inserts new ones.
        - Inspects hasattr(NASAFirmsFire, 'dqs') before setting dqs on the model.
        """
        if not processed_data:
            return

        # 1. In-batch deduplication
        unique_records: Dict[Tuple[float, float, str, str, str], Dict[str, Any]] = {}
        for item in processed_data:
            if not isinstance(item, dict):
                continue
            try:
                k = (
                    round(float(item["latitude"]), 5),
                    round(float(item["longitude"]), 5),
                    str(item.get("acq_date", "")).strip(),
                    str(item.get("acq_time", "")).strip(),
                    str(item.get("satellite", "")).strip(),
                )
                unique_records[k] = item
            except (KeyError, TypeError, ValueError):
                continue

        # 2. Database deduplication / upsert
        for rec in unique_records.values():
            lat = rec["latitude"]
            lon = rec["longitude"]
            acq_date = rec["acq_date"]
            acq_time = rec["acq_time"]
            satellite = rec["satellite"]

            stmt = select(NASAFirmsFire).where(
                and_(
                    NASAFirmsFire.latitude == lat,
                    NASAFirmsFire.longitude == lon,
                    NASAFirmsFire.acq_date == acq_date,
                    NASAFirmsFire.acq_time == acq_time,
                    NASAFirmsFire.satellite == satellite,
                )
            )
            res = await session.execute(stmt)
            existing = res.scalars().first()

            if existing:
                existing.brightness = rec["brightness"]
                existing.scan = rec.get("scan", 1.0)
                existing.track = rec.get("track", 1.0)
                existing.confidence = str(rec.get("confidence", "nominal"))
                existing.frp = rec.get("frp", 0.0)
                if hasattr(NASAFirmsFire, "dqs") and "dqs" in rec:
                    setattr(existing, "dqs", rec["dqs"])
            else:
                fire = NASAFirmsFire(
                    latitude=lat,
                    longitude=lon,
                    brightness=rec["brightness"],
                    scan=rec.get("scan", 1.0),
                    track=rec.get("track", 1.0),
                    acq_date=acq_date,
                    acq_time=acq_time,
                    satellite=satellite,
                    confidence=str(rec.get("confidence", "nominal")),
                    frp=rec.get("frp", 0.0),
                )
                if hasattr(NASAFirmsFire, "dqs") and "dqs" in rec:
                    setattr(fire, "dqs", rec["dqs"])
                session.add(fire)

        await session.flush()

    async def ingest(self, session: AsyncSession, **kwargs: Any) -> Dict[str, Any]:
        """
        Orchestrate the ingestion workflow: fetch -> process -> save.
        """
        ref_time = kwargs.get("ref_time")
        self.logger.info(f"[{self.provider_name}] Starting ingestion...")
        try:
            raw_data = await self.fetch_data(**kwargs)
            if not raw_data:
                self.logger.warning(f"[{self.provider_name}] No raw data fetched.")
                return {"status": "success", "message": "No data fetched"}

            processed_data = await self.process_data(raw_data, ref_time=ref_time, **kwargs)
            if not processed_data:
                self.logger.warning(f"[{self.provider_name}] No data to save after processing.")
                return {"status": "success", "message": "No data after processing"}

            await self.save_data(processed_data, session)
            self.logger.info(f"[{self.provider_name}] Ingestion completed successfully.")
            return {"status": "success", "provider": self.provider_name, "count": len(processed_data)}
        except Exception as e:
            self.logger.error(f"[{self.provider_name}] Ingestion failed: {e}", exc_info=True)
            return {"status": "error", "provider": self.provider_name, "error": str(e)}

    # =========================================================================
    # Backwards Compatibility Shims & Helper Methods
    # =========================================================================

    async def fetch_active_fires(
        self,
        source: str = "VIIRS_NOAA20_NRT",
        days: int = 7,
        bbox: Optional[tuple] = None,
    ) -> List[Dict[str, Any]]:
        """
        Legacy shim: Fetch active fire detections and return normalized list of dicts.
        """
        if db_manager is not None:
            try:
                await db_manager.initialize()
                rows = await db_manager.fetch_all(
                    """
                    SELECT latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp
                    FROM nasa_firms_fires
                    ORDER BY acq_date DESC, acq_time DESC
                    LIMIT 5000
                    """
                )
                if rows and len(rows) > 0:
                    return [dict(r) for r in rows]
            except Exception:
                pass

        raw = await self.fetch_data(source=source, days=days, area=bbox)
        return await self.process_data(raw)

    async def fetch_historical_fires(
        self,
        start_date: str,
        end_date: str,
        source: str = "VIIRS_NOAA20_NRT",
        bbox: Optional[tuple] = None,
    ) -> List[Dict[str, Any]]:
        """
        Legacy shim: Fetch historical fire data across a date range.
        """
        try:
            d_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            d_end = datetime.strptime(end_date, "%Y-%m-%d").date()
            days = max(1, (d_end - d_start).days + 1)
        except Exception:
            days = 1

        raw = await self.fetch_data(source=source, days=days, area=bbox, date=start_date)
        return await self.process_data(raw)

    async def get_fire_hotspots_by_date(
        self, date: str, session: Optional[AsyncSession] = None
    ) -> List[Dict[str, Any]]:
        """
        Legacy shim: Get fire hotspots for a specific date ordered by FRP desc.
        """
        if session is not None:
            stmt = (
                select(NASAFirmsFire)
                .where(NASAFirmsFire.acq_date == date)
                .order_by(NASAFirmsFire.frp.desc())
            )
            res = await session.execute(stmt)
            fires = res.scalars().all()
            return [
                {
                    "id": f.id,
                    "latitude": f.latitude,
                    "longitude": f.longitude,
                    "brightness": f.brightness,
                    "scan": f.scan,
                    "track": f.track,
                    "acq_date": f.acq_date,
                    "acq_time": f.acq_time,
                    "satellite": f.satellite,
                    "confidence": f.confidence,
                    "frp": f.frp,
                }
                for f in fires
            ]
        elif db_manager is not None:
            try:
                rows = await db_manager.fetch_all(
                    """
                    SELECT * FROM nasa_firms_fires
                    WHERE acq_date = ?
                    ORDER BY frp DESC
                    """,
                    (date,),
                )
                return [dict(row) for row in rows]
            except Exception as e:
                self.logger.warning(f"[NASA FIRMS] db_manager fetch_all failed: {e}")
                return []
        return []

    async def get_fire_density_grid(
        self,
        date_from: str,
        date_to: str,
        grid_size: float = 0.5,
        session: Optional[AsyncSession] = None,
    ) -> Dict[str, List]:
        """
        Legacy shim: Calculate fire density on a 2D spatial grid.
        """
        coords: List[Tuple[float, float]] = []

        if session is not None:
            stmt = select(NASAFirmsFire.latitude, NASAFirmsFire.longitude).where(
                and_(
                    NASAFirmsFire.acq_date >= date_from,
                    NASAFirmsFire.acq_date <= date_to,
                )
            )
            res = await session.execute(stmt)
            coords = [(r[0], r[1]) for r in res.all() if r[0] is not None and r[1] is not None]
        elif db_manager is not None:
            try:
                rows = await db_manager.fetch_all(
                    """
                    SELECT latitude, longitude FROM nasa_firms_fires
                    WHERE acq_date BETWEEN ? AND ?
                    """,
                    (date_from, date_to),
                )
                coords = [
                    (float(r["latitude"]), float(r["longitude"]))
                    for r in rows
                    if r.get("latitude") is not None and r.get("longitude") is not None
                ]
            except Exception as e:
                self.logger.warning(f"[NASA FIRMS] db_manager query failed: {e}")
                return {"lats": [], "lons": [], "counts": []}

        if not coords:
            return {"lats": [], "lons": [], "counts": []}

        try:
            import numpy as np

            lats = [c[0] for c in coords]
            lons = [c[1] for c in coords]

            min_lat, max_lat = min(lats), max(lats)
            min_lon, max_lon = min(lons), max(lons)
            if min_lat == max_lat:
                max_lat += grid_size
            if min_lon == max_lon:
                max_lon += grid_size

            lat_bins = np.arange(min_lat, max_lat + grid_size, grid_size)
            lon_bins = np.arange(min_lon, max_lon + grid_size, grid_size)

            counts, _, _ = np.histogram2d(lats, lons, bins=[lat_bins, lon_bins])

            return {
                "lats": lat_bins.tolist(),
                "lons": lon_bins.tolist(),
                "counts": counts.tolist(),
            }
        except Exception as e:
            self.logger.warning(f"[NASA FIRMS] Calculating density grid with pure Python fallback: {e}")
            lats = [c[0] for c in coords]
            lons = [c[1] for c in coords]
            min_lat, max_lat = min(lats), max(lats)
            min_lon, max_lon = min(lons), max(lons)
            if min_lat == max_lat:
                max_lat += grid_size
            if min_lon == max_lon:
                max_lon += grid_size

            lat_bins = []
            curr_lat = min_lat
            while curr_lat <= max_lat + 1e-9:
                lat_bins.append(round(curr_lat, 4))
                curr_lat += grid_size

            lon_bins = []
            curr_lon = min_lon
            while curr_lon <= max_lon + 1e-9:
                lon_bins.append(round(curr_lon, 4))
                curr_lon += grid_size

            n_lat_bins = max(1, len(lat_bins) - 1)
            n_lon_bins = max(1, len(lon_bins) - 1)
            counts = [[0 for _ in range(n_lon_bins)] for _ in range(n_lat_bins)]

            for lat_val, lon_val in coords:
                lat_idx = min(int((lat_val - min_lat) / grid_size), n_lat_bins - 1)
                lon_idx = min(int((lon_val - min_lon) / grid_size), n_lon_bins - 1)
                if 0 <= lat_idx < n_lat_bins and 0 <= lon_idx < n_lon_bins:
                    counts[lat_idx][lon_idx] += 1

            return {
                "lats": lat_bins,
                "lons": lon_bins,
                "counts": counts,
            }

    async def save_to_database(
        self, fires: List[Dict[str, Any]], session: Optional[AsyncSession] = None
    ) -> None:
        """
        Legacy shim: Save fire points to database using AsyncSession or db_manager.
        """
        if session is not None:
            await self.save_data(fires, session)
        elif db_manager is not None:
            await db_manager.initialize()
            rows = [
                (
                    f["latitude"],
                    f["longitude"],
                    f.get("brightness", 0),
                    f.get("scan", 0),
                    f.get("track", 0),
                    f.get("acq_date", ""),
                    f.get("acq_time", ""),
                    f.get("satellite", ""),
                    f.get("confidence", "nominal"),
                    f.get("frp", 0),
                )
                for f in fires
                if f.get("latitude") is not None and f.get("longitude") is not None
            ]
            if rows and db_manager._db:
                try:
                    await db_manager._db.executemany(
                        """
                        INSERT INTO nasa_firms_fires
                        (latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        rows,
                    )
                    await db_manager._db.commit()
                except Exception as e:
                    self.logger.warning(f"[NASA FIRMS] Batch insert failed: {e}")


# =============================================================================
# Aliases and Module Singleton Instances
# =============================================================================

NASAFIRMSLoader = NASAFIRMSProvider
nasa_firms_provider = NASAFIRMSProvider()
nasa_firms_loader = nasa_firms_provider
FireEvent = NASAFirmsFire
FIRMSFireEvent = NASAFirmsFire
