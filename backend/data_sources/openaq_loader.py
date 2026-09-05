"""
OpenAQ Data Loader
Fetches air quality data from OpenAQ API (v3)
API KEY REQUIRED - Get free key from https://openaq.org/
Falls back to sample data if API is unavailable or key not configured
"""
import httpx
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from config.settings import settings
from db.database import db_manager

class OpenAQLoader:
    """Load air quality data from OpenAQ API v3 with fallback"""

    def __init__(self):
        # Updated to v3 API
        self.base_url = "https://api.openaq.org/v3"
        self.session: Optional[httpx.AsyncClient] = None
        # Add cache for measurements with TTL
        self._cache: Dict[str, Dict] = {}
        self._cache_ttl = 300  # 5 minutes in seconds

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session with API key headers"""
        if self.session is None:
            headers = {}
            # OpenAQ v3 requires API key in X-API-Key header
            if settings.OPENAQ_API_KEY:
                headers['X-API-Key'] = settings.OPENAQ_API_KEY
                print("[OK] Using OpenAQ API key for authentication")
            else:
                print("[WARN]  No OpenAQ API key configured - will use fallback data")
                print("   Get FREE key from: https://openaq.org/")
            self.session = httpx.AsyncClient(timeout=30.0, headers=headers)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
            self.session = None

    async def fetch_stations(
        self,
        country: str = 'IN',
        limit: int = 1000,
        radius: Optional[int] = None,
        coordinates: Optional[tuple] = None
    ) -> List[Dict]:
        """
        Fetch air quality monitoring stations
            country: Country code (default: 'IN' for India)
            limit: Maximum number of stations to fetch
            radius: Search radius in meters (if coordinates provided)
            coordinates: (latitude, longitude) tuple for radius search

        Returns:
            List of station dictionaries
        """
        session = await self._get_session()
        stations = []
        page = 1

        while len(stations) < limit:
            params = {
                'limit': min(100, limit - len(stations)),
                'page': page,
                'country': country,
                'order_by': 'lastUpdated',
                'sort': 'desc'
            }

            if coordinates and radius:
                params['coordinates'] = f"{coordinates[0]},{coordinates[1]}"
                params['radius'] = radius

            try:
                response = await session.get(f"{self.base_url}/locations", params=params)
                response.raise_for_status()
                data = response.json()

                results = data.get('results', [])
                if not results:
                    break

                for station in results:
                    stations.append({
                        'station_id': str(station.get('id', '')),
                        'name': station.get('name', ''),
                        'latitude': station.get('coordinates', {}).get('latitude'),
                        'longitude': station.get('coordinates', {}).get('longitude'),
                        'city': station.get('city', ''),
                        'country': station.get('country', ''),
                        'last_updated': station.get('lastUpdated', ''),
                        'parameters': [p.get('parameter') for p in station.get('parameters', [])]
                    })

                page += 1

                if len(results) < 100:
                    break

            except Exception as e:
                # Suppress verbose errors for cleaner logs
                if "401" not in str(e):
                    print(f"[WARN]  Unable to fetch stations (check API key configuration)")
                break

            await asyncio.sleep(0.1)

        return stations

    async def fetch_measurements(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        country: str = 'IN',
        parameter: Optional[str] = None,
        limit: int = 10000
    ) -> List[Dict]:
        """
        Fetch air quality measurements
            date_from: Start date (ISO format)
            date_to: End date (ISO format)
            country: Country code
            parameter: Specific parameter (pm25, pm10, no2, etc.)
            limit: Maximum number of measurements

        Returns:
            List of measurement dictionaries
        """
        session = await self._get_session()

        if date_from is None:
            date_from = (datetime.utcnow() - timedelta(days=7)).isoformat()
        if date_to is None:
            date_to = datetime.utcnow().isoformat()

        measurements = []
        page = 1

        while len(measurements) < limit:
            params = {
                'limit': min(1000, limit - len(measurements)),
                'page': page,
                'country': country,
                'date_from': date_from,
                'date_to': date_to,
                'order_by': 'datetime',
                'sort': 'desc'
            }

            if parameter:
                params['parameter'] = parameter

            try:
                response = await session.get(f"{self.base_url}/measurements", params=params)
                response.raise_for_status()
                data = response.json()

                results = data.get('results', [])
                if not results:
                    break

                for measure in results:
                    measurements.append({
                        'station_id': str(measure.get('locationId', '')),
                        'parameter': measure.get('parameter', ''),
                        'value': measure.get('value', 0),
                        'unit': measure.get('unit', ''),
                        'timestamp': measure.get('date', {}).get('utc', ''),
                        'latitude': measure.get('coordinates', {}).get('latitude'),
                        'longitude': measure.get('coordinates', {}).get('longitude'),
                        'city': measure.get('city', ''),
                        'location': measure.get('location', '')
                    })

                page += 1

                if len(results) < 1000:
                    break

            except Exception as e:
                # Suppress verbose errors for cleaner logs
                break

            await asyncio.sleep(0.1)

        return measurements

    async def fetch_latest_measurements(self, country: str = 'IN') -> List[Dict]:
        """
        Fetch latest measurements from all stations (v3 API with fallback)
        Uses caching to ensure consistent results for AQI calculations

        Returns:
            List of latest measurements with station info
        """
        cache_key = f"latest_{country}"

        # Check cache first
        if cache_key in self._cache:
            cache_entry = self._cache[cache_key]
            cache_age = (datetime.utcnow() - cache_entry['timestamp']).total_seconds()

            if cache_age < self._cache_ttl:
                print(f"Using cached measurements (age: {cache_age:.1f}s)")
                return cache_entry['data']

        if not settings.OPENAQ_API_KEY:
            print("[INFO] OpenAQ API key missing - using deterministic sample fallback data")
            measurements = self._get_sample_measurements()
            self._cache[cache_key] = {
                'data': measurements,
                'timestamp': datetime.utcnow()
            }
            return measurements

        session = await self._get_session()
        measurements = []

        try:
            # v3 API - Fetch latest for key parameters
            # Parameter IDs: 2=PM2.5, 1=PM10, 3=NO2, 8=SO2, 7=O3, 5=CO
            parameter_ids = {
                '2': 'pm25',
                '1': 'pm10',
                '3': 'no2',
                '8': 'so2',
                '7': 'o3',
                '5': 'co'
            }

            for param_id, param_name in parameter_ids.items():
                try:
                    # Fetch latest values for this parameter across all locations in India
                    params = {
                        'limit': 1000,
                        'countries_id': 102  # India's country ID in OpenAQ
                    }

                    response = await session.get(f"{self.base_url}/parameters/{param_id}/latest", params=params)

                    if response.status_code == 200:
                        data = response.json()
                        results = data.get('results', [])

                        print(f"[OK] OpenAQ: Fetched {len(results)} {param_name.upper()} measurements")

                        added_count = 0
                        for item in results:
                            # Extract coordinates directly from item (v3 API structure)
                            coords = item.get('coordinates', {})
                            lat = coords.get('latitude')
                            lon = coords.get('longitude')

                            # Try alternative structure if coordinates not found
                            if not lat or not lon:
                                location = item.get('location', {})
                                coords = location.get('coordinates', {})
                                lat = coords.get('latitude')
                                lon = coords.get('longitude')

                            # Skip if still no coordinates
                            if not lat or not lon:
                                continue

                            # Extract location info
                            location = item.get('location', {})
                            location_id = location.get('id', '') if location else item.get('locationId', '')
                            location_name = location.get('name', '') if location else item.get('locationName', '')

                            measurements.append({
                                'station_id': str(location_id),
                                'location': location_name,
                                'city': location.get('locality', '') if location else '',
                                'country': 'IN',
                                'latitude': lat,
                                'longitude': lon,
                                'parameter': param_name,
                                'value': item.get('value', 0),
                                'unit': item.get('unit', ''),
                                'timestamp': item.get('datetime', '')
                            })
                            added_count += 1

                        if added_count > 0:
                            print(f"   Added {added_count} valid measurements with coordinates")
                        else:
                            print(f"   [WARN]  No measurements with valid coordinates")

                    await asyncio.sleep(0.2)  # Rate limiting

                except Exception as e:
                    print(f"[WARN]  Error fetching {param_name}: {str(e)}")
                    continue

            if measurements:
                # Sort measurements for consistent ordering
                measurements.sort(key=lambda x: (x['station_id'], x['parameter']))
                print(f"[OK] Total OpenAQ measurements: {len(measurements)}")
            else:
                print("[ERROR] No OpenAQ measurements retrieved - check API key and connection")

        except Exception as e:
            print(f"[ERROR] OpenAQ API error: {str(e)}")
            measurements = []

        if not measurements:
            print("[WARN]  No OpenAQ measurements available - falling back to deterministic sample data")
            measurements = self._get_sample_measurements()

        # Cache the results
        self._cache[cache_key] = {
            'data': measurements,
            'timestamp': datetime.utcnow()
        }

        return measurements

    def _get_sample_measurements(self) -> List[Dict]:
        """Fallback sample measurement data for major Indian cities (deterministic)"""
        import random

        # Use a fixed seed for consistent results
        random.seed(42)

        # Sample stations with realistic coordinates
        stations = [
            {'id': 's_delhi_1', 'name': 'Delhi - Connaught Place', 'lat': 28.6139, 'lon': 77.2090, 'city': 'Delhi'},
            {'id': 's_delhi_2', 'name': 'Delhi - Dwarka', 'lat': 28.5921, 'lon': 77.0460, 'city': 'Delhi'},
            {'id': 's_mumbai_1', 'name': 'Mumbai - Bandra', 'lat': 19.0596, 'lon': 72.8295, 'city': 'Mumbai'},
            {'id': 's_mumbai_2', 'name': 'Mumbai - Andheri', 'lat': 19.1136, 'lon': 72.8697, 'city': 'Mumbai'},
            {'id': 's_bangalore_1', 'name': 'Bengaluru - Whitefield', 'lat': 12.9698, 'lon': 77.7499, 'city': 'Bengaluru'},
            {'id': 's_bangalore_2', 'name': 'Bengaluru - Indiranagar', 'lat': 12.9716, 'lon': 77.6412, 'city': 'Bengaluru'},
            {'id': 's_chennai_1', 'name': 'Chennai - T Nagar', 'lat': 13.0418, 'lon': 80.2341, 'city': 'Chennai'},
            {'id': 's_kolkata_1', 'name': 'Kolkata - Park Street', 'lat': 22.5552, 'lon': 88.3515, 'city': 'Kolkata'},
            {'id': 's_hyderabad_1', 'name': 'Hyderabad - Banjara Hills', 'lat': 17.4126, 'lon': 78.4437, 'city': 'Hyderabad'},
            {'id': 's_pune_1', 'name': 'Pune - Kothrud', 'lat': 18.5074, 'lon': 73.8077, 'city': 'Pune'},
            {'id': 's_ahmedabad_1', 'name': 'Ahmedabad - Maninagar', 'lat': 23.0045, 'lon': 72.5974, 'city': 'Ahmedabad'},
            {'id': 's_jaipur_1', 'name': 'Jaipur - Pink City', 'lat': 26.9124, 'lon': 75.7873, 'city': 'Jaipur'},
        ]

        measurements = []
        params_config = {
            'pm25': (30, 150),
            'pm10': (50, 250),
            'no2': (20, 100),
            'so2': (10, 80),
            'o3': (40, 120),
            'co': (0.5, 5.0)
        }

        for station in stations:
            for param, (min_val, max_val) in params_config.items():
                value = random.uniform(min_val, max_val)
                measurements.append({
                    'station_id': station['id'],
                    'location': station['name'],
                    'city': station['city'],
                    'country': 'IN',
                    'latitude': station['lat'],
                    'longitude': station['lon'],
                    'parameter': param,
                    'value': round(value, 2),
                    'unit': 'µg/m³' if param != 'co' else 'mg/m³',
                    'timestamp': datetime.utcnow().isoformat()
                })

        # Reset random seed to avoid affecting other code
        random.seed()

        return measurements

    async def save_to_database(self, measurements: List[Dict]):
        """Save measurements to database"""
        for measure in measurements:
            try:
                await db_manager.execute(
                    """
                    INSERT OR IGNORE INTO openaq_stations
                    (station_id, name, latitude, longitude, city, country, last_updated, parameters)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        measure['station_id'],
                        measure.get('location', ''),
                        measure.get('latitude'),
                        measure.get('longitude'),
                        measure.get('city', ''),
                        measure.get('country', ''),
                        measure.get('timestamp', ''),
                        measure.get('parameter', '')
                    )
                )

                await db_manager.execute(
                    """
                    INSERT INTO openaq_measurements
                    (station_id, parameter, value, unit, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        measure['station_id'],
                        measure['parameter'],
                        measure['value'],
                        measure['unit'],
                        measure['timestamp']
                    )
                )
            except Exception as e:
                print(f"Error saving measurement: {e}")

openaq_loader = OpenAQLoader()
