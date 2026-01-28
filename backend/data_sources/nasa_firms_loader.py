"""
NASA FIRMS (Fire Information for Resource Management System) Data Loader
Fetches active fire data from MODIS and VIIRS satellites
Get your API key from: https://firms.modaps.eosdis.nasa.gov/api/
1. Create NASA Earthdata account: https://urs.earthdata.nasa.gov/users/new
2. Request MAP_KEY from: https://firms.modaps.eosdis.nasa.gov/api/area/
"""
import httpx
import asyncio
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from config.settings import settings
from db.database import db_manager

class NASAFIRMSLoader:
    """Load fire data from NASA FIRMS API"""

    def __init__(self):
        self.base_url = settings.NASA_FIRMS_URL
        self.api_key = settings.NASA_FIRMS_API_KEY
        self.session: Optional[httpx.AsyncClient] = None

        # India bounding box
        self.india_bbox = (
            settings.INDIA_BOUNDS['min_lat'],
            settings.INDIA_BOUNDS['min_lon'],
            settings.INDIA_BOUNDS['max_lat'],
            settings.INDIA_BOUNDS['max_lon']
        )

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

    def _check_api_key(self) -> bool:
        """Check if API key is configured"""
        if not self.api_key or self.api_key == "your_nasa_firms_api_key_here":
            print("WARNING: NASA FIRMS API key not configured")
            print("Get your key from: https://firms.modaps.eosdis.nasa.gov/api/")
            return False
        return True

    async def fetch_active_fires(
        self,
        source: str = 'VIIRS_NOAA20_NRT',
        days: int = 7,
        bbox: Optional[tuple] = None
    ) -> List[Dict]:
        """
        Fetch active fire detections
            source: Data source (VIIRS_NOAA20_NRT, MODIS_NRT, VIIRS_SNPP_NRT)
            days: Number of days to fetch (1-10)
            bbox: Custom bounding box (min_lat, min_lon, max_lat, max_lon)
        Returns:
            List of fire point dictionaries
        """
        if not self._check_api_key():
            return []

        session = await self._get_session()

        if bbox is None:
            bbox = self.india_bbox

        min_lat, min_lon, max_lat, max_lon = bbox

        # FIRMS API endpoint
        url = (
            f"{self.base_url}/area/csv/"
            f"{self.api_key}/{source}/"
            f"{min_lon},{min_lat},{max_lon},{max_lat}/"
            f"{days}"
        )

        fires = []

        try:
            response = await session.get(url)
            response.raise_for_status()

            # Parse CSV response
            lines = response.text.strip().split('\n')

            if len(lines) < 2:
                return []

            headers = lines[0].split(',')

            for line in lines[1:]:
                values = line.split(',')

                if len(values) != len(headers):
                    continue

                fire_data = dict(zip(headers, values))

                try:
                    fires.append({
                        'latitude': float(fire_data.get('latitude', 0)),
                        'longitude': float(fire_data.get('longitude', 0)),
                        'brightness': float(fire_data.get('brightness', 0)),
                        'scan': float(fire_data.get('scan', 0)),
                        'track': float(fire_data.get('track', 0)),
                        'acq_date': fire_data.get('acq_date', ''),
                        'acq_time': fire_data.get('acq_time', ''),
                        'satellite': fire_data.get('satellite', source),
                        'confidence': fire_data.get('confidence', 'nominal'),
                        'frp': float(fire_data.get('frp', 0)),
                        'daynight': fire_data.get('daynight', 'D'),
                        'type': int(fire_data.get('type', 0))
                    })
                except (ValueError, KeyError) as e:
                    print(f"Error parsing fire data: {e}")
                    continue

        except httpx.HTTPStatusError as e:
            print(f"HTTP error fetching FIRMS data: {e}")
            if e.response.status_code == 401:
                print("Invalid API key. Get a new key from NASA FIRMS.")
        except Exception as e:
            print(f"Error fetching FIRMS data: {e}")

        return fires

    async def fetch_historical_fires(
        self,
        start_date: str,
        end_date: str,
        source: str = 'VIIRS_NOAA20_NRT',
        bbox: Optional[tuple] = None
    ) -> List[Dict]:
        """
        Fetch historical fire data (date range)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            source: Data source
            bbox: Bounding box

        Returns:
            List of fire dictionaries
        """
        if not self._check_api_key():
            return []

        session = await self._get_session()

        if bbox is None:
            bbox = self.india_bbox

        min_lat, min_lon, max_lat, max_lon = bbox

        url = (
            f"{self.base_url}/area/csv/"
            f"{self.api_key}/{source}/"
            f"{min_lon},{min_lat},{max_lon},{max_lat}/"
            f"{start_date}/{end_date}"
        )

        fires = []

        try:
            response = await session.get(url)
            response.raise_for_status()

            lines = response.text.strip().split('\n')

            if len(lines) < 2:
                return []

            headers = lines[0].split(',')

            for line in lines[1:]:
                values = line.split(',')

                if len(values) != len(headers):
                    continue

                fire_data = dict(zip(headers, values))

                try:
                    fires.append({
                        'latitude': float(fire_data.get('latitude', 0)),
                        'longitude': float(fire_data.get('longitude', 0)),
                        'brightness': float(fire_data.get('brightness', 0)),
                        'scan': float(fire_data.get('scan', 0)),
                        'track': float(fire_data.get('track', 0)),
                        'acq_date': fire_data.get('acq_date', ''),
                        'acq_time': fire_data.get('acq_time', ''),
                        'satellite': fire_data.get('satellite', source),
                        'confidence': fire_data.get('confidence', 'nominal'),
                        'frp': float(fire_data.get('frp', 0))
                    })
                except (ValueError, KeyError):
                    continue

        except Exception as e:
            print(f"Error fetching historical FIRMS data: {e}")

        return fires

    async def save_to_database(self, fires: List[Dict]):
        """Save fire data to database"""
        for fire in fires:
            try:
                await db_manager.execute(
                    """
                    INSERT INTO nasa_firms_fires
                    (latitude, longitude, brightness, scan, track, acq_date, acq_time, satellite, confidence, frp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        fire['latitude'],
                        fire['longitude'],
                        fire['brightness'],
                        fire['scan'],
                        fire['track'],
                        fire['acq_date'],
                        fire['acq_time'],
                        fire['satellite'],
                        fire['confidence'],
                        fire['frp']
                    )
                )
            except Exception as e:
                print(f"Error saving fire data: {e}")

    async def get_fire_hotspots_by_date(self, date: str) -> List[Dict]:
        """Get fire hotspots for a specific date from database"""
        rows = await db_manager.fetch_all(
            """
            SELECT * FROM nasa_firms_fires
            WHERE acq_date = ?
            ORDER BY frp DESC
            """,
            (date,)
        )

        return [dict(row) for row in rows]

    async def get_fire_density_grid(
        self,
        date_from: str,
        date_to: str,
        grid_size: float = 0.5
    ) -> Dict:
        """
        Calculate fire density on a grid
            date_from: Start date
            date_to: End date
            grid_size: Grid cell size in degrees

        Returns:
            Dict with grid coordinates and fire counts
        """
        rows = await db_manager.fetch_all(
            """
            SELECT latitude, longitude FROM nasa_firms_fires
            WHERE acq_date BETWEEN ? AND ?
            """,
            (date_from, date_to)
        )

        if not rows:
            return {'lats': [], 'lons': [], 'counts': []}

        # Build grid
        import numpy as np
        lats = [row['latitude'] for row in rows]
        lons = [row['longitude'] for row in rows]

        lat_bins = np.arange(min(lats), max(lats), grid_size)
        lon_bins = np.arange(min(lons), max(lons), grid_size)

        counts, _, _ = np.histogram2d(lats, lons, bins=[lat_bins, lon_bins])

        return {
            'lats': lat_bins.tolist(),
            'lons': lon_bins.tolist(),
            'counts': counts.tolist()
        }

nasa_firms_loader = NASAFIRMSLoader()
