"""Population Exposure Risk Layer"""
from typing import Dict
import logging
import numpy as np

try:
    from data_sources.census_loader import census_loader
    from data_sources.openaq_loader import openaq_loader
    from core.aqi_calculator import aqi_calculator
    from core.idw_interpolation import IDWInterpolator
    from db.database import db_manager
    from services.data_sync import get_cached_layer, set_cached_layer, data_sync_service
except ImportError:
    from backend.data_sources.census_loader import census_loader
    from backend.data_sources.openaq_loader import openaq_loader
    from backend.core.aqi_calculator import aqi_calculator
    from backend.core.idw_interpolation import IDWInterpolator
    from backend.db.database import db_manager
    from backend.services.data_sync import get_cached_layer, set_cached_layer, data_sync_service

logger = logging.getLogger(__name__)


async def calculate_population_exposure() -> Dict:
    """Calculate population exposure risk from SQLite observations and Census data"""
    cache_key = "population_exposure"
    cached = get_cached_layer(cache_key)
    if cached:
        return cached

    pop_data = census_loader.load_population_data()

    await db_manager.initialize()
    rows = await db_manager.fetch_all(
        """
        SELECT s.latitude, s.longitude, m.value, m.parameter
        FROM openaq_measurements m
        JOIN openaq_stations s ON m.station_id = s.station_id
        WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
          AND LOWER(m.parameter) IN ('pm25', 'pm2.5', 'pm10')
        """
    )

    if not rows:
        try:
            await data_sync_service.sync_openaq(location_limit=30)
            rows = await db_manager.fetch_all(
                """
                SELECT s.latitude, s.longitude, m.value, m.parameter
                FROM openaq_measurements m
                JOIN openaq_stations s ON m.station_id = s.station_id
                WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
                  AND LOWER(m.parameter) IN ('pm25', 'pm2.5', 'pm10')
                """
            )
        except Exception as e:
            logger.warning(f"Error syncing openaq for population exposure: {e}")

    # Build points for interpolation
    pm25_points = []
    pm25_values = []
    for r in rows:
        param = str(r['parameter']).lower()
        val = float(r['value'])
        if param in ['pm25', 'pm2.5']:
            pm25_points.append([float(r['latitude']), float(r['longitude'])])
            pm25_values.append(val)
        elif param == 'pm10':
            # Ratio approximation if PM2.5 not present
            pm25_points.append([float(r['latitude']), float(r['longitude'])])
            pm25_values.append(val * 0.6)

    if len(pm25_points) < 3 or not pop_data:
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'message': 'Insufficient sensor data',
            'source': 'Census + OpenAQ'
        }

    interpolator = IDWInterpolator(power=2.0, neighbors=10)
    interpolator.fit(np.array(pm25_points), np.array(pm25_values))

    features = []
    for record in pop_data:
        lat = record.get('latitude')
        lon = record.get('longitude')
        if lat is None or lon is None:
            continue

        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
        except (ValueError, TypeError):
            continue

        pm25_value = interpolator.interpolate_point(lat, lon)
        pop_count = record.get('population', 0)
        exposure_risk = pop_count * pm25_value / 1000000.0  # Normalized risk score

        if exposure_risk < 10:
            risk_category = 'Low'
            risk_color = '#00E400'
        elif exposure_risk < 25:
            risk_category = 'Moderate'
            risk_color = '#FFFF00'
        elif exposure_risk < 50:
            risk_category = 'High'
            risk_color = '#FF7E00'
        elif exposure_risk < 100:
            risk_category = 'Very High'
            risk_color = '#FF0000'
        else:
            risk_category = 'Extreme'
            risk_color = '#8F3F97'

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat]
            },
            'properties': {
                'location': record.get('location', 'Unknown'),
                'state': record.get('state', 'Unknown'),
                'population': pop_count,
                'pm25': round(float(pm25_value), 2),
                'exposure_risk': round(float(exposure_risk), 2),
                'risk_category': risk_category,
                'risk_color': risk_color
            }
        })

    result = {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'Census India + OpenAQ PM2.5 (Local SQLite Cache)',
        'description': 'Population exposure risk analysis'
    }

    set_cached_layer(cache_key, result)
    logger.info(f"Generated {len(features)} population exposure features")
    return result
