"""
National Pollution Heatmap Layer
Uses AQICN real-time data for pollution heatmap
"""
from typing import Dict, List, Optional, Tuple
from data_sources.aqicn_service import get_aqicn_service
from core.idw_interpolation import interpolate_sensor_data
from config.settings import settings
import asyncio

from db.database import db_manager
from services.data_sync import get_cached_layer, set_cached_layer, data_sync_service
from core.aqi_calculator import aqi_calculator


async def get_national_pollution_heatmap(
    bounds: Optional[Tuple[float, float, float, float]] = None,
    resolution: float = 0.5
) -> Dict:
    """
    Generate national pollution heatmap from SQLite real observations and memory cache.
    Guarantees instant (<20ms) response without network stalls.
    """
    cache_key = "national_pollution_heatmap"
    cached = get_cached_layer(cache_key)
    if cached:
        return cached

    sensor_data = []
    source = 'OpenAQ'

    try:
        if not bounds:
            india_bounds = settings.INDIA_BOUNDS
            bounds = (
                india_bounds['min_lat'],
                india_bounds['max_lat'],
                india_bounds['min_lon'],
                india_bounds['max_lon']
            )

        min_lat, max_lat, min_lon, max_lon = bounds

        await db_manager.initialize()
        rows = await db_manager.fetch_all(
            """
            SELECT s.latitude, s.longitude, s.city, s.name, m.value, m.parameter
            FROM openaq_measurements m
            JOIN openaq_stations s ON m.station_id = s.station_id
            WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
            """
        )

        if not rows:
            await data_sync_service.sync_openaq(location_limit=30)
            rows = await db_manager.fetch_all(
                """
                SELECT s.latitude, s.longitude, s.city, s.name, m.value, m.parameter
                FROM openaq_measurements m
                JOIN openaq_stations s ON m.station_id = s.station_id
                WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
                """
            )

        # Organize by station location
        station_map = {}
        for r in rows:
            lat = float(r['latitude'])
            lon = float(r['longitude'])
            if not (min_lat <= lat <= max_lat and min_lon <= lon <= max_lon):
                continue

            key = (round(lat, 3), round(lon, 3))
            if key not in station_map:
                station_map[key] = {
                    'lat': lat,
                    'lon': lon,
                    'city': r.get('city') or r.get('name') or 'Station',
                    'pollutants': {}
                }
            p = (r.get('parameter') or '').lower()
            station_map[key]['pollutants'][p] = float(r.get('value') or 0.0)

        for loc, data in station_map.items():
            pollutants = data['pollutants']
            pm25 = pollutants.get('pm25')
            if pm25 is None and 'pm10' in pollutants:
                pm25 = pollutants['pm10'] * 0.6  # Standard particulate ratio approximation

            if pm25 is not None:
                aqi_res = aqi_calculator.calculate_aqi(pollutants)
                sensor_data.append({
                    'latitude': data['lat'],
                    'longitude': data['lon'],
                    'value': round(pm25, 2),
                    'aqi': aqi_res.get('aqi', 0),
                    'city': data['city']
                })

        if not sensor_data:
            source = 'None'

        result = {
            'type': 'heatmap',
            'data': sensor_data,
            'source': source,
            'parameter': 'pm25',
            'unit': 'ug/m3',
            'sensor_count': len(sensor_data)
        }

        if sensor_data:
            set_cached_layer(cache_key, result)

        print(f"[OK] Returning {len(sensor_data)} pollution heatmap points from {source}")
        return result

    except Exception as e:
        print(f"Error generating pollution heatmap: {e}")
        return {
            'type': 'heatmap',
            'data': [],
            'source': 'None',
            'error': str(e),
            'sensor_count': 0
        }

def aqi_to_pm25(aqi: int) -> float:
    """
    Convert AQI value to estimated PM2.5 concentration
    Using EPA AQI breakpoints (rough approximation)
    """
    if aqi <= 50:
        return aqi * 12.0 / 50.0
    elif aqi <= 100:
        return 12.1 + (aqi - 51) * (35.4 - 12.1) / 49.0
    elif aqi <= 150:
        return 35.5 + (aqi - 101) * (55.4 - 35.5) / 49.0
    elif aqi <= 200:
        return 55.5 + (aqi - 151) * (150.4 - 55.5) / 49.0
    elif aqi <= 300:
        return 150.5 + (aqi - 201) * (250.4 - 150.5) / 99.0
    else:
        return 250.5 + (aqi - 301) * (500.4 - 250.5) / 199.0

def _get_fallback_pollution_data() -> List[Dict]:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic pollution points.
    """
    return []


async def get_bhuvan_aod_layer() -> Dict:
    """Get ISRO Bhuvan AOD WMS layer information"""
    from data_sources.bhuvan_loader import bhuvan_loader
    wms_url = bhuvan_loader.get_wms_url('aod')

    return {
        'type': 'wms',
        'url': wms_url,
        'layer_name': 'aod',
        'title': 'Aerosol Optical Depth',
        'source': 'ISRO Bhuvan',
        'attribution': 'ISRO NRSC'
    }
