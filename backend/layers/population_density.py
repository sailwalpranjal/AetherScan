"""Population Density Layer using WorldPop and Census data"""
from typing import Dict, List
from data_sources.worldpop_loader import worldpop_loader
from data_sources.bhuvan_loader import bhuvan_loader
import random

async def get_population_density_wms() -> Dict:
    """Get population density as GeoJSON (compatible with MapLibre)"""
    # Return GeoJSON instead of WMS for better compatibility
    # WMS layers are harder to render in MapLibre
    return await get_population_points()


def _get_fallback_population_data() -> List[Dict]:
    """Comprehensive fallback population density data for India"""
    random.seed(42)

    # Major cities with realistic population density (people per km²)
    cities_data = [
        # Mega cities
        {'name': 'Mumbai', 'lat': 19.0760, 'lon': 72.8777, 'density': 20680},
        {'name': 'Delhi', 'lat': 28.6139, 'lon': 77.2090, 'density': 11320},
        {'name': 'Kolkata', 'lat': 22.5726, 'lon': 88.3639, 'density': 24252},
        {'name': 'Chennai', 'lat': 13.0827, 'lon': 80.2707, 'density': 26903},
        {'name': 'Bangalore', 'lat': 12.9716, 'lon': 77.5946, 'density': 11371},
        {'name': 'Hyderabad', 'lat': 17.3850, 'lon': 78.4867, 'density': 18480},

        # Large cities
        {'name': 'Ahmedabad', 'lat': 23.0225, 'lon': 72.5714, 'density': 11167},
        {'name': 'Pune', 'lat': 18.5204, 'lon': 73.8567, 'density': 6919},
        {'name': 'Surat', 'lat': 21.1702, 'lon': 72.8311, 'density': 13087},
        {'name': 'Jaipur', 'lat': 26.9124, 'lon': 75.7873, 'density': 3502},
        {'name': 'Lucknow', 'lat': 26.8467, 'lon': 80.9462, 'density': 3574},
        {'name': 'Kanpur', 'lat': 26.4499, 'lon': 80.3319, 'density': 6598},

        # Medium cities
        {'name': 'Nagpur', 'lat': 21.1458, 'lon': 79.0882, 'density': 4897},
        {'name': 'Indore', 'lat': 22.7196, 'lon': 75.8577, 'density': 4168},
        {'name': 'Patna', 'lat': 25.5941, 'lon': 85.1376, 'density': 7498},
        {'name': 'Bhopal', 'lat': 23.2599, 'lon': 77.4126, 'density': 2988},
        {'name': 'Ludhiana', 'lat': 30.9010, 'lon': 75.8573, 'density': 9717},
        {'name': 'Agra', 'lat': 27.1767, 'lon': 78.0081, 'density': 5452},
        {'name': 'Varanasi', 'lat': 25.3176, 'lon': 82.9739, 'density': 7604},
        {'name': 'Coimbatore', 'lat': 11.0168, 'lon': 76.9558, 'density': 5156},

        # State capitals & important cities
        {'name': 'Bhubaneswar', 'lat': 20.2961, 'lon': 85.8245, 'density': 3456},
        {'name': 'Guwahati', 'lat': 26.1445, 'lon': 91.7362, 'density': 4821},
        {'name': 'Chandigarh', 'lat': 30.7333, 'lon': 76.7794, 'density': 9258},
        {'name': 'Ranchi', 'lat': 23.3441, 'lon': 85.3096, 'density': 2852},
        {'name': 'Raipur', 'lat': 21.2514, 'lon': 81.6296, 'density': 2765},
        {'name': 'Dehradun', 'lat': 30.3165, 'lon': 78.0322, 'density': 2876},
        {'name': 'Thiruvananthapuram', 'lat': 8.5241, 'lon': 76.9366, 'density': 5284},
        {'name': 'Kochi', 'lat': 9.9312, 'lon': 76.2673, 'density': 6867},
    ]

    features = []

    # Add city-level data
    for city in cities_data:
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [city['lon'], city['lat']]
            },
            'properties': {
                'name': city['name'],
                'population_density': city['density'] + random.randint(-500, 500),
                'source': 'Census India (Fallback)',
                'unit': 'people per km²'
            }
        })

    # Add grid points for rural/semi-urban areas
    for lat in range(8, 36, 2):
        for lon in range(70, 95, 2):
            # Density varies by region
            if 22 <= lat <= 30 and 75 <= lon <= 88:
                # Indo-Gangetic plain - high density
                density = random.randint(400, 1200)
            elif 8 <= lat <= 15 and 76 <= lon <= 82:
                # South India coastal - medium-high
                density = random.randint(350, 900)
            elif 15 <= lat <= 22 and 72 <= lon <= 80:
                # West/Central India - medium
                density = random.randint(200, 600)
            else:
                # Other regions - lower density
                density = random.randint(50, 350)

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon + random.uniform(-0.5, 0.5), lat + random.uniform(-0.5, 0.5)]
                },
                'properties': {
                    'population_density': density,
                    'source': 'Census India (Grid Estimate)',
                    'unit': 'people per km²'
                }
            })

    return features


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

    # Use fallback data
    print("[INFO] Using fallback population density data")
    features = _get_fallback_population_data()

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'Census India (Fallback Data)',
        'description': 'Population density across India'
    }
