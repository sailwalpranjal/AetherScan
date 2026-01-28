"""AQI Validation Layer - Cross-validate OpenAQ with FIRMS data"""
from typing import Dict, List
from data_sources.openaq_loader import openaq_loader
from data_sources.nasa_firms_loader import nasa_firms_loader
from core.aqi_calculator import aqi_calculator
import numpy as np
import random


def _get_fallback_validation_data() -> List[Dict]:
    """Fallback AQI validation data for major fire-affected regions"""
    random.seed(42)

    # Regions where crop burning typically affects AQI
    fire_aqi_correlations = [
        {'lat': 30.7333, 'lon': 76.7794, 'region': 'Punjab', 'aqi': 185, 'frp': 45},
        {'lat': 31.3260, 'lon': 75.5762, 'region': 'Punjab', 'aqi': 195, 'frp': 52},
        {'lat': 29.0588, 'lon': 76.0856, 'region': 'Haryana', 'aqi': 175, 'frp': 38},
        {'lat': 28.6139, 'lon': 77.2090, 'region': 'Delhi', 'aqi': 210, 'frp': 25},
        {'lat': 26.8467, 'lon': 80.9462, 'region': 'UP', 'aqi': 165, 'frp': 32},
        {'lat': 25.5941, 'lon': 85.1376, 'region': 'Bihar', 'aqi': 155, 'frp': 28},
        {'lat': 23.2599, 'lon': 77.4126, 'region': 'MP', 'aqi': 120, 'frp': 18},
        {'lat': 22.7196, 'lon': 75.8577, 'region': 'MP', 'aqi': 115, 'frp': 15},
    ]

    features = []
    for point in fire_aqi_correlations:
        aqi = point['aqi'] + random.randint(-15, 15)
        if aqi <= 50:
            category, color = 'Good', '#00E400'
        elif aqi <= 100:
            category, color = 'Moderate', '#FFFF00'
        elif aqi <= 150:
            category, color = 'Unhealthy for Sensitive', '#FF7E00'
        elif aqi <= 200:
            category, color = 'Unhealthy', '#FF0000'
        elif aqi <= 300:
            category, color = 'Very Unhealthy', '#8F3F97'
        else:
            category, color = 'Hazardous', '#7E0023'

        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [point['lon'], point['lat']]
            },
            'properties': {
                'fire_intensity': point['frp'] + random.randint(-5, 10),
                'aqi': aqi,
                'category': category,
                'color': color,
                'correlation': 'fire_detected',
                'dominant_pollutant': 'PM2.5',
                'region': point['region'],
                'source': 'Fallback'
            }
        })

    return features


async def get_aqi_validation() -> Dict:
    """Validate AQI with fire correlation"""
    features = []
    source = 'Fallback Data'

    try:
        measurements = await openaq_loader.fetch_latest_measurements(country='IN')
        fires = await nasa_firms_loader.fetch_active_fires(days=1)

        if measurements and fires:
            # Find stations near fire points - Return as GeoJSON
            for fire in fires[:100]:  # Limit for performance
                fire_lat, fire_lon = fire['latitude'], fire['longitude']

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

                    dist = np.sqrt((m['latitude'] - fire_lat)**2 + (m['longitude'] - fire_lon)**2)
                    if dist < 0.5:  # Within ~50km
                        nearby.append(m)

                if nearby:
                    # Calculate AQI
                    params = {}
                    for m in nearby:
                        param = m['parameter'].lower().replace('.', '').replace('_', '')
                        if param not in params:
                            params[param] = []
                        params[param].append(m['value'])

                    avg_params = {k: np.mean(v) for k, v in params.items()}
                    aqi_result = aqi_calculator.calculate_aqi(avg_params)

                    features.append({
                        'type': 'Feature',
                        'geometry': {
                            'type': 'Point',
                            'coordinates': [fire_lon, fire_lat]
                        },
                        'properties': {
                            'fire_intensity': fire['frp'],
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
        print(f"[WARN] AQI validation error: {e}")

    # Use fallback if no data from APIs
    if not features:
        print("[INFO] Using fallback AQI validation data")
        features = _get_fallback_validation_data()
        source = 'Fallback Data'

    print(f"[OK] Generated {len(features)} AQI validation points")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': source,
        'description': 'AQI validation with fire detection correlation'
    }
