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

class OpenMeteoAirQualityProvider(BaseProvider):
    """
    Open-Meteo Air Quality API Data Provider subclassing BaseProvider.
    Fetches real-time Copernicus ECMWF/CAMS observations for India.
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
        # Default bounding box / sample coordinates for India if not provided
        # Or we can accept list of coordinates
        lats = kwargs.get("latitudes", [28.6139, 19.0760, 12.9716, 22.5726, 13.0827]) # Delhi, Mumbai, Bangalore, Kolkata, Chennai
        lons = kwargs.get("longitudes", [77.2090, 72.8777, 77.5946, 88.3639, 80.2707])
        
        client = await self._get_client()
        
        # open-meteo allows batching coordinates
        params = {
            "latitude": ",".join(map(str, lats)),
            "longitude": ",".join(map(str, lons)),
            "current": "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,aerosol_optical_depth",
            "timezone": "auto"
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
        if not raw_data:
            return {"stations": [], "measurements": []}
            
        processed_stations = []
        processed_measurements = []
        
        for item in raw_data:
            lat = item.get("latitude")
            lon = item.get("longitude")
            current = item.get("current", {})
            
            if lat is None or lon is None or not current:
                continue
                
            station_id = f"om_{lat}_{lon}"
            ts = current.get("time")
            if not ts:
                ts = datetime.now(timezone.utc).isoformat()
            else:
                # Open-Meteo returns time like "2023-10-10T14:00"
                if not ts.endswith("Z") and "+" not in ts:
                    ts += "Z"
                    
            processed_stations.append({
                "station_id": station_id,
                "name": f"Open-Meteo {lat},{lon}",
                "latitude": float(lat),
                "longitude": float(lon),
                "city": "Unknown",
                "country": "IN",
                "last_updated": ts,
                "parameters": ",".join(self.PARAM_MAP.values())
            })
            
            for param_key, mapped_param in self.PARAM_MAP.items():
                val = current.get(param_key)
                if val is not None:
                    try:
                        val = float(val)
                    except ValueError:
                        continue
                        
                    if math.isnan(val) or math.isinf(val):
                        continue
                        
                    q_valid = validate_value(mapped_param, val)
                    if q_valid == 0.0:
                        continue
                        
                    dqs = calculate_dqs(
                        value=val,
                        parameter=mapped_param,
                        timestamp=ts,
                        distance_km=0.0,
                        sensor_type="model",
                        is_satellite=False
                    )
                    
                    processed_measurements.append({
                        "station_id": station_id,
                        "parameter": mapped_param,
                        "value": val,
                        "unit": "µg/m³", # OpenMeteo default
                        "timestamp": ts,
                        "latitude": float(lat),
                        "longitude": float(lon),
                        "city": "Unknown",
                        "location": f"Open-Meteo {lat},{lon}",
                        "country": "IN",
                        "dqs": dqs
                    })
                    
        return {
            "stations": processed_stations,
            "measurements": processed_measurements
        }

    async def save_data(self, processed_data: Any, session: AsyncSession) -> None:
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
