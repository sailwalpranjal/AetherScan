"""AQI Validation Layer - Cross-validate OpenAQ with FIRMS data"""
from typing import Dict, List
import logging
import math

try:
    from data_sources.openaq_loader import openaq_loader
    from data_sources.nasa_firms_loader import nasa_firms_loader
    from core.aqi_calculator import aqi_calculator
    from db.database import db_manager
    from services.data_sync import get_cached_layer, set_cached_layer, data_sync_service
except ImportError:
    from backend.data_sources.openaq_loader import openaq_loader
    from backend.data_sources.nasa_firms_loader import nasa_firms_loader
    from backend.core.aqi_calculator import aqi_calculator
    from backend.db.database import db_manager
    from backend.services.data_sync import get_cached_layer, set_cached_layer, data_sync_service

logger = logging.getLogger(__name__)


def _get_fallback_validation_data() -> List[Dict]:
    """Deprecated fallback stub adhering to Zero-Fake-Data invariant."""
    logger.warning("Zero-Fake-Data: fallback AQI validation requested, returning []")
    return []


async def get_aqi_validation() -> Dict:
    """Validate AQI with fire correlation using real observations from SQLite."""
    cache_key = "aqi_validation"
    cached = get_cached_layer(cache_key)
    if cached:
        return cached

    features = []
    source = 'OpenAQ + NASA FIRMS (Local SQLite Cache)'

    try:
        await db_manager.initialize()

        # Query real NASA FIRMS fires in mainland India
        fire_rows = await db_manager.fetch_all(
            """
            SELECT latitude, longitude, frp, brightness, confidence, acq_date, acq_time
            FROM nasa_firms_fires
            WHERE latitude BETWEEN 15 AND 35 AND longitude BETWEEN 72 AND 89
            ORDER BY frp DESC
            LIMIT 300
            """
        )

        # Query real OpenAQ measurements
        sensor_rows = await db_manager.fetch_all(
            """
            SELECT s.latitude, s.longitude, s.name, s.city, m.parameter, m.value
            FROM openaq_measurements m
            JOIN openaq_stations s ON m.station_id = s.station_id
            WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
            """
        )

        if not fire_rows or not sensor_rows:
            # Attempt sync if empty
            if not fire_rows:
                await data_sync_service.sync_nasa_firms(days=2)
                fire_rows = await db_manager.fetch_all(
                    """
                    SELECT latitude, longitude, frp, brightness, confidence, acq_date, acq_time
                    FROM nasa_firms_fires
                    WHERE latitude BETWEEN 6 AND 37 AND longitude BETWEEN 68 AND 98
                    ORDER BY frp DESC
                    LIMIT 150
                    """
                )
            if not sensor_rows:
                await data_sync_service.sync_openaq(location_limit=30)
                sensor_rows = await db_manager.fetch_all(
                    """
                    SELECT s.latitude, s.longitude, s.name, s.city, m.parameter, m.value
                    FROM openaq_measurements m
                    JOIN openaq_stations s ON m.station_id = s.station_id
                    WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
                    """
                )

        if fire_rows and sensor_rows:
            fire_rows = [dict(r) for r in fire_rows]
            sensor_rows = [dict(r) for r in sensor_rows]

            # Group sensor measurements by station coordinate
            station_map = {}
            for row in sensor_rows:
                lat = float(row['latitude'])
                lon = float(row['longitude'])
                key = (round(lat, 3), round(lon, 3))
                if key not in station_map:
                    station_map[key] = {
                        'lat': lat,
                        'lon': lon,
                        'city': row.get('city') or row.get('name') or 'Station',
                        'pollutants': {}
                    }
                param = str(row.get('parameter', '')).lower().replace('.', '').replace('_', '')
                try:
                    val = float(row['value'])
                    station_map[key]['pollutants'][param] = val
                except (ValueError, TypeError):
                    pass

            # Precalculate AQI for stations
            station_aqi_list = []
            for loc, s_info in station_map.items():
                if s_info['pollutants']:
                    aqi_calc = aqi_calculator.calculate_aqi(s_info['pollutants'])
                    station_aqi_list.append({
                        'lat': s_info['lat'],
                        'lon': s_info['lon'],
                        'city': s_info['city'],
                        'aqi': aqi_calc['aqi'],
                        'category': aqi_calc['category'],
                        'color': aqi_calc.get('color', '#808080'),
                        'dominant_pollutant': aqi_calc.get('dominant_pollutant', 'PM2.5'),
                    })

            # Correlate fires with nearby sensor AQI (radius ~100km / ~0.9 deg)
            for fire in fire_rows:
                fire_lat = float(fire['latitude'])
                fire_lon = float(fire['longitude'])
                frp = float(fire.get('frp') or 0.0)

                # Find closest station
                closest_station = None
                min_dist = float('inf')
                for st in station_aqi_list:
                    d = math.hypot(st['lat'] - fire_lat, st['lon'] - fire_lon)
                    if d < min_dist:
                        min_dist = d
                        closest_station = st

                # Regional correlation radius (~380km / 3.5 deg)
                if closest_station and min_dist <= 3.5:
                    dist_km = round(min_dist * 111.0, 1)
                    features.append({
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [fire_lon, fire_lat]
                        },
                        'properties': {
                            'fire_intensity': frp,
                            'aqi': closest_station['aqi'],
                            'category': closest_station['category'],
                            'color': closest_station['color'],
                            'correlation': 'thermal_anomaly_matched',
                            'dominant_pollutant': closest_station['dominant_pollutant'],
                            'matched_station': closest_station['city'],
                            'distance_km': dist_km,
                            'confidence': str(fire.get('confidence', 'nominal'))
                        }
                    })

    except Exception as e:
        logger.warning(f"AQI validation error: {e}")

    if not features:
        source = 'None'

    result = {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': source,
        'description': 'Real-time AQI validation correlated with NASA FIRMS thermal anomalies'
    }

    set_cached_layer(cache_key, result)
    logger.info(f"Generated {len(features)} AQI validation points from {source}")
    return result
