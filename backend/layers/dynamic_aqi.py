"""
Dynamic AQI Calculation Layer
Computes AQI from sensor data in real-time
"""
from typing import Dict, List, Optional
from data_sources.openaq_loader import openaq_loader
from core.aqi_calculator import aqi_calculator
from core.idw_interpolation import IDWInterpolator
import numpy as np

async def calculate_aqi_at_point(lat: float, lon: float) -> Dict:
    """
    Calculate AQI at a specific point using nearby sensors
    Only works over land with nearby sensors (no ocean readings)

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        AQI result dictionary
    """
    from config.settings import settings

    # Check if point is within India bounds
    bounds = settings.INDIA_BOUNDS
    if not (bounds['min_lat'] <= lat <= bounds['max_lat'] and
            bounds['min_lon'] <= lon <= bounds['max_lon']):
        return {
            'error': 'Location outside India',
            'aqi': 0,
            'category': 'Out of Bounds',
            'color': '#808080',
            'message': 'AQI calculation only available for locations within India'
        }

    # Fetch nearby measurements
    measurements = await openaq_loader.fetch_latest_measurements(country='IN')

    if not measurements:
        return {
            'error': 'No sensor data available',
            'aqi': 0,
            'category': 'No Data',
            'color': '#808080',
            'message': 'No air quality sensors found in India'
        }

    # Check if there are sensors nearby (within 200km)
    # Calculate distance to nearest sensor
    min_distance = float('inf')
    for measure in measurements:
        if measure['latitude'] and measure['longitude']:
            # Haversine distance formula (simplified)
            dlat = measure['latitude'] - lat
            dlon = measure['longitude'] - lon
            dist = np.sqrt(dlat**2 + dlon**2) * 111  # Rough km conversion
            min_distance = min(min_distance, dist)

    # If no sensors within 500km, don't interpolate (allows better coverage across India)
    if min_distance > 500:
        return {
            'error': 'No nearby sensors',
            'aqi': 0,
            'category': 'No Data',
            'color': '#808080',
            'message': f'Nearest sensor is {min_distance:.1f}km away. AQI calculation requires sensors within 500km.',
            'nearest_sensor_distance': round(min_distance, 1)
        }

    # Organize by parameter
    param_data = {}

    for measure in measurements:
        param = measure['parameter'].lower().replace('.', '').replace('_', '')
        if param not in param_data:
            param_data[param] = {
                'points': [],
                'values': []
            }

        if measure['latitude'] and measure['longitude']:
            param_data[param]['points'].append([measure['latitude'], measure['longitude']])
            param_data[param]['values'].append(measure['value'])

    # Interpolate each parameter at the query point
    interpolated_values = {}

    for param, data in param_data.items():
        if len(data['points']) < 3:
            continue

        try:
            # Use more neighbors for better coverage (10 instead of 5)
            interpolator = IDWInterpolator(power=1.5, neighbors=10)
            interpolator.fit(np.array(data['points']), np.array(data['values']))
            value = interpolator.interpolate_point(lat, lon)

            if value > 0:
                interpolated_values[param] = float(value)
        except Exception as e:
            print(f"Error interpolating {param}: {e}")
            continue

    if not interpolated_values:
        return {
            'error': 'Insufficient data for interpolation',
            'aqi': 0,
            'category': 'No Data',
            'color': '#808080',
            'message': 'Not enough sensor data to calculate AQI at this location'
        }

    # Calculate AQI
    aqi_result = aqi_calculator.calculate_aqi(interpolated_values)

    return {
        'latitude': lat,
        'longitude': lon,
        'aqi': aqi_result['aqi'],
        'category': aqi_result['category'],
        'color': aqi_result['color'],
        'dominant_pollutant': aqi_result['dominant_pollutant'],
        'pollutants': interpolated_values,
        'breakdowns': aqi_result['breakdowns'],
        'nearest_sensor_distance': round(min_distance, 1)
    }

async def get_aqi_heatmap_layer(resolution: float = 0.5) -> Dict:
    """
    Generate full AQI heatmap for India

    Args:
        resolution: Grid resolution in degrees

    Returns:
        GeoJSON FeatureCollection with AQI heatmap data
    """
    measurements = await openaq_loader.fetch_latest_measurements(country='IN')

    if not measurements:
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'message': 'No data available',
            'source': 'OpenAQ'
        }

    # Group measurements by location
    location_measurements = {}

    for measure in measurements:
        lat = measure.get('latitude')
        lon = measure.get('longitude')

        # Validate coordinates
        if lat is None or lon is None:
            continue

        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
        except (ValueError, TypeError):
            continue

        # Round to create location buckets
        key = (round(lat, 2), round(lon, 2))

        if key not in location_measurements:
            location_measurements[key] = {}

        param = measure['parameter'].lower().replace('.', '').replace('_', '')
        if param not in location_measurements[key]:
            location_measurements[key][param] = []

        location_measurements[key][param].append(measure['value'])

    # Calculate AQI for each location - Return as GeoJSON
    features = []

    for (lat, lon), params in location_measurements.items():
        avg_params = {}
        for param, values in params.items():
            if values:
                avg_params[param] = np.mean(values)

        if avg_params:
            aqi_result = aqi_calculator.calculate_aqi(avg_params)

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'aqi': aqi_result['aqi'],
                    'category': aqi_result['category'],
                    'color': aqi_result['color'],
                    'dominant_pollutant': aqi_result.get('dominant_pollutant', 'unknown'),
                    'pollutants': avg_params
                }
            })

    print(f"[OK] Generated {len(features)} AQI heatmap points")

    return {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'OpenAQ Real-time',
        'description': 'Dynamic AQI heatmap from sensor measurements',
        'resolution': f'{resolution} degrees'
    }
