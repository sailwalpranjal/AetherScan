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
            return {
                'type': 'heatmap',
                'data': [],
                'source': 'None',
                'message': 'AQICN service not initialized',
                'sensor_count': 0
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

        # Zero-Fake-Data Invariant: If no data from API, return empty data cleanly
        source = 'aqicn' if sensor_data else 'None'
        print(f"[OK] Returning {len(sensor_data)} pollution heatmap points from {source}")

        return {
            'type': 'heatmap',
            'data': sensor_data,
            'source': source,
            'parameter': 'pm25',
            'unit': 'ug/m3',
            'sensor_count': len(sensor_data)
        }

    except Exception as e:
        print(f"Error generating pollution heatmap: {e}")
        return {
            'type': 'heatmap',
            'data': [],
            'source': 'None',
            'error': str(e),
            'sensor_count': 0
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
    """
    Deprecated fallback stub adhering to Zero-Fake-Data invariant.
    Returns an empty list instead of synthetic pollution points.
    """
    return []


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
