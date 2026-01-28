"""Crop Burning Impact Layer using NASA FIRMS"""
from typing import Dict, Optional
from data_sources.nasa_firms_loader import nasa_firms_loader
from datetime import datetime, timedelta
import random

async def get_crop_burning_fires(days: int = 7) -> Dict:
    """Get recent crop burning fire detections"""
    source = 'Fallback Data'
    features = []

    try:
        fires = await nasa_firms_loader.fetch_active_fires(days=days)

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

        if features:
            source = 'NASA FIRMS'
    except Exception as e:
        print(f"[ERROR] NASA FIRMS API error: {e}")

    # If no fires from API, return realistic fallback data for crop burning season
    if not features:
        print("[INFO] Using fallback fire data - NASA FIRMS API unavailable")
        features = _get_fallback_fire_data()
        source = 'Fallback Data'

    print(f"[OK] Returning {len(features)} crop burning fire points")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'days': days,
        'source': source
    }

async def get_fire_density(date_from: Optional[str] = None, date_to: Optional[str] = None) -> Dict:
    """Get fire density as GeoJSON FeatureCollection (compatible with frontend)"""
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    if not date_to:
        date_to = datetime.utcnow().strftime('%Y-%m-%d')

    try:
        density_data = await nasa_firms_loader.get_fire_density_grid(date_from, date_to)

        # Convert grid format to GeoJSON FeatureCollection
        features = []

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

        # If no data, return fallback density data
        if not features:
            print("[INFO] Using fallback fire density data")
            features = _get_fallback_density_data()

    except Exception as e:
        print(f"[ERROR] Fire density calculation failed: {e}")
        features = _get_fallback_density_data()

    # Always ensure we have data
    if not features:
        features = _get_fallback_density_data()

    print(f"[OK] Returning {len(features)} fire density points")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'date_from': date_from,
        'date_to': date_to,
        'source': 'Fallback Data'  # Always mark as fallback since FIRMS requires DB
    }


def _get_fallback_fire_data() -> list:
    """Realistic fallback fire data for India's crop burning regions"""
    random.seed(42)  # Reproducible

    # Major crop burning regions in India (Punjab, Haryana, UP during Oct-Nov)
    fire_hotspots = [
        # Punjab - major crop burning
        (30.7333, 76.7794, 'Punjab - Ludhiana'),
        (31.3260, 75.5762, 'Punjab - Jalandhar'),
        (30.9010, 75.8573, 'Punjab - Moga'),
        (30.1471, 75.3412, 'Punjab - Bathinda'),
        (29.9457, 76.8280, 'Punjab - Patiala'),
        # Haryana
        (29.0588, 76.0856, 'Haryana - Hisar'),
        (29.6857, 76.9905, 'Haryana - Karnal'),
        (29.3909, 76.9635, 'Haryana - Panipat'),
        # Uttar Pradesh
        (27.1767, 78.0081, 'UP - Agra'),
        (26.4499, 80.3319, 'UP - Kanpur'),
        (26.8467, 80.9462, 'UP - Lucknow'),
        # Madhya Pradesh
        (23.2599, 77.4126, 'MP - Bhopal'),
        (22.7196, 75.8577, 'MP - Indore'),
        # Bihar
        (25.5941, 85.1376, 'Bihar - Patna'),
    ]

    features = []
    for lat, lon, region in fire_hotspots:
        # Add some variation around each hotspot
        for _ in range(random.randint(3, 8)):
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [
                        lon + random.uniform(-0.5, 0.5),
                        lat + random.uniform(-0.5, 0.5)
                    ]
                },
                'properties': {
                    'brightness': random.uniform(310, 380),
                    'confidence': random.choice(['nominal', 'high', 'low']),
                    'frp': random.uniform(10, 200),
                    'date': datetime.utcnow().strftime('%Y-%m-%d'),
                    'time': f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}",
                    'satellite': 'VIIRS',
                    'region': region,
                    'source': 'Fallback'
                }
            })

    return features


def _get_fallback_density_data() -> list:
    """Fallback fire density grid data"""
    random.seed(42)

    features = []

    # High density regions (Punjab, Haryana)
    high_density_areas = [
        (30.5, 75.5, 15), (30.5, 76.5, 18), (31.0, 75.5, 12),
        (29.5, 76.0, 10), (29.5, 77.0, 8),
    ]

    # Medium density (UP, MP)
    medium_density_areas = [
        (27.0, 78.0, 5), (26.5, 80.0, 6), (23.5, 77.5, 4),
        (25.5, 85.0, 3), (22.5, 75.5, 4),
    ]

    # Low density scattered across India
    for lat in range(8, 35, 3):
        for lon in range(70, 95, 3):
            density = random.randint(0, 3)
            if density > 0:
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lon + random.uniform(-0.5, 0.5), lat + random.uniform(-0.5, 0.5)]
                    },
                    'properties': {
                        'density': density,
                        'fire_count': density,
                        'source': 'Fallback'
                    }
                })

    # Add high density points
    for lat, lon, density in high_density_areas:
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat]
            },
            'properties': {
                'density': density,
                'fire_count': density,
                'source': 'Fallback'
            }
        })

    # Add medium density points
    for lat, lon, density in medium_density_areas:
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [lon, lat]
            },
            'properties': {
                'density': density,
                'fire_count': density,
                'source': 'Fallback'
            }
        })

    return features
