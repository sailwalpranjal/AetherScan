"""
Wind Direction & Climate Layer - USES REAL NASA POWER DATA
"""
from typing import Dict, List
from data_sources.nasa_power_loader import nasa_power_loader
import asyncio
import random

def _get_fallback_wind_data() -> List[Dict]:
    """Realistic fallback wind and climate data for India"""
    random.seed(42)

    features = []

    # Create a grid across India with realistic wind patterns
    # India's monsoon patterns: SW winds during summer, NE during winter
    for lat in range(8, 36, 3):  # 6-37 N
        for lon in range(70, 95, 3):  # 68-98 E
            # Wind patterns vary by region and season
            # Using typical winter values

            # Coastal regions have higher wind speeds
            is_coastal = (
                (lon < 74 and 15 < lat < 22) or  # West coast
                (lon > 85 and 10 < lat < 23) or  # East coast
                (lat < 12)  # Southern tip
            )

            # Northern plains have different patterns
            is_northern_plain = (25 < lat < 32 and 75 < lon < 88)

            if is_coastal:
                wind_speed = random.uniform(3.5, 7.0)
                wind_direction = random.choice([225, 240, 255, 270])  # SW-W winds
            elif is_northern_plain:
                wind_speed = random.uniform(1.5, 4.0)
                wind_direction = random.choice([290, 300, 315, 330])  # NW winds (winter)
            else:
                wind_speed = random.uniform(2.0, 5.0)
                wind_direction = random.randint(180, 360)

            # Temperature varies by latitude and altitude
            base_temp = 30 - (lat - 10) * 0.6
            temp = base_temp + random.uniform(-3, 3)

            # Humidity varies by region
            if is_coastal:
                humidity = random.uniform(65, 85)
            else:
                humidity = random.uniform(40, 70)

            # Pressure (sea level equivalent)
            pressure = 101.3 + random.uniform(-1.5, 1.5)

            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [lon + random.uniform(-0.5, 0.5), lat + random.uniform(-0.5, 0.5)]
                },
                'properties': {
                    'speed': round(wind_speed, 1),
                    'direction': round(wind_direction, 0),
                    'temperature': round(temp, 1),
                    'humidity': round(humidity, 1),
                    'pressure': round(pressure, 1),
                    'date': 'Recent',
                    'source': 'Fallback (Seasonal Average)',
                    'unit_wind': 'm/s',
                    'unit_temp': '°C',
                    'unit_humidity': '%',
                    'unit_pressure': 'kPa'
                }
            })

    return features


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

        # If no data from API, use fallback
        if not features:
            print("[INFO] Using fallback wind climate data")
            features = _get_fallback_wind_data()

        print(f"[OK] Loaded {len(features)} wind climate points")

        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'NASA POWER' if features and features[0].get('properties', {}).get('source') != 'Fallback (Seasonal Average)' else 'Fallback Data',
            'description': 'Wind speed, direction, temperature, humidity',
            'url': 'https://power.larc.nasa.gov/'
        }

    except asyncio.TimeoutError:
        print("[ERROR] NASA POWER API timeout, using fallback")
        features = _get_fallback_wind_data()
        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'Fallback Data (API Timeout)',
            'description': 'Wind speed, direction, temperature, humidity'
        }
    except Exception as e:
        print(f"[ERROR] Error fetching NASA POWER wind data: {e}")
        features = _get_fallback_wind_data()
        return {
            'type': 'FeatureCollection',
            'features': features,
            'count': len(features),
            'source': 'Fallback Data',
            'error': str(e)
        }
