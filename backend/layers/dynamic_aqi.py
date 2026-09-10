"""
Dynamic AQI Calculation Layer
Computes AQI from sensor data in real-time
"""
from typing import Dict, List, Optional
from data_sources.openaq_loader import openaq_loader
from core.aqi_calculator import aqi_calculator
from core.idw_interpolation import IDWInterpolator
import numpy as np
from datetime import datetime

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

from db.database import db_manager
from services.data_sync import get_cached_layer, set_cached_layer, data_sync_service


async def _get_active_measurements() -> List[Dict]:
    """Retrieve active measurements joined with station coordinates from SQLite cache."""
    try:
        await db_manager.initialize()
        rows = await db_manager.fetch_all(
            """
            SELECT s.latitude, s.longitude, s.city, s.name, m.parameter, m.value
            FROM openaq_measurements m
            JOIN openaq_stations s ON m.station_id = s.station_id
            WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
            """
        )
        if not rows:
            await data_sync_service.sync_openaq(location_limit=30)
            rows = await db_manager.fetch_all(
                """
                SELECT s.latitude, s.longitude, s.city, s.name, m.parameter, m.value
                FROM openaq_measurements m
                JOIN openaq_stations s ON m.station_id = s.station_id
                WHERE m.value >= 0 AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
                """
            )
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"Error fetching measurements from DB: {e}")
        return []


async def calculate_aqi_at_point(lat: float, lon: float) -> Dict:
    """
    Calculate AQI at a specific point using nearby sensors
    Only works over land with nearby sensors (no ocean readings)
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

    # Fetch measurements from SQLite
    measurements = await _get_active_measurements()

    if not measurements:
        return {
            'error': 'No sensor data available',
            'aqi': 0,
            'category': 'No Data',
            'color': '#808080',
            'message': 'No air quality sensors found in India'
        }

    # Calculate distance to nearest sensor
    min_distance = float('inf')
    for measure in measurements:
        if measure.get('latitude') and measure.get('longitude'):
            dlat = measure['latitude'] - lat
            dlon = measure['longitude'] - lon
            dist = np.sqrt(dlat**2 + dlon**2) * 111
            min_distance = min(min_distance, dist)

    if min_distance > 500:
        return {
            'error': 'No nearby sensors',
            'aqi': 0,
            'category': 'No Data',
            'color': '#808080',
            'message': f'Nearest sensor is {min_distance:.1f}km away. AQI calculation requires sensors within 500km.',
            'nearest_sensor_distance': round(min_distance, 1)
        }

    param_data = {}
    for measure in measurements:
        param = measure['parameter'].lower().replace('.', '').replace('_', '')
        if param not in param_data:
            param_data[param] = {'points': [], 'values': []}
        if measure.get('latitude') and measure.get('longitude'):
            param_data[param]['points'].append([measure['latitude'], measure['longitude']])
            param_data[param]['values'].append(measure['value'])

    interpolated_values = {}
    for param, data in param_data.items():
        if len(data['points']) < 3:
            continue
        try:
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
        'timestamp': datetime.utcnow().isoformat(),
        'nearest_sensor_distance': round(min_distance, 1)
    }


async def get_aqi_heatmap_layer(resolution: float = 0.5) -> Dict:
    """
    Generate full AQI heatmap for India using SQLite measurements and caching.
    """
    cache_key = f"aqi_heatmap_{resolution}"
    cached = get_cached_layer(cache_key)
    if cached:
        return cached

    measurements = await _get_active_measurements()

    if not measurements:
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'message': 'No data available',
            'source': 'OpenAQ'
        }

    location_measurements = {}
    for measure in measurements:
        lat = measure.get('latitude')
        lon = measure.get('longitude')
        if lat is None or lon is None:
            continue
        try:
            lat = float(lat)
            lon = float(lon)
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                continue
        except (ValueError, TypeError):
            continue

        key = (round(lat, 2), round(lon, 2))
        if key not in location_measurements:
            location_measurements[key] = {}

        param = measure['parameter'].lower().replace('.', '').replace('_', '')
        if param not in location_measurements[key]:
            location_measurements[key][param] = []
        location_measurements[key][param].append(measure['value'])

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

    result = {
        'type': 'FeatureCollection',
        'features': features,
        'count': len(features),
        'source': 'OpenAQ Real-time (SQLite)',
        'description': 'Dynamic AQI heatmap from sensor measurements',
        'resolution': f'{resolution} degrees'
    }

    if features:
        set_cached_layer(cache_key, result)

    print(f"[OK] Generated {len(features)} AQI heatmap points")
    return result
