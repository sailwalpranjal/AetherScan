"""AQI calculation routes - AQICN Primary, OpenAQ Fallback"""
from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Optional
from layers.dynamic_aqi import calculate_aqi_at_point
from core.aqi_calculator import aqi_calculator
from data_sources.aqicn_service import get_aqicn_service

router = APIRouter(prefix="/aqi", tags=["aqi"])

@router.get("/calculate")
async def calculate_aqi(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    source: str = Query("auto", description="Data source: 'aqicn', 'openaq', or 'auto'")
) -> Dict:
    """
    Calculate AQI at a specific point

    Priority:
    1. AQICN API (if available)
    2. OpenAQ + CPCB calculation (fallback)

    Args:
        lat: Latitude
        lon: Longitude
        source: Preferred data source ('aqicn', 'openaq', 'auto')

    Returns:
        AQI result with category, color, pollutants, and forecast
    """
    aqicn = get_aqicn_service()

    # Try AQICN first if available and not explicitly disabled
    if source in ['auto', 'aqicn'] and aqicn:
        try:
            raw_data = await aqicn.get_aqi_by_coordinates(lat, lon)
            result = aqicn.parse_aqicn_response(raw_data)

            # Add health recommendations
            health = aqicn.get_health_recommendation(result['aqi'], result['category'])
            result['health_recommendation'] = health

            return result
        except Exception as e:
            print(f"AQICN API failed: {e}")
            if source == 'aqicn':
                # User explicitly requested AQICN, don't fallback
                raise HTTPException(status_code=500, detail=f"AQICN API error: {str(e)}")
            # Otherwise, fall through to OpenAQ fallback

    # Fallback to OpenAQ + CPCB calculation
    try:
        result = await calculate_aqi_at_point(lat, lon)
        result['data_source'] = 'openaq+cpcb'
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude")
) -> Dict:
    """
    Get 7-day AQI forecast for a location (AQICN only)

    Args:
        lat: Latitude
        lon: Longitude

    Returns:
        7-day forecast with PM2.5, PM10, O3, and UVI predictions
    """
    aqicn = get_aqicn_service()

    if not aqicn:
        raise HTTPException(
            status_code=503,
            detail="Forecast feature requires AQICN API (not available)"
        )

    try:
        raw_data = await aqicn.get_aqi_by_coordinates(lat, lon)
        forecast_data = raw_data.get('forecast', {})

        if not forecast_data:
            raise HTTPException(
                status_code=404,
                detail="No forecast data available for this location"
            )

        # Parse and structure forecast
        daily = forecast_data.get('daily', {})

        return {
            'latitude': lat,
            'longitude': lon,
            'forecast': {
                'pm25': daily.get('pm25', []),
                'pm10': daily.get('pm10', []),
                'o3': daily.get('o3', []),
                'uvi': daily.get('uvi', [])
            },
            'generated_at': raw_data.get('time', {}).get('iso', ''),
            'source': 'aqicn'
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Forecast fetch failed: {str(e)}")

@router.get("/stations/search")
async def search_stations(
    keyword: Optional[str] = Query(None, min_length=2, description="Search keyword"),
    query: Optional[str] = Query(None, min_length=2, description="Alias for keyword"),
    limit: int = Query(10, ge=1, le=50, description="Max results")
) -> Dict:
    """
    Search for air quality monitoring stations

    Args:
        keyword: Search term (city name, station name, etc.)
        limit: Maximum number of results

    Returns:
        List of matching stations
    """
    aqicn = get_aqicn_service()
    search_term = (keyword or query or "").strip()

    if len(search_term) < 2:
        raise HTTPException(status_code=422, detail="Search keyword must be at least 2 characters long")

    if not aqicn:
        raise HTTPException(
            status_code=503,
            detail="Station search requires AQICN API"
        )

    try:
        stations = await aqicn.search_stations(search_term)
        return {
            'query': search_term,
            'count': len(stations[:limit]),
            'stations': stations[:limit]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Station search failed: {str(e)}")

@router.get("/stations/nearby")
async def get_nearby_stations(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
    radius_km: float = Query(50, ge=1, le=500, description="Search radius in km")
) -> Dict:
    """
    Get nearby air quality monitoring stations

    Args:
        lat: Latitude
        lon: Longitude
        radius_km: Search radius in kilometers

    Returns:
        List of nearby stations
    """
    aqicn = get_aqicn_service()

    if not aqicn:
        raise HTTPException(
            status_code=503,
            detail="Nearby stations feature requires AQICN API"
        )

    try:
        stations = await aqicn.get_multiple_stations(lat, lon, radius_km)
        return {
            'latitude': lat,
            'longitude': lon,
            'radius_km': radius_km,
            'count': len(stations),
            'stations': stations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get nearby stations: {str(e)}")

@router.get("/stations/{station_id}")
async def get_station_data(
    station_id: int = Path(..., description="Station ID")
) -> Dict:
    """
    Get detailed data for a specific station

    Args:
        station_id: AQICN station ID

    Returns:
        Complete station data including current AQI and forecast
    """
    aqicn = get_aqicn_service()

    if not aqicn:
        raise HTTPException(
            status_code=503,
            detail="Station data requires AQICN API"
        )

    try:
        raw_data = await aqicn.get_aqi_by_station_id(station_id)
        result = aqicn.parse_aqicn_response(raw_data)

        # Add health recommendations
        health = aqicn.get_health_recommendation(result['aqi'], result['category'])
        result['health_recommendation'] = health

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get station data: {str(e)}")

@router.post("/calculate-from-values")
async def calculate_aqi_from_values(pollutants: Dict[str, float]) -> Dict:
    """
    Calculate AQI from provided pollutant values using CPCB formula

    Args:
        pollutants: Dict with pollutant names and values
                   (pm25, pm10, no2, so2, co, o3)

    Returns:
        AQI result
    """
    try:
        result = aqi_calculator.calculate_aqi(pollutants)
        result['data_source'] = 'cpcb_calculation'
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_aqi_categories():
    """Get AQI category definitions (US EPA standard used by AQICN)"""
    return {
        'categories': [
            {
                'range': [0, 50],
                'name': 'Good',
                'color': '#00E400',
                'description': 'Air quality is satisfactory',
                'health_implications': 'Air quality poses little or no risk',
                'cautionary_statement': 'None'
            },
            {
                'range': [51, 100],
                'name': 'Moderate',
                'color': '#FFFF00',
                'description': 'Air quality is acceptable',
                'health_implications': 'Moderate health concern for sensitive people',
                'cautionary_statement': 'Unusually sensitive people should limit prolonged outdoor exertion'
            },
            {
                'range': [101, 150],
                'name': 'Unhealthy for Sensitive Groups',
                'color': '#FF7E00',
                'description': 'Sensitive groups may experience health effects',
                'health_implications': 'Members of sensitive groups may experience health effects',
                'cautionary_statement': 'Active children and adults, people with respiratory disease should limit prolonged outdoor exertion'
            },
            {
                'range': [151, 200],
                'name': 'Unhealthy',
                'color': '#FF0000',
                'description': 'Everyone may experience health effects',
                'health_implications': 'Increased likelihood of health effects for everyone',
                'cautionary_statement': 'Active children and adults, people with respiratory disease should avoid prolonged outdoor exertion; everyone else should limit prolonged outdoor exertion'
            },
            {
                'range': [201, 300],
                'name': 'Very Unhealthy',
                'color': '#8F3F97',
                'description': 'Health alert - serious health effects',
                'health_implications': 'Health warnings of emergency conditions',
                'cautionary_statement': 'Active children and adults, people with respiratory disease should avoid all outdoor exertion; everyone else should limit outdoor exertion'
            },
            {
                'range': [301, 500],
                'name': 'Hazardous',
                'color': '#7E0023',
                'description': 'Health warning - everyone affected',
                'health_implications': 'Everyone may experience serious health effects',
                'cautionary_statement': 'Everyone should avoid all outdoor exertion'
            }
        ],
        'standard': 'US EPA AQI (Used by AQICN)',
        'note': 'Different from Indian CPCB categories'
    }

@router.get("/breakpoints")
async def get_aqi_breakpoints():
    """Get CPCB AQI breakpoint tables (for fallback calculations)"""
    return {
        'breakpoints': aqi_calculator.BREAKPOINTS,
        'source': 'CPCB (Central Pollution Control Board)',
        'standard': 'Indian National AQI',
        'note': 'Used for fallback calculations when AQICN unavailable'
    }

@router.get("/health")
async def get_health_info(
    aqi: int = Query(..., ge=0, le=500, description="AQI value")
) -> Dict:
    """
    Get health recommendations for a given AQI value

    Args:
        aqi: AQI value (0-500)

    Returns:
        Health recommendations and activity guidance
    """
    aqicn = get_aqicn_service()

    if aqicn:
        # Get category first
        from data_sources.aqicn_service import AQICNService
        category, _ = AQICNService._get_us_epa_category(None, aqi)
        health = aqicn.get_health_recommendation(aqi, category)
        return {
            'aqi': aqi,
            'category': category,
            **health
        }
    else:
        # Fallback to basic recommendations
        category, color = aqi_calculator.get_category_and_color(aqi)
        return {
            'aqi': aqi,
            'category': category,
            'color': color,
            'general': f'AQI is {aqi} ({category})',
            'source': 'cpcb_fallback'
        }
