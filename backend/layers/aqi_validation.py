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
    """Validate AQI with fire correlation using real measurements and FIRMS data."""
    features = []
    source = 'None'

    try:
        measurements = await openaq_loader.fetch_latest_measurements(country='IN')
        fires = await nasa_firms_loader.fetch_active_fires(days=1)

        if measurements and fires:
            # Find stations near fire points - Return as GeoJSON
            for fire in fires[:100]:  # Limit for performance
                fire_lat = fire.get('latitude')
                fire_lon = fire.get('longitude')

                # Validate coordinates
                try:
                    fire_lat = float(fire_lat)
                    fire_lon = float(fire_lon)
                    if not (-90 <= fire_lat <= 90 and -180 <= fire_lon <= 180):
                        continue
                except (ValueError, TypeError):
                    continue

                # Find nearby measurements
                nearby = []
                for m in measurements:
                    if not m.get('latitude') or not m.get('longitude'):
                        continue

                    dist = math.sqrt((float(m['latitude']) - fire_lat)**2 + (float(m['longitude']) - fire_lon)**2)
                    if dist < 0.5:  # Within ~50km
                        nearby.append(m)

                if nearby:
                    # Calculate AQI
                    params = {}
                    for m in nearby:
                        param = str(m.get('parameter', '')).lower().replace('.', '').replace('_', '')
                        if param not in params:
                            params[param] = []
                        if m.get('value') is not None:
                            try:
                                params[param].append(float(m['value']))
                            except (ValueError, TypeError):
                                pass

                    if params:
                        avg_params = {k: float(sum(v) / len(v)) for k, v in params.items() if v}
                        if avg_params:
                            aqi_result = aqi_calculator.calculate_aqi(avg_params)

                            features.append({
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [fire_lon, fire_lat]
                                },
                                'properties': {
                                    'fire_intensity': fire.get('frp', 0.0),
                                    'aqi': aqi_result['aqi'],
                                    'category': aqi_result['category'],
                                    'color': aqi_result.get('color', '#808080'),
                                    'correlation': 'fire_detected',
                                    'dominant_pollutant': aqi_result.get('dominant_pollutant', 'unknown')
                                }
                            })

            if features:
                source = 'OpenAQ + NASA FIRMS'

    except Exception as e:
        logger.warning(f"AQI validation error: {e}")

    logger.info(f"Generated {len(features)} AQI validation points from {source}")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': source,
        'description': 'AQI validation with fire detection correlation'
    }
