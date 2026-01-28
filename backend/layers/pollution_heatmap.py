"""
National Pollution Heatmap Layer
Uses AQICN real-time data for pollution heatmap
"""
from typing import Dict, List, Optional, Tuple
from data_sources.aqicn_service import get_aqicn_service
from core.idw_interpolation import interpolate_sensor_data
from config.settings import settings
import asyncio

async def get_national_pollution_heatmap(
    bounds: Optional[Tuple[float, float, float, float]] = None,
    resolution: float = 0.5
) -> Dict:
    """
    Generate national pollution heatmap from AQICN sensor data

    Args:
        bounds: (min_lat, max_lat, min_lon, max_lon)
        resolution: Grid resolution in degrees

    Returns:
        Dict with heatmap data
    """
    try:
        # Use India bounds if not specified
        if not bounds:
            india_bounds = settings.INDIA_BOUNDS
            bounds = (
                india_bounds['min_lat'],
                india_bounds['max_lat'],
                india_bounds['min_lon'],
                india_bounds['max_lon']
            )

        # Fetch AQICN stations in bounding box
        min_lat, max_lat, min_lon, max_lon = bounds

        # Create grid of major cities/regions to query
        major_cities = [
            'delhi', 'mumbai', 'bangalore', 'chennai', 'kolkata',
            'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'lucknow',
            'kanpur', 'nagpur', 'indore', 'bhopal', 'chandigarh',
            'patna', 'surat', 'ludhiana', 'agra', 'nashik'
        ]

        sensor_data = []

        # Get AQICN service instance
        aqicn_service = get_aqicn_service()
        if not aqicn_service:
            print("[WARN] AQICN service not initialized, using fallback data")
            fallback_data = _get_fallback_pollution_data()
            return {
                'type': 'heatmap',
                'data': fallback_data,
                'source': 'fallback',
                'message': 'AQICN service not initialized',
                'sensor_count': len(fallback_data)
            }

        print(f"[INFO] Fetching pollution data for {len(major_cities[:15])} cities...")

        # Fetch data for major cities with rate limiting
        for city in major_cities[:15]:  # Limit to avoid timeout
            try:
                # Note: get_aqi_by_city_name returns the data directly (not wrapped in status)
                result = await aqicn_service.get_aqi_by_city_name(city)
                # result IS the data since _make_request returns data.get('data', {})
                if result and 'aqi' in result:
                    print(f"[OK] Got AQI {result['aqi']} for {city}")
                    city_info = result.get('city', {})
                    geo = city_info.get('geo', [])

                    if len(geo) == 2 and result['aqi'] != '-':
                        lat, lon = geo
                        # Filter by bounds
                        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
                            try:
                                aqi_value = int(result['aqi'])
                                # Estimate PM2.5 from AQI (rough conversion)
                                pm25 = aqi_to_pm25(aqi_value)

                                sensor_data.append({
                                    'latitude': lat,
                                    'longitude': lon,
                                    'value': pm25,
                                    'aqi': aqi_value,
                                    'city': city_info.get('name', city)
                                })
                            except (ValueError, TypeError):
                                continue

                await asyncio.sleep(0.1)  # Rate limiting
            except Exception as e:
                print(f"Error fetching {city}: {e}")
                continue

        # Always ensure we have data - use fallback if API returned nothing
        if not sensor_data or len(sensor_data) < 5:
            print("[INFO] Using fallback pollution heatmap data")
            sensor_data = _get_fallback_pollution_data()

        # Return sensor data directly - frontend expects: [{latitude, longitude, value}, ...]
        print(f"[OK] Returning {len(sensor_data)} pollution heatmap points")

        return {
            'type': 'heatmap',
            'data': sensor_data,
            'source': 'aqicn' if len(sensor_data) > 22 else 'fallback',
            'parameter': 'pm25',
            'unit': 'ug/m3',
            'sensor_count': len(sensor_data)
        }

    except Exception as e:
        print(f"Error generating pollution heatmap: {e}")
        # Return fallback data even on error
        fallback_data = _get_fallback_pollution_data()
        return {
            'type': 'heatmap',
            'data': fallback_data,
            'source': 'fallback',
            'error': str(e)
        }

