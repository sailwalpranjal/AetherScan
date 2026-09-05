"""Population Density Layer using WorldPop and Census data"""
from typing import Dict, List
from data_sources.worldpop_loader import worldpop_loader
from data_sources.bhuvan_loader import bhuvan_loader

async def get_population_density_wms() -> Dict:
    """Get population density as GeoJSON (compatible with MapLibre)"""
    # Return GeoJSON instead of WMS for better compatibility
    # WMS layers are harder to render in MapLibre
    return await get_population_points()


def _get_fallback_population_data() -> List[Dict]:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic population density data.
    """
    return []


async def get_population_points() -> Dict:
    """
    Get population data as points from WorldPop (priority) or Census (fallback)
    """
    features = []

    # Try WorldPop first (more detailed)
    try:
        if worldpop_loader.is_data_available():
            print("[INFO] Using WorldPop raster data")
            grid_data = worldpop_loader.extract_population_grid(
                grid_size=50  # 50x50 grid for good coverage
            )

            for point in grid_data:
                if point.get('population_density', 0) > 0:
                    features.append({
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [point['longitude'], point['latitude']]
                        },
                        'properties': {
                            'population_density': point['population_density'],
                            'source': 'WorldPop',
                            'unit': 'people per pixel'
                        }
                    })

            if features:
                return {
                    'type': 'FeatureCollection',
                    'features': features,
                    'count': len(features),
                    'source': 'WorldPop 2020',
                    'url': 'https://www.worldpop.org/'
                }
    except Exception as e:
        print(f"[WARN] WorldPop data unavailable: {e}")

    # Try Census Excel data
    try:
        from data_sources.census_excel_processor import census_excel_processor
        print("[INFO] Trying Census Excel data")
        pop_data = census_excel_processor.get_state_population_grid()

        if pop_data:
            for record in pop_data:
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [record['longitude'], record['latitude']]
                    },
                    'properties': {
                        'state': record.get('state', ''),
                        'population_total_millions': record.get('population_total_millions', 0),
                        'population_density': record.get('population_density', 0),
                        'source': 'Census India',
                        'unit': 'people per km²'
                    }
                })

            if features:
                return {
                    'type': 'FeatureCollection',
                    'features': features,
                    'count': len(features),
                    'source': 'Census India'
                }
    except Exception as e:
        print(f"[WARN] Census data unavailable: {e}")

    # Zero-Fake-Data Invariant: If data unavailable, return empty collection cleanly
    return {
        'type': 'FeatureCollection',
        'features': [],
        'count': 0,
        'source': 'None',
        'description': 'Population density across India'
    }
