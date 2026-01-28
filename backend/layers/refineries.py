"""Refineries Layer - REAL DATA FROM OSM"""
from typing import Dict
from data_sources.osm_overpass_loader import osm_overpass_loader
from config.settings import settings

async def get_refineries() -> Dict:
    """
    Get refinery locations from OpenStreetMap

    Returns:
        GeoJSON FeatureCollection with refineries
    """
    refineries = await osm_overpass_loader.fetch_refineries(bounds=settings.INDIA_BOUNDS)

    features = []
    for ref in refineries:
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [ref['longitude'], ref['latitude']]
            },
            'properties': {
                'name': ref['name'],
                'type': ref['type'],
                'operator': ref['operator'],
                'capacity': ref['capacity'],
                'source': 'OpenStreetMap',
                'osm_id': ref['osm_id']
            }
        })

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'OpenStreetMap Overpass API',
        'url': 'https://www.openstreetmap.org'
    }
