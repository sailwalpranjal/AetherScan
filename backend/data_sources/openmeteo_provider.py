import asyncio
from datetime import datetime, timezone
import logging
import math
import os
import time
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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

# Key geographic reference centers covering all Indian states and territories
INDIAN_LOCATIONS = [
    {"name": "Delhi NCR", "city": "Delhi", "state": "Delhi", "lat": 28.7041, "lon": 77.1025},
    {"name": "Mumbai Metro", "city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lon": 72.8777},
    {"name": "Bengaluru Central", "city": "Bangalore", "state": "Karnataka", "lat": 12.9716, "lon": 77.5946},
    {"name": "Chennai Urban", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707},
    {"name": "Lucknow Capital", "city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lon": 80.9462},
    {"name": "Ahmedabad Industrial", "city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lon": 72.5714},
    {"name": "Jaipur Region", "city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lon": 75.7873},
    {"name": "Kolkata Coastal", "city": "Kolkata", "state": "West Bengal", "lat": 22.5726, "lon": 88.3639},
    {"name": "Bhopal Central", "city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126},
    {"name": "Hyderabad Tech", "city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lon": 78.4867},
    {"name": "Visakhapatnam Port", "city": "Visakhapatnam", "state": "Andhra Pradesh", "lat": 17.6868, "lon": 83.2185},
    {"name": "Patna Capital", "city": "Patna", "state": "Bihar", "lat": 25.5941, "lon": 85.1376},
    {"name": "Bhubaneswar Smart City", "city": "Bhubaneswar", "state": "Odisha", "lat": 20.2961, "lon": 85.8245},
    {"name": "Thiruvananthapuram South", "city": "Thiruvananthapuram", "state": "Kerala", "lat": 8.5241, "lon": 76.9366},
    {"name": "Chandigarh Tricity", "city": "Chandigarh", "state": "Haryana", "lat": 30.7333, "lon": 76.7794},
    {"name": "Ludhiana Industrial", "city": "Ludhiana", "state": "Punjab", "lat": 30.9010, "lon": 75.8573},
    {"name": "Ranchi Mineral Belt", "city": "Ranchi", "state": "Jharkhand", "lat": 23.3441, "lon": 85.3096},
    {"name": "Raipur Industrial", "city": "Raipur", "state": "Chhattisgarh", "lat": 21.2514, "lon": 81.6296},
    {"name": "Guwahati Gateway", "city": "Guwahati", "state": "Assam", "lat": 26.1445, "lon": 91.7362},
    {"name": "Dehradun Foothills", "city": "Dehradun", "state": "Uttarakhand", "lat": 30.3165, "lon": 78.0322},
]


class OpenMeteoAirQualityProvider(BaseProvider):
    """
    Open-Meteo Air Quality API Data Provider subclassing BaseProvider.
    Fetches real-time Copernicus ECMWF/CAMS observations for India.
    Adheres strictly to the Zero-Fake-Data invariant and provides
    observation-level Data Quality Score (DQS) calculation.
    """

    PARAM_MAP: Dict[str, str] = {
        "pm10": "pm10",
        "pm2_5": "pm25",
        "nitrogen_dioxide": "no2",
        "sulphur_dioxide": "so2",
        "carbon_monoxide": "co",
        "ozone": "o3",
        "aerosol_optical_depth": "aod"
    }

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        super().__init__()
        self.base_url = "https://air-quality-api.open-meteo.com/v1/air-quality"
        self._client = client

    @property
    def provider_name(self) -> str:
        return "openmeteo"

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def fetch_data(self, **kwargs: Any) -> Any:
        """
        Fetch real-time atmospheric observations from Open-Meteo Copernicus CAMS model.
        Accepts optional 'latitudes' and 'longitudes' arrays, defaulting to 20 representative
        Indian administrative and urban centroids.
        """
        lats = kwargs.get("latitudes")
        lons = kwargs.get("longitudes")
        if not lats or not lons:
            lats = [loc["lat"] for loc in INDIAN_LOCATIONS]
            lons = [loc["lon"] for loc in INDIAN_LOCATIONS]

        client = await self._get_client()

        params = {
            "latitude": ",".join(map(str, lats)),
            "longitude": ",".join(map(str, lons)),
            "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth",
            "timezone": "UTC"
        }

        all_results = []
        try:
            response = await client.get(self.base_url, params=params)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    all_results.extend(data)
                else:
                    all_results.append(data)
            else:
                self.logger.warning(f"[OpenMeteo] API returned HTTP {response.status_code}")
        except Exception as exc:
            self.logger.warning(f"[OpenMeteo] Network error: {exc}")

        return all_results

    async def process_data(self, raw_data: Any) -> Any:
        """
        Process raw Open-Meteo responses, normalize timestamps to UTC,
        map coordinates to nearest Indian cities/states, validate physical boundaries,
        and calculate observation-level Data Quality Score (DQS).
        """
        if not raw_data or not isinstance(raw_data, list):
            return {"stations": [], "measurements": []}

        processed_stations = []
        processed_measurements = []

        for item in raw_data:
            if not isinstance(item, dict):
                continue

            lat = item.get("latitude")
            lon = item.get("longitude")
            current = item.get("current", {})

            if lat is None or lon is None or not current or not isinstance(current, dict):
                continue

            try:
                f_lat = float(lat)
                f_lon = float(lon)
            except (ValueError, TypeError):
                continue

            # Identify nearest city and state name from reference coordinates
            closest_loc = None
            min_dist = float('inf')
            for loc in INDIAN_LOCATIONS:
                dist = math.hypot(f_lat - loc["lat"], f_lon - loc["lon"])
                if dist < min_dist:
                    min_dist = dist
                    closest_loc = loc

            if closest_loc and min_dist <= 2.0:
                city_name = closest_loc["city"]
                st_name = f"Copernicus {closest_loc['name']}"
            else:
                city_name = f"Region ({round(f_lat, 2)}, {round(f_lon, 2)})"
                st_name = f"Copernicus Station ({round(f_lat, 2)}, {round(f_lon, 2)})"

            station_id = f"copernicus_{round(f_lat, 4)}_{round(f_lon, 4)}"

            # Format UTC timestamp
            raw_time = current.get("time")
            if not raw_time:
                ts = datetime.now(timezone.utc).isoformat()
            else:
                ts = str(raw_time)
                if not ts.endswith("Z") and "+" not in ts:
                    ts += "Z"

            processed_stations.append({
                "station_id": station_id,
                "name": st_name,
                "latitude": f_lat,
                "longitude": f_lon,
                "city": city_name,
                "country": "IN",
                "last_updated": ts,
                "parameters": ",".join(self.PARAM_MAP.values())
            })

            for param_key, mapped_param in self.PARAM_MAP.items():
                val = current.get(param_key)
                if val is not None:
                    try:
                        val_float = float(val)
                    except (ValueError, TypeError):
                        continue

                    if math.isnan(val_float) or math.isinf(val_float):
                        continue

                    # Validate physical plausibility
                    q_valid = validate_value(mapped_param, val_float)
                    if q_valid == 0.0:
                        continue

                    # Calculate Data Quality Score
                    dqs = calculate_dqs(
                        value=val_float,
                        parameter=mapped_param,
                        timestamp=ts,
                        distance_km=0.0,
                        sensor_type="model",
                        is_satellite=False
                    )

                    processed_measurements.append({
                        "station_id": station_id,
                        "parameter": mapped_param,
                        "value": val_float,
                        "unit": "ug/m3",
                        "timestamp": ts,
                        "latitude": f_lat,
                        "longitude": f_lon,
                        "city": city_name,
                        "location": st_name,
                        "country": "IN",
                        "dqs": dqs
                    })

        return {
            "stations": processed_stations,
            "measurements": processed_measurements
        }

    async def save_data(self, processed_data: Any, session: AsyncSession) -> None:
        """
        Idempotent database persistence into openaq_stations and openaq_measurements
        tables using SQLAlchemy AsyncSession.
        """
        if not processed_data:
            return

        stations = processed_data.get("stations", [])
        measurements = processed_data.get("measurements", [])

        for st in stations:
            st_id = st["station_id"]
            stmt = select(OpenAQStation).where(OpenAQStation.station_id == st_id)
            res = await session.execute(stmt)
            existing_st = res.scalars().first()

            if existing_st:
                existing_st.last_updated = st["last_updated"]
            else:
                new_st = OpenAQStation(
                    station_id=st_id,
                    name=st["name"],
                    latitude=st["latitude"],
                    longitude=st["longitude"],
                    city=st["city"],
                    country=st["country"],
                    last_updated=st["last_updated"],
                    parameters=st["parameters"]
                )
                session.add(new_st)

        await session.flush()

        for m in measurements:
            st_id = m["station_id"]
            param = m["parameter"]
            ts = m["timestamp"]

            stmt = select(OpenAQMeasurement).where(
                OpenAQMeasurement.station_id == st_id,
                OpenAQMeasurement.parameter == param,
                OpenAQMeasurement.timestamp == ts
            )
            res = await session.execute(stmt)
            existing_m = res.scalars().first()

            if existing_m:
                existing_m.value = m["value"]
                if hasattr(existing_m, "dqs") and "dqs" in m:
                    setattr(existing_m, "dqs", m["dqs"])
            else:
                new_m = OpenAQMeasurement(
                    station_id=st_id,
                    parameter=param,
                    value=m["value"],
                    unit=m["unit"],
                    timestamp=ts
                )
                if hasattr(new_m, "dqs") and "dqs" in m:
                    setattr(new_m, "dqs", m["dqs"])
                session.add(new_m)

        await session.commit()


# Global singleton instance
openmeteo_provider = OpenMeteoAirQualityProvider()
