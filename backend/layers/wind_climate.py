"""
Wind Direction & Climate Layer - USES REAL NASA POWER DATA
"""
from typing import Dict, List
from data_sources.nasa_power_loader import nasa_power_loader
import asyncio

def _get_fallback_wind_data() -> List[Dict]:
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic wind data.
    """
    return []


async def get_wind_climate() -> Dict:
    """
    Get wind and climate data from NASA POWER API

    Uses REAL NASA POWER data with reduced grid to respect API limits
    Grid: 4x4 = 16 points (well under rate limit)

    Returns:
        GeoJSON FeatureCollection with wind and climate data
    """
    print("[INFO] Fetching wind climate from NASA POWER API (reduced grid)")

    try:
        # Use small grid for fast response under Render's 30s timeout
        # With 8-degree spacing: ~4x4 = 16 API calls
        wind_data = await asyncio.wait_for(
            nasa_power_loader.fetch_wind_climate_india(
                date=None,  # Yesterday's data
                grid_spacing=8.0  # Large spacing for fast response
            ),
            timeout=25.0  # 25 second timeout (Render free tier limit is 30s)
        )

        features = []

        if wind_data:
            for point in wind_data:
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

                # Extract climate variables
                wind_speed = point.get('wind_speed')
                wind_direction = point.get('wind_direction')
                temperature = point.get('temperature')
                humidity = point.get('humidity')
                pressure = point.get('pressure')

                # Skip if no wind data or invalid data (-999 is NASA POWER's missing data indicator)
                if wind_speed is None or wind_speed <= -999 or wind_speed < 0:
                    continue

                # Filter out invalid values for other parameters
                if wind_direction is not None and wind_direction <= -999:
                    wind_direction = None
                if temperature is not None and temperature <= -999:
                    temperature = None
                if humidity is not None and (humidity <= -999 or humidity < 0 or humidity > 100):
                    humidity = None
                if pressure is not None and pressure <= -999:
                    pressure = None

                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lon, lat]
                    },
                    'properties': {
                        'speed': round(wind_speed, 1) if wind_speed is not None else None,
                        'direction': round(wind_direction, 0) if wind_direction is not None else None,
                        'temperature': round(temperature, 1) if temperature is not None else None,
                        'humidity': round(humidity, 1) if humidity is not None else None,
                        'pressure': round(pressure, 1) if pressure is not None else None,
                        'date': point.get('date', 'Recent'),
                        'source': 'NASA POWER',
                        'unit_wind': 'm/s',
                        'unit_temp': '°C',
                        'unit_humidity': '%',
                        'unit_pressure': 'kPa'
                    }
                })

        # Zero-Fake-Data Invariant: If no data from API, return empty collection cleanly
        source = 'NASA POWER' if features else 'None'
        print(f"[OK] Loaded {len(features)} wind climate points from {source}")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': source,
            'description': 'Wind speed, direction, temperature, humidity',
            'url': 'https://power.larc.nasa.gov/'
        }

    except asyncio.TimeoutError:
        print("[ERROR] NASA POWER API timeout")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'source': 'None',
            'description': 'Wind speed, direction, temperature, humidity'
        }
    except Exception as e:
        print(f"[ERROR] Error fetching NASA POWER wind data: {e}")
        return {
            'type': 'FeatureCollection',
            'features': [],
            'count': 0,
            'source': 'None',
            'error': str(e)
        }
