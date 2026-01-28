"""
OpenWeather API Data Loader
Fetches real-time weather and wind data from OpenWeatherMap
API Key: Developer plan with 3,000 calls/minute
"""
import httpx
from typing import List, Dict, Optional
from datetime import datetime
from config.settings import settings

class OpenWeatherLoader:
    """Load weather and wind data from OpenWeather API"""

    def __init__(self):
        self.base_url = settings.OPENWEATHER_API_URL
        self.api_key = settings.OPENWEATHER_API_KEY
        self.session: Optional[httpx.AsyncClient] = None
        # Cache for weather data
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = 1800  # 30 minutes (weather changes slowly)

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session"""
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=30.0)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
            self.session = None

    async def fetch_current_weather(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetch current weather for a specific location
            lat: Latitude
            lon: Longitude

        Returns:
            Weather data dictionary
        """
        cache_key = f"weather_{lat:.2f}_{lon:.2f}"

        # Check cache
        if cache_key in self._cache:
            cache_entry = self._cache[cache_key]
            cache_age = (datetime.utcnow() - cache_entry['timestamp']).total_seconds()
            if cache_age < self._cache_ttl:
                return cache_entry['data']

        session = await self._get_session()

        try:
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'metric'
            }

            response = await session.get(f"{self.base_url}/weather", params=params)
            response.raise_for_status()
            data = response.json()

            # Cache the result
            self._cache[cache_key] = {
                'data': data,
                'timestamp': datetime.utcnow()
            }

            return data

        except Exception as e:
            print(f"Error fetching weather for ({lat}, {lon}): {e}")
            return None

    async def fetch_wind_grid(self, bounds: Dict, resolution: float = 1.0) -> List[Dict]:
        """
        Fetch wind data for a grid of points
            bounds: Dictionary with min_lat, max_lat, min_lon, max_lon
            resolution: Grid resolution in degrees

        Returns:
            List of wind data points
        """
        import numpy as np

        min_lat = bounds.get('min_lat', 6.0)
        max_lat = bounds.get('max_lat', 37.0)
        min_lon = bounds.get('min_lon', 68.0)
        max_lon = bounds.get('max_lon', 98.0)

        # Create grid of points
        lats = np.arange(min_lat, max_lat, resolution)
        lons = np.arange(min_lon, max_lon, resolution)

        wind_data = []

        # Use every 2nd or 3rd point
        sample_rate = 3

        for i, lat in enumerate(lats):
            if i % sample_rate != 0:
                continue
            for j, lon in enumerate(lons):
                if j % sample_rate != 0:
                    continue

                weather = await self.fetch_current_weather(lat, lon)

                if weather and 'wind' in weather:
                    wind = weather['wind']
                    wind_data.append({
                        'latitude': lat,
                        'longitude': lon,
                        'speed': wind.get('speed', 0),  # m/s
                        'direction': wind.get('deg', 0),  # degrees
                        'gust': wind.get('gust', 0),
                        'temperature': weather.get('main', {}).get('temp', 0),
                        'pressure': weather.get('main', {}).get('pressure', 0),
                        'humidity': weather.get('main', {}).get('humidity', 0),
                        'timestamp': datetime.utcnow().isoformat()
                    })

        return wind_data

    async def fetch_air_pollution(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetch air pollution data from OpenWeather

        Args:
            lat: Latitude
            lon: Longitude

        Returns:
            Air pollution data
        """
        session = await self._get_session()

        try:
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key
            }

            response = await session.get(
                "http://api.openweathermap.org/data/2.5/air_pollution",
                params=params
            )
            response.raise_for_status()
            data = response.json()

            return data

        except Exception as e:
            print(f"Error fetching air pollution for ({lat}, {lon}): {e}")
            return None

openweather_loader = OpenWeatherLoader()
