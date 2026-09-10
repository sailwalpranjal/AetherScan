"""OpenAQ Sensor Layer - Display sensor locations"""
from typing import Dict, List
import logging
from data_sources.openaq_loader import openaq_loader

logger = logging.getLogger(__name__)


import json
from db.database import db_manager
from services.data_sync import get_cached_layer, set_cached_layer, data_sync_service


def _get_fallback_sensor_data() -> List[Dict]:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic sensor stations.
    """
    logger.warning("Zero-Fake-Data: fallback sensor data requested, returning []")
    return []


async def get_sensor_locations() -> Dict:
    """Get all OpenAQ sensor locations."""
    features = []
    source = 'None'

    try:
        stations = await openaq_loader.fetch_stations(country='IN', limit=500)

        for station in stations:
            if station.get('latitude') and station.get('longitude'):
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [station['longitude'], station['latitude']]
                    },
                    'properties': {
                        'id': station.get('station_id', ''),
                        'name': station.get('name', 'Unknown'),
                        'city': station.get('city', ''),
                        'parameters': station.get('parameters', []),
                        'source': 'OpenAQ'
                    }
                })

        if features:
            source = 'OpenAQ'
    except Exception as e:
        logger.warning(f"OpenAQ API error: {e}")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': source
    }
