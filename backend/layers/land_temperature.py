"""
Land Temperature Layer - USES NASA POWER API (Free, no files required)
"""
from typing import Dict, List
from data_sources.nasa_power_loader import nasa_power_loader
from config.settings import settings
import asyncio

async def get_land_temperature_layer() -> Dict:
    """
    Get land temperature data from NASA POWER API

    Uses NASA POWER satellite-derived data:
    - T2M: Temperature at 2 meters (daily average)
    - T2M_MAX: Maximum temperature at 2 meters
    - T2M_MIN: Minimum temperature at 2 meters

    Returns:
        GeoJSON FeatureCollection with temperature grid points
    """
    print("[INFO] Loading land temperature from NASA POWER API")

    try:
        # Fetch temperature data from NASA POWER (uses grid across India)
        temp_data = await asyncio.wait_for(
            nasa_power_loader.fetch_temperature_grid_india(
                grid_spacing=4.0  # 4 degree grid for fast response under 30s timeout
            ),
            timeout=25.0  # 25 second timeout (Render free tier limit is 30s)
        )

        if not temp_data:
            print("[ERROR] No NASA POWER temperature data available")
            return {
                'type': 'FeatureCollection',
                'features': [],
                'count': 0,
                'error': 'No NASA POWER data available',
                'source': 'NASA POWER'
            }

        features = []

        for point in temp_data:
            lat = point.get('latitude')
            lon = point.get('longitude')

            # Skip points with missing coordinates
            if lat is None or lon is None:
                continue

            # Validate coordinates
            try:
                lat = float(lat)
                lon = float(lon)
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    continue
            except (ValueError, TypeError):
                continue

            # Extract temperature
            temperature = point.get('temperature')

            # Skip invalid temperature values (-999 is NASA's missing data indicator)
            if temperature is None or temperature <= -999:
                continue

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon, lat]
                },
                'properties': {
                    'temperature': round(temperature, 1),
                    'temperature_max': round(point.get('temperature_max', temperature), 1) if point.get('temperature_max') and point.get('temperature_max') > -999 else None,
                    'temperature_min': round(point.get('temperature_min', temperature), 1) if point.get('temperature_min') and point.get('temperature_min') > -999 else None,
                    'source': 'NASA POWER',
                    'unit': 'C',
                    'date': point.get('date', 'Recent'),
                    'description': 'Temperature at 2 meters above ground'
                }
            })

        print(f"[OK] Loaded {len(features)} temperature points from NASA POWER")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'NASA POWER (Real satellite data)',
            'description': 'Land surface temperature from NASA POWER',
            'url': 'https://power.larc.nasa.gov/'
        }

    except asyncio.TimeoutError:
        print("[ERROR] NASA POWER API timeout for temperature")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'error': 'API timeout',
            'source': 'NASA POWER'
        }
    except Exception as e:
        print(f"[ERROR] Error loading NASA POWER temperature data: {e}")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'error': str(e),
            'source': 'NASA POWER'
        }