def aqi_to_pm25(aqi: int) -> float:
    """
    Convert AQI value to estimated PM2.5 concentration
    Using EPA AQI breakpoints (rough approximation)
    """
    if aqi <= 50:
        return aqi * 12.0 / 50.0
    elif aqi <= 100:
        return 12.1 + (aqi - 51) * (35.4 - 12.1) / 49.0
    elif aqi <= 150:
        return 35.5 + (aqi - 101) * (55.4 - 35.5) / 49.0
    elif aqi <= 200:
        return 55.5 + (aqi - 151) * (150.4 - 55.5) / 49.0
    elif aqi <= 300:
        return 150.5 + (aqi - 201) * (250.4 - 150.5) / 99.0
    else:
        return 250.5 + (aqi - 301) * (500.4 - 250.5) / 199.0

def _get_fallback_pollution_data() -> List[Dict]:
    """Realistic fallback pollution data for major Indian cities"""
    import random
    random.seed(42)

    # Real AQI values vary by season - using realistic winter values
    cities_data = [
        {'city': 'Delhi', 'lat': 28.6139, 'lon': 77.2090, 'aqi_base': 180},
        {'city': 'Mumbai', 'lat': 19.0760, 'lon': 72.8777, 'aqi_base': 95},
        {'city': 'Bangalore', 'lat': 12.9716, 'lon': 77.5946, 'aqi_base': 75},
        {'city': 'Chennai', 'lat': 13.0827, 'lon': 80.2707, 'aqi_base': 85},
        {'city': 'Kolkata', 'lat': 22.5726, 'lon': 88.3639, 'aqi_base': 140},
        {'city': 'Hyderabad', 'lat': 17.3850, 'lon': 78.4867, 'aqi_base': 90},
        {'city': 'Pune', 'lat': 18.5204, 'lon': 73.8567, 'aqi_base': 80},
        {'city': 'Ahmedabad', 'lat': 23.0225, 'lon': 72.5714, 'aqi_base': 130},
        {'city': 'Jaipur', 'lat': 26.9124, 'lon': 75.7873, 'aqi_base': 150},
        {'city': 'Lucknow', 'lat': 26.8467, 'lon': 80.9462, 'aqi_base': 165},
        {'city': 'Kanpur', 'lat': 26.4499, 'lon': 80.3319, 'aqi_base': 175},
        {'city': 'Nagpur', 'lat': 21.1458, 'lon': 79.0882, 'aqi_base': 100},
        {'city': 'Indore', 'lat': 22.7196, 'lon': 75.8577, 'aqi_base': 110},
        {'city': 'Bhopal', 'lat': 23.2599, 'lon': 77.4126, 'aqi_base': 120},
        {'city': 'Chandigarh', 'lat': 30.7333, 'lon': 76.7794, 'aqi_base': 125},
        {'city': 'Patna', 'lat': 25.5941, 'lon': 85.1376, 'aqi_base': 155},
        {'city': 'Surat', 'lat': 21.1702, 'lon': 72.8311, 'aqi_base': 105},
        {'city': 'Ludhiana', 'lat': 30.9010, 'lon': 75.8573, 'aqi_base': 160},
        {'city': 'Agra', 'lat': 27.1767, 'lon': 78.0081, 'aqi_base': 170},
        {'city': 'Nashik', 'lat': 19.9975, 'lon': 73.7898, 'aqi_base': 90},
        {'city': 'Guwahati', 'lat': 26.1445, 'lon': 91.7362, 'aqi_base': 95},
        {'city': 'Varanasi', 'lat': 25.3176, 'lon': 82.9739, 'aqi_base': 160},
    ]

    sensor_data = []
    for city in cities_data:
        aqi = city['aqi_base'] + random.randint(-20, 30)
        pm25 = aqi_to_pm25(aqi)
        sensor_data.append({
            'latitude': city['lat'],
            'longitude': city['lon'],
            'value': pm25,
            'aqi': aqi,
            'city': city['city']
        })

    return sensor_data


async def get_bhuvan_aod_layer() -> Dict:
    """Get ISRO Bhuvan AOD WMS layer information"""
    from data_sources.bhuvan_loader import bhuvan_loader
    wms_url = bhuvan_loader.get_wms_url('aod')

    return {
        'type': 'wms',
        'url': wms_url,
        'layer_name': 'aod',
        'title': 'Aerosol Optical Depth',
        'source': 'ISRO Bhuvan',
        'attribution': 'ISRO NRSC'
    }
