"""
Open Government Data (OGD) India Loader
Loads industry, power plant, and infrastructure data
Data sources:
- Power plants: https://data.gov.in
- Industrial clusters: https://data.gov.in
- Refineries and cement plants: https://data.gov.in
"""
import httpx
import pandas as pd
import io
from typing import List, Dict, Optional
from pathlib import Path
from config.settings import settings
from db.database import db_manager

class OGDIndiaLoader:
    """Load industrial and infrastructure data from OGD India"""

    def __init__(self):
        self.base_url = settings.OGD_INDIA_URL
        self.cache_dir = Path(settings.DATA_CACHE_DIR) / "ogd"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.session: Optional[httpx.AsyncClient] = None

        self.datasets = {
            'power_plants': {
                'url': 'https://data.gov.in/node/88797/download',
                'description': 'Thermal power plants in India',
                'file': 'power_plants.csv'
            },
            'cement_plants': {
                'url': 'https://data.gov.in/node/3604851/download',
                'description': 'Cement manufacturing units',
                'file': 'cement_plants.csv'
            },
            'refineries': {
                'url': 'https://data.gov.in/node/356531/download',
                'description': 'Oil refineries',
                'file': 'refineries.csv'
            },
            'industrial_clusters': {
                'url': 'https://data.gov.in/node/730551/download',
                'description': 'Industrial clusters and estates',
                'file': 'industrial_clusters.csv'
            }
        }

    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session"""
        if self.session is None:
            self.session = httpx.AsyncClient(timeout=120.0, follow_redirects=True)
        return self.session

    async def close(self):
        """Close HTTP session"""
        if self.session:
            await self.session.aclose()
            self.session = None

    async def download_dataset(self, dataset_key: str, force_refresh: bool = False) -> Optional[Path]:
        """
        Download dataset from OGD India
            dataset_key: Key from self.datasets
            force_refresh: Force re-download even if cached

        Returns:
            Path to cached file or None if error
        """
        if dataset_key not in self.datasets:
            print(f"Unknown dataset: {dataset_key}")
            return None

        dataset = self.datasets[dataset_key]
        cache_file = self.cache_dir / dataset['file']

        # Return cached file if exists and not forcing refresh
        if cache_file.exists() and not force_refresh:
            return cache_file

        session = await self._get_session()

        try:
            print(f"Downloading {dataset['description']}...")
            response = await session.get(dataset['url'])
            response.raise_for_status()

            cache_file.write_bytes(response.content)
            print(f"Downloaded {dataset_key} to {cache_file}")

            return cache_file

        except Exception as e:
            print(f"Error downloading {dataset_key}: {e}")
            print(f"Note: Some OGD India datasets may require manual download")
            print(f"Visit: {dataset['url']}")
            return None

    def load_power_plants(self) -> List[Dict]:
        """
        Load power plant data

        Returns:
            List of power plant dictionaries
        """
        cache_file = self.cache_dir / self.datasets['power_plants']['file']

        if not cache_file.exists():
            # Return sample structure - data not downloaded yet
            return self._get_sample_power_plants()

        try:
            df = pd.read_csv(cache_file)

            plants = []
            for _, row in df.iterrows():
                plants.append({
                    'name': row.get('Name', row.get('plant_name', '')),
                    'type': 'thermal_power',
                    'latitude': float(row.get('Latitude', row.get('latitude', 0))),
                    'longitude': float(row.get('Longitude', row.get('longitude', 0))),
                    'state': row.get('State', row.get('state', '')),
                    'capacity': str(row.get('Capacity', row.get('capacity_mw', '')))
                })

            return plants

        except Exception as e:
            print(f"Error loading power plants: {e}")
            return self._get_sample_power_plants()

    def load_refineries(self) -> List[Dict]:
        """Load refinery data"""
        cache_file = self.cache_dir / self.datasets['refineries']['file']

        if not cache_file.exists():
            return self._get_sample_refineries()

        try:
            df = pd.read_csv(cache_file)

            refineries = []
            for _, row in df.iterrows():
                refineries.append({
                    'name': row.get('Name', row.get('refinery_name', '')),
                    'type': 'refinery',
                    'latitude': float(row.get('Latitude', row.get('latitude', 0))),
                    'longitude': float(row.get('Longitude', row.get('longitude', 0))),
                    'state': row.get('State', row.get('state', '')),
                    'capacity': str(row.get('Capacity', row.get('capacity', '')))
                })

            return refineries

        except Exception as e:
            print(f"Error loading refineries: {e}")
            return self._get_sample_refineries()

    def load_cement_plants(self) -> List[Dict]:
        """Load cement plant data"""
        cache_file = self.cache_dir / self.datasets['cement_plants']['file']

        if not cache_file.exists():
            return self._get_sample_cement_plants()

        try:
            df = pd.read_csv(cache_file)

            plants = []
            for _, row in df.iterrows():
                plants.append({
                    'name': row.get('Name', row.get('plant_name', '')),
                    'type': 'cement',
                    'latitude': float(row.get('Latitude', row.get('latitude', 0))),
                    'longitude': float(row.get('Longitude', row.get('longitude', 0))),
                    'state': row.get('State', row.get('state', '')),
                    'capacity': str(row.get('Capacity', row.get('capacity', '')))
                })

            return plants

        except Exception as e:
            print(f"Error loading cement plants: {e}")
            return self._get_sample_cement_plants()

    def load_industrial_clusters(self) -> List[Dict]:
        """Load industrial cluster data"""
        cache_file = self.cache_dir / self.datasets['industrial_clusters']['file']

        if not cache_file.exists():
            return self._get_sample_industrial_clusters()

        try:
            df = pd.read_csv(cache_file)

            clusters = []
            for _, row in df.iterrows():
                clusters.append({
                    'name': row.get('Name', row.get('cluster_name', '')),
                    'type': 'industrial_cluster',
                    'latitude': float(row.get('Latitude', row.get('latitude', 0))),
                    'longitude': float(row.get('Longitude', row.get('longitude', 0))),
                    'state': row.get('State', row.get('state', '')),
                    'capacity': ''
                })

            return clusters

        except Exception as e:
            print(f"Error loading industrial clusters: {e}")
            return self._get_sample_industrial_clusters()

    async def save_to_database(self):
        """Save all industry data to database"""
        all_industries = (
            self.load_power_plants() +
            self.load_refineries() +
            self.load_cement_plants() +
            self.load_industrial_clusters()
        )

        for industry in all_industries:
            try:
                await db_manager.execute(
                    """
                    INSERT OR REPLACE INTO industries
                    (name, type, latitude, longitude, state, capacity)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        industry['name'],
                        industry['type'],
                        industry['latitude'],
                        industry['longitude'],
                        industry['state'],
                        industry['capacity']
                    )
                )
            except Exception as e:
                print(f"Error saving industry data: {e}")

    def _get_sample_power_plants(self) -> List[Dict]:
        """Sample power plant locations for testing"""
        return [
            {'name': 'Vindhyachal Thermal Power Station', 'type': 'thermal_power', 'latitude': 24.0954, 'longitude': 82.6568, 'state': 'Madhya Pradesh', 'capacity': '4760 MW'},
            {'name': 'Mundra Thermal Power Station', 'type': 'thermal_power', 'latitude': 22.8395, 'longitude': 69.7203, 'state': 'Gujarat', 'capacity': '4620 MW'},
            {'name': 'Talcher Super Thermal Power Station', 'type': 'thermal_power', 'latitude': 20.9517, 'longitude': 85.2315, 'state': 'Odisha', 'capacity': '3000 MW'},
        ]

    def _get_sample_refineries(self) -> List[Dict]:
        """Sample refinery locations"""
        return [
            {'name': 'Jamnagar Refinery', 'type': 'refinery', 'latitude': 22.4707, 'longitude': 70.0577, 'state': 'Gujarat', 'capacity': '1240000 bpd'},
            {'name': 'Paradip Refinery', 'type': 'refinery', 'latitude': 20.3142, 'longitude': 86.6114, 'state': 'Odisha', 'capacity': '300000 bpd'},
        ]

    def _get_sample_cement_plants(self) -> List[Dict]:
        """Sample cement plant locations"""
        return [
            {'name': 'Ultratech Cement Rajasthan', 'type': 'cement', 'latitude': 24.8829, 'longitude': 74.6291, 'state': 'Rajasthan', 'capacity': '10 MTPA'},
            {'name': 'ACC Cement Madhya Pradesh', 'type': 'cement', 'latitude': 23.1765, 'longitude': 79.9339, 'state': 'Madhya Pradesh', 'capacity': '8 MTPA'},
        ]

    def _get_sample_industrial_clusters(self) -> List[Dict]:
        """Sample industrial clusters"""
        return [
            {'name': 'Greater Noida Industrial Area', 'type': 'industrial_cluster', 'latitude': 28.4744, 'longitude': 77.5040, 'state': 'Uttar Pradesh', 'capacity': ''},
            {'name': 'Ludhiana Industrial Area', 'type': 'industrial_cluster', 'latitude': 30.9010, 'longitude': 75.8573, 'state': 'Punjab', 'capacity': ''},
        ]

ogd_india_loader = OGDIndiaLoader()
