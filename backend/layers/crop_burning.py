"""Crop Burning Impact Layer using NASA FIRMS"""
from typing import Dict, Optional, List
from data_sources.nasa_firms_loader import nasa_firms_loader
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


from services.data_sync import get_cached_layer, set_cached_layer
from db.database import db_manager


async def get_crop_burning_fires(days: int = 5) -> Dict:
    """Get recent crop burning fire detections from real NASA FIRMS data."""
    source = 'NASA FIRMS'
    features = []
    effective_days = max(1, min(int(days), 7))

    try:
        fires = await nasa_firms_loader.fetch_active_fires(days=effective_days)
        for fire in fires:
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [fire['longitude'], fire['latitude']]
                },
                'properties': {
                    'brightness': fire['brightness'],
                    'confidence': fire['confidence'],
                    'frp': fire['frp'],
                    'date': fire['acq_date'],
                    'time': fire['acq_time'],
                    'satellite': fire['satellite']
                }
            })
    except Exception as e:
        logger.error(f"NASA FIRMS layer error: {e}")

    if not features:
        source = 'None'

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'days': effective_days,
        'source': source
    }


async def get_fire_density(date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict:
    """Get fire density as GeoJSON FeatureCollection."""
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not date_to:
        date_to = datetime.utcnow().strftime('%Y-%m-%d')

    features = []
    source = 'NASA FIRMS'

    try:
        density_data = await nasa_firms_loader.get_fire_density_grid(date_from, date_to)

        if density_data and density_data.get('lats') and density_data.get('lons') and density_data.get('counts'):
            lats = density_data['lats']
            lons = density_data['lons']
            counts = density_data['counts']

            for i, lat in enumerate(lats):
                for j, lon in enumerate(lons):
                    if i < len(counts) and j < len(counts[i]):
                        count = counts[i][j]
                        if count > 0:
                            features.append({
                                'type': 'Feature',
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [lon, lat]
                                },
                                'properties': {
                                    'density': count,
                                    'fire_count': count,
                                    'source': 'NASA FIRMS'
                                }
                            })
    except Exception as e:
        logger.error(f"Fire density calculation failed: {e}")

    if not features:
        source = 'None'

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'date_from': date_from,
        'date_to': date_to,
        'source': source
    }


def _get_fallback_fire_data() -> list:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic fire points.
    """
    logger.warning("Zero-Fake-Data: fallback fire generator requested, returning []")
    return []


def _get_fallback_density_data() -> list:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic density points.
    """
    logger.warning("Zero-Fake-Data: fallback density generator requested, returning []")
    return []
