"""Power Plants Layer - REAL DATA FROM MULTIPLE SOURCES"""
from typing import Dict
from data_sources.global_power_plant_loader import global_power_plant_loader
from data_sources.osm_overpass_loader import osm_overpass_loader
from config.settings import settings

async def get_power_plants() -> Dict:
    """
    Get power plant locations from REAL DATA sources

    Priority:
    1. Global Power Plant Database (WRI) - Most comprehensive
    2. OpenStreetMap Overpass API - Real-time community data

    Returns:
        GeoJSON FeatureCollection with all power plants
    """
    # Try Global Power Plant Database first (best source)
    plants_gppd = global_power_plant_loader.load_india_power_plants()

    # If GPPD has real data, use it
    if len(plants_gppd) > 3:  # More than sample data
        print(f"[OK] Using Global Power Plant Database: {len(plants_gppd)} plants")

        features = []
        for plant in plants_gppd:
            # Filter: Only India
            country = plant.get('country', '').upper()

            # Skip if not India
            if country != 'IND':
                continue

            # Validate coordinates
            lat = plant.get('latitude')
            lon = plant.get('longitude')

            if lat is None or lon is None:
                continue

            try:
                lat = float(lat)
                lon = float(lon)
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    continue
                # India bounds check
                if not (6 <= lat <= 37 and 68 <= lon <= 98):
                    continue
            except (ValueError, TypeError):
                continue

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'name': plant.get('name', 'Unknown Power Plant'),
                    'capacity_mw': plant.get('capacity_mw', 0),
                    'fuel_type': plant.get('primary_fuel', 'unknown'),
                    'owner': plant.get('owner', ''),
                    'commissioning_year': plant.get('commissioning_year', ''),
                    'source': 'Global Power Plant Database (WRI)',
                    'gppd_id': plant.get('gppd_id', '')
                }
            })

        print(f"[OK] Filtered to {len(features)} India power plants")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'Global Power Plant Database (WRI)',
            'url': 'https://datasets.wri.org/dataset/globalpowerplantdatabase'
        }

    # Fallback to OpenStreetMap
    print("[WARN] GPPD not available, using OpenStreetMap...")
    plants_osm = await osm_overpass_loader.fetch_power_plants(bounds=settings.INDIA_BOUNDS)

    features = []
    for plant in plants_osm:
        # Validate coordinates
        lat = plant.get('latitude')
        lon = plant.get('longitude')

        if lat is None or lon is None:
            continue

        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
            # India bounds check
            if not (6 <= lat <= 37 and 68 <= lon <= 98):
                continue
        except (ValueError, TypeError):
            continue

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat]
            },
            'properties': {
                'name': plant.get('name', 'Unknown Power Plant'),
                'source_type': plant.get('source', ''),
                'operator': plant.get('operator', ''),
                'output': plant.get('output', ''),
                'source': 'OpenStreetMap',
                'osm_id': plant.get('osm_id', '')
            }
        })

    print(f"[OK] Filtered to {len(features)} OSM power plants in India")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'OpenStreetMap Overpass API',
        'url': 'https://www.openstreetmap.org'
    }
