"""
Documentation: https://aqicn.org/json-api/doc/
"""
import httpx
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import asyncio
from functools import lru_cache

class AQICNService:
    """Service for interacting with AQICN API"""
    BASE_URL = "https://api.waqi.info"

    def __init__(self, api_token: str):
        """
        Initialize AQICN service
            api_token: AQICN API token
        """
        self.api_token = api_token
        self.client = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client"""
        if self.client is None:
            self.client = httpx.AsyncClient(timeout=15.0)
        return self.client

    async def close(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()
            self.client = None

    async def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        Make API request to AQICN
            endpoint: API endpoint (e.g., '/feed/geo:lat;lon/')
            params: Additional query parameters

        Returns:
            API response data
        """
        client = await self._get_client()

        # Add token to params
        request_params = {'token': self.api_token}
        if params:
            request_params.update(params)

        url = f"{self.BASE_URL}{endpoint}"

        try:
            response = await client.get(url, params=request_params)
            response.raise_for_status()

            data = response.json()

            if data.get('status') != 'ok':
                raise Exception(f"AQICN API error: {data.get('data', 'Unknown error')}")

            return data.get('data', {})

        except httpx.HTTPError as e:
            raise Exception(f"HTTP error accessing AQICN: {str(e)}")
        except Exception as e:
            raise Exception(f"Error calling AQICN API: {str(e)}")

    async def get_aqi_by_coordinates(self, lat: float, lon: float) -> Dict:
        """
        Get AQI data for specific coordinates (geolocation query)
            lat: Latitude
            lon: Longitude
        Returns:
            Complete AQI data including:
            - aqi: Overall AQI value
            - idx: Station ID
            - city: City information
            - iaqi: Individual pollutant data
            - forecast: 7-day forecast
            - time: Measurement time
        """
        endpoint = f"/feed/geo:{lat};{lon}/"
        return await self._make_request(endpoint)

    async def get_aqi_by_station_id(self, station_id: int) -> Dict:
        """
        Get AQI data for specific station
            station_id: AQICN station ID
        Returns:
            Station AQI data
        """
        endpoint = f"/feed/@{station_id}/"
        return await self._make_request(endpoint)

    async def get_aqi_by_city_name(self, city_name: str) -> Dict:
        """
        Get AQI data by city name
            city_name: City name (e.g., 'delhi', 'mumbai', 'beijing')
        Returns:
            City AQI data
        """
        endpoint = f"/feed/{city_name}/"
        return await self._make_request(endpoint)

    async def search_stations(self, keyword: str) -> List[Dict]:
        """
        Search for stations by keyword
            keyword: Search keyword

        Returns:
            List of matching stations
        """
        endpoint = "/search/"
        data = await self._make_request(endpoint, {'keyword': keyword})
        return data if isinstance(data, list) else []

    async def get_stations_in_bounds(self,
                                     lat_min: float,
                                     lng_min: float,
                                     lat_max: float,
                                     lng_max: float) -> List[Dict]:
        """
        Get all stations within map bounds
            lat_min: Minimum latitude
            lng_min: Minimum longitude
            lat_max: Maximum latitude
            lng_max: Maximum longitude

        Returns:
            List of stations in bounds
        """
        endpoint = "/v2/map/bounds/"
        params = {
            'latlng': f"{lat_min},{lng_min},{lat_max},{lng_max}"
        }
        data = await self._make_request(endpoint, params)
        return data if isinstance(data, list) else []

    def parse_aqicn_response(self, raw_data: Dict) -> Dict:
        """
        Parse AQICN API response into standardized format
            raw_data: Raw AQICN API response
        Returns:
            Standardized AQI result matching our schema
        """
        # Extract info
        aqi = raw_data.get('aqi', 0)

        # Map AQICN AQI to our categories (US EPA standard used by AQICN)
        category, color = self._get_us_epa_category(aqi)

        # Extract city info
        city_data = raw_data.get('city', {})
        city_name = city_data.get('name', '')
        city_geo = city_data.get('geo', [])
        city_url = city_data.get('url', '')

        # Extract pollutant data (iaqi)
        iaqi = raw_data.get('iaqi', {})
        pollutants = self._extract_pollutants(iaqi)

        # Extract dominant pollutant
        dominant_pollutant = raw_data.get('dominentpol', 'pm25')

        # Extract forecast
        forecast_data = raw_data.get('forecast', {})
        forecast = self._parse_forecast(forecast_data)

        # Extract time
        time_data = raw_data.get('time', {})
        measurement_time = time_data.get('iso', '')

        # Extract attributions
        attributions = raw_data.get('attributions', [])

        # Extract station ID
        station_id = raw_data.get('idx', 0)

        # Weather data (if available)
        weather = self._extract_weather(iaqi)

        return {
            'aqi': int(aqi) if aqi else 0,
            'category': category,
            'color': color,
            'dominant_pollutant': dominant_pollutant,
            'station_id': station_id,
            'location': city_name,
            'city': city_name,
            'latitude': city_geo[0] if len(city_geo) > 0 else None,
            'longitude': city_geo[1] if len(city_geo) > 1 else None,
            'pollutants': pollutants,
            'forecast': forecast,
            'measurement_time': measurement_time,
            'city_url': city_url,
            'attributions': attributions,
            'weather': weather,
            'data_source': 'aqicn'
        }

    def _get_us_epa_category(self, aqi: int) -> Tuple[str, str]:
        """
        Get AQI category and color based on US EPA standard (used by AQICN)
            aqi: AQI value
        Returns:
            Tuple of (category_name, color_hex)
        """
        if aqi <= 50:
            return 'Good', '#00E400'
        elif aqi <= 100:
            return 'Moderate', '#FFFF00'
        elif aqi <= 150:
            return 'Unhealthy for Sensitive Groups', '#FF7E00'
        elif aqi <= 200:
            return 'Unhealthy', '#FF0000'
        elif aqi <= 300:
            return 'Very Unhealthy', '#8F3F97'
        else:
            return 'Hazardous', '#7E0023'

    def _extract_pollutants(self, iaqi: Dict) -> Dict[str, float]:
        """
        Extract pollutant values from iaqi object
            iaqi: Individual AQI data from AQICN
        Returns:
            Dict with pollutant values
        """
        pollutants = {}

        # Map AQICN pollutant keys to our keys
        pollutant_map = {
            'pm25': 'pm25',
            'pm10': 'pm10',
            'no2': 'no2',
            'so2': 'so2',
            'co': 'co',
            'o3': 'o3'
        }

        for aqicn_key, our_key in pollutant_map.items():
            if aqicn_key in iaqi:
                value = iaqi[aqicn_key].get('v', 0)
                if value:
                    pollutants[our_key] = float(value)

        return pollutants

    def _extract_weather(self, iaqi: Dict) -> Dict:
        """
        Extract weather data from iaqi
            iaqi: Individual AQI data from AQICN

        Returns:
            Weather information
        """
        weather = {}

        # Temperature
        if 't' in iaqi:
            weather['temperature'] = iaqi['t'].get('v', 0)

        # Humidity
        if 'h' in iaqi:
            weather['humidity'] = iaqi['h'].get('v', 0)

        # Pressure
        if 'p' in iaqi:
            weather['pressure'] = iaqi['p'].get('v', 0)

        # Wind
        if 'w' in iaqi:
            weather['wind_speed'] = iaqi['w'].get('v', 0)

        # Dew point
        if 'd' in iaqi:
            weather['dew_point'] = iaqi['d'].get('v', 0)

        return weather

    def _parse_forecast(self, forecast_data: Dict) -> Dict:
        """
        Parse forecast data from AQICN response
            forecast_data: Forecast object from AQICN

        Returns:
            Structured forecast data
        """
        if not forecast_data:
            return {}

        daily = forecast_data.get('daily', {})

        forecast = {
            'pm25': daily.get('pm25', []),
            'pm10': daily.get('pm10', []),
            'o3': daily.get('o3', []),
            'uvi': daily.get('uvi', [])  # UV index
        }

        return forecast

    async def get_multiple_stations(self, lat: float, lon: float, radius_km: float = 50) -> List[Dict]:
        """
        Get multiple stations near coordinates
            lat: Center latitude
            lon: Center longitude
            radius_km: Search radius in kilometers

        Returns:
            List of nearby stations with AQI data
        """
        # Calculate approximate bounds (1 degree ≈ 111km)
        lat_offset = radius_km / 111.0
        lon_offset = radius_km / (111.0 * abs(lat) / 90.0) if lat != 0 else radius_km / 111.0

        lat_min = lat - lat_offset
        lat_max = lat + lat_offset
        lng_min = lon - lon_offset
        lng_max = lon + lon_offset

        try:
            stations = await self.get_stations_in_bounds(lat_min, lng_min, lat_max, lng_max)
            return stations
        except Exception as e:
            print(f"Error fetching nearby stations: {e}")
            return []

    def get_health_recommendation(self, aqi: int, category: str) -> Dict:
        """
        Get health recommendations based on AQI (US EPA standard)
            aqi: AQI value
            category: AQI category

        Returns:
            Health recommendation with advice for different groups
        """
        if aqi <= 50:
            return {
                'general': 'Air quality is satisfactory, and air pollution poses little or no risk.',
                'sensitive': 'None',
                'activity_level': 'Normal outdoor activities',
                'icon': '😊',
                'level': 'good'
            }
        elif aqi <= 100:
            return {
                'general': 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
                'sensitive': 'Unusually sensitive people should consider limiting prolonged outdoor exertion.',
                'activity_level': 'Normal activities, but sensitive individuals should watch for symptoms',
                'icon': '🙂',
                'level': 'moderate'
            }
        elif aqi <= 150:
            return {
                'general': 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
                'sensitive': 'People with respiratory or heart disease, the elderly and children should limit prolonged outdoor exertion.',
                'activity_level': 'Reduce prolonged or heavy exertion',
                'icon': '😷',
                'level': 'unhealthy_sensitive'
            }
        elif aqi <= 200:
            return {
                'general': 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
                'sensitive': 'People with respiratory or heart disease, the elderly and children should avoid prolonged outdoor exertion. Everyone else should limit prolonged outdoor exertion.',
                'activity_level': 'Avoid prolonged or heavy outdoor exertion',
                'icon': '😨',
                'level': 'unhealthy'
            }
        elif aqi <= 300:
            return {
                'general': 'Health alert: The risk of health effects is increased for everyone.',
                'sensitive': 'People with respiratory or heart disease, the elderly and children should avoid all outdoor exertion. Everyone else should limit outdoor exertion.',
                'activity_level': 'Move activities indoors or reschedule',
                'icon': '😰',
                'level': 'very_unhealthy'
            }
        else:
            return {
                'general': 'Health warning of emergency conditions: everyone is more likely to be affected.',
                'sensitive': 'Everyone should avoid all outdoor exertion.',
                'activity_level': 'Remain indoors and keep activity levels low',
                'icon': '☠️',
                'level': 'hazardous'
            }


# Global AQICN service instance
aqicn_service: Optional[AQICNService] = None

def initialize_aqicn_service(api_token: str) -> AQICNService:
    """
    Initialize global AQICN service instance
        api_token: AQICN API token

    Returns:
        Initialized AQICN service
    """
    global aqicn_service
    aqicn_service = AQICNService(api_token)
    return aqicn_service

def get_aqicn_service() -> Optional[AQICNService]:
    """Get global AQICN service instance"""
    return aqicn_service
