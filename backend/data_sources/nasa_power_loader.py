"""
NASA POWER (Prediction Of Worldwide Energy Resources) API Loader
Data available:
- Solar radiation
- Temperature (2m, surface)
- Wind speed and direction
- Humidity
- Pressure
- Precipitation
API Docs: https://power.larc.nasa.gov/docs/services/api/
"""
import httpx
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from config.settings import settings
import numpy as np

class NASAPOWERLoader:
    """Load meteorological data from NASA POWER API"""

    def __init__(self):
        self.base_url = "https://power.larc.nasa.gov/api/temporal/daily/point"
        self.session: Optional[httpx.AsyncClient] = None

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session"""
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=60.0)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
            self.session = None

    async def fetch_point_data(
        self,
        latitude: float,
        longitude: float,
        parameters: List[str],
        start_date: str,
        end_date: str,
        community: str = "RE"
    ) -> Dict:
        """
        Fetch data for a single point
            latitude: Latitude (-90 to 90)
            longitude: Longitude (-180 to 180)
            parameters: List of parameters (e.g., ['T2M', 'WS10M', 'RH2M'])
            start_date: Start date (YYYYMMDD)
            end_date: End date (YYYYMMDD)
            community: Community (RE=Renewable Energy, AG=Agroclimatology, SB=Sustainable Buildings)

        Available parameters:
            T2M - Temperature at 2 Meters (°C)
            T2M_MAX - Max Temperature at 2 Meters (°C)
            T2M_MIN - Min Temperature at 2 Meters (°C)
            WS10M - Wind Speed at 10 Meters (m/s)
            WS10M_MAX - Max Wind Speed at 10 Meters (m/s)
            WS10M_MIN - Min Wind Speed at 10 Meters (m/s)
            WD10M - Wind Direction at 10 Meters (Degrees)
            RH2M - Relative Humidity at 2 Meters (%)
            PS - Surface Pressure (kPa)
            PRECTOTCORR - Precipitation (mm/day)
            ALLSKY_SFC_SW_DWN - All Sky Surface Shortwave Downward Irradiance (kW-hr/m^2/day)

        Returns:
            Dict with parameter data
        """
        session = await self._get_session()

        params_str = ",".join(parameters)

        url = f"{self.base_url}?parameters={params_str}&community={community}&longitude={longitude}&latitude={latitude}&start={start_date}&end={end_date}&format=JSON"

        try:
            response = await session.get(url)
            response.raise_for_status()
            data = response.json()

            return data

        except httpx.HTTPStatusError as e:
            print(f"HTTP error fetching NASA POWER data: {e}")
            print(f"URL: {url}")
            return {}
        except Exception as e:
            print(f"Error fetching NASA POWER data: {e}")
            return {}

    async def fetch_grid_data(
        self,
        bounds: Dict,
        parameters: List[str],
        date: Optional[str] = None,
        grid_spacing: float = 1.0
    ) -> List[Dict]:
        """
        Fetch data for a grid of points
            bounds: Dict with min_lat, max_lat, min_lon, max_lon
            parameters: List of parameters to fetch
            date: Date (YYYYMMDD), defaults to yesterday
            grid_spacing: Spacing between grid points in degrees

        Returns:
            List of data points with lat, lon, and parameter values
        """
        if date is None:
            yesterday = datetime.utcnow() - timedelta(days=1)
            date = yesterday.strftime('%Y%m%d')

        # Create grid points
        lats = np.arange(
            bounds['min_lat'],
            bounds['max_lat'],
            grid_spacing
        )
        lons = np.arange(
            bounds['min_lon'],
            bounds['max_lon'],
            grid_spacing
        )

        grid_points = []
        for lat in lats:
            for lon in lons:
                grid_points.append((lat, lon))

        # Fetch data for all grid points (with rate limiting)
        results = []

        # NASA POWER API rate limit: ~50 requests/minute
        # We'll do batches with delays
        batch_size = 10
        delay_between_batches = 2  # seconds

        for i in range(0, len(grid_points), batch_size):
            batch = grid_points[i:i+batch_size]

            # Fetch batch concurrently
            tasks = [
                self.fetch_point_data(
                    latitude=lat,
                    longitude=lon,
                    parameters=parameters,
                    start_date=date,
                    end_date=date
                )
                for lat, lon in batch
            ]

            batch_results = await asyncio.gather(*tasks)

            # Process results
            for (lat, lon), data in zip(batch, batch_results):
                if data and 'properties' in data and 'parameter' in data['properties']:
                    point_data = {
                        'latitude': lat,
                        'longitude': lon,
                        'date': date
                    }

                    # Extract parameter values for the date
                    params = data['properties']['parameter']
                    for param_name in parameters:
                        if param_name in params:
                            param_values = params[param_name]
                            if isinstance(param_values, dict):
                                # Get value for the specific date
                                point_data[param_name.lower()] = param_values.get(date, None)
                            else:
                                point_data[param_name.lower()] = param_values

                    results.append(point_data)

            # Rate limiting delay
            if i + batch_size < len(grid_points):
                await asyncio.sleep(delay_between_batches)

            print(f"Fetched {len(results)}/{len(grid_points)} grid points...")

        return results

    async def fetch_wind_climate_india(
        self,
        date: Optional[str] = None,
        grid_spacing: float = 2.0
    ) -> List[Dict]:
        """
        Fetch wind and climate data for India
            date: Date (YYYYMMDD)
            grid_spacing: Grid spacing in degrees

        Returns:
            List of data points with wind, temperature, humidity
        """
        parameters = [
            'T2M',          # Temperature at 2m
            'WS10M',        # Wind Speed at 10m
            'WD10M',        # Wind Direction at 10m
            'RH2M',         # Relative Humidity at 2m
            'PS',           # Surface Pressure
        ]

        results = await self.fetch_grid_data(
            bounds=settings.INDIA_BOUNDS,
            parameters=parameters,
            date=date,
            grid_spacing=grid_spacing
        )

        # Rename fields to match our schema
        for point in results:
            point['temperature'] = point.pop('t2m', None)
            point['wind_speed'] = point.pop('ws10m', None)
            point['wind_direction'] = point.pop('wd10m', None)
            point['humidity'] = point.pop('rh2m', None)
            point['pressure'] = point.pop('ps', None)

        return results

    async def fetch_temperature_grid(
        self,
        date: Optional[str] = None,
        grid_spacing: float = 1.0
    ) -> Dict:
        """
        Fetch temperature grid for land surface temperature layer
            date: Date (YYYYMMDD)
            grid_spacing: Grid spacing in degrees

        Returns:
            Dict with lats, lons, temperatures arrays
        """
        parameters = ['T2M', 'T2M_MAX', 'T2M_MIN']

        results = await self.fetch_grid_data(
            bounds=settings.INDIA_BOUNDS,
            parameters=parameters,
            date=date,
            grid_spacing=grid_spacing
        )

        if not results:
            return {'lats': [], 'lons': [], 'temperatures': []}

        # Convert to 2D grid
        lats = sorted(list(set(p['latitude'] for p in results)))
        lons = sorted(list(set(p['longitude'] for p in results)))

        temp_grid = np.full((len(lats), len(lons)), np.nan)

        for point in results:
            lat_idx = lats.index(point['latitude'])
            lon_idx = lons.index(point['longitude'])
            temp_grid[lat_idx, lon_idx] = point.get('t2m', np.nan)

        return {
            'lats': lats,
            'lons': lons,
            'temperatures': temp_grid.tolist()
        }

    async def fetch_current_wind_data(self) -> List[Dict]:
        """
        Fetch current wind data for India (yesterday's data)

        Returns:
            List of wind data points
        """
        yesterday = datetime.utcnow() - timedelta(days=1)
        date = yesterday.strftime('%Y%m%d')

        return await self.fetch_wind_climate_india(date=date, grid_spacing=2.0)

    async def fetch_temperature_grid_india(
        self,
        date: Optional[str] = None,
        grid_spacing: float = 2.0
    ) -> List[Dict]:
        """
        Fetch temperature data for India as a list of points
            date: Date (YYYYMMDD), defaults to yesterday
            grid_spacing: Grid spacing in degrees

        Returns:
            List of data points with latitude, longitude, temperature
        """
        if date is None:
            yesterday = datetime.utcnow() - timedelta(days=1)
            date = yesterday.strftime('%Y%m%d')

        parameters = ['T2M', 'T2M_MAX', 'T2M_MIN']

        results = await self.fetch_grid_data(
            bounds=settings.INDIA_BOUNDS,
            parameters=parameters,
            date=date,
            grid_spacing=grid_spacing
        )

        # Rename fields to match expected schema
        processed = []
        for point in results:
            temp = point.get('t2m')
            if temp is not None and temp > -999:  # Filter out NASA's missing data indicator
                processed.append({
                    'latitude': point['latitude'],
                    'longitude': point['longitude'],
                    'temperature': temp,
                    'temperature_max': point.get('t2m_max'),
                    'temperature_min': point.get('t2m_min'),
                    'date': point.get('date', date)
                })

        print(f"[OK] Fetched {len(processed)} temperature points from NASA POWER")
        return processed

nasa_power_loader = NASAPOWERLoader()
