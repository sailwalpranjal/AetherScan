"""
Global Power Plant Database Loader
Source: World Resources Institute (WRI)
Download: https://datasets.wri.org/dataset/globalpowerplantdatabase
Direct download link:
https://wri-dataportal-prod.s3.amazonaws.com/manual/global_power_plant_database_v_1_3.zip

File: global_power_plant_database.csv
Expected location: backend/cache/data/power_plants/global_power_plant_database.csv
"""
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
from config.settings import settings

class GlobalPowerPlantLoader:
    """Load power plant data from WRI Global Power Plant Database"""

    def __init__(self):
        self.cache_dir = Path(settings.DATA_CACHE_DIR) / "power_plants"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.csv_file = self.cache_dir / "global_power_plant_database.csv"

    def is_data_available(self) -> bool:
        """Check if data file exists"""
        return self.csv_file.exists()

    def load_india_power_plants(self) -> List[Dict]:
        """
        Load power plants for India
        Returns:
            List of power plant dictionaries
        """
        if not self.is_data_available():
            print(f"[ERROR] Global Power Plant Database not found!")
            print(f"Expected location: {self.csv_file}")
            print(f"Download from: https://wri-dataportal-prod.s3.amazonaws.com/manual/global_power_plant_database_v_1_3.zip")
            print(f"Extract 'global_power_plant_database.csv' to: {self.cache_dir}")
            return self._get_sample_data()

        try:
            print(f"[INFO] Loading Global Power Plant Database...")
            df = pd.read_csv(self.csv_file, low_memory=False)

            # Filter for India
            india_df = df[df['country'] == 'IND'].copy()

            print(f"[OK] Found {len(india_df)} power plants in India")

            plants = []
            for _, row in india_df.iterrows():
                # Helper function to safely convert to float (handle NaN/Inf)
                def safe_float(val, default=0):
                    try:
                        if pd.isna(val):
                            return default
                        result = float(val)
                        # Check for inf or nan
                        if not (-1e308 < result < 1e308):  # Valid float range
                            return default
                        return result
                    except (ValueError, TypeError):
                        return default

                # Helper for safe int conversion
                def safe_int(val, default=None):
                    try:
                        if pd.isna(val):
                            return default
                        return int(val)
                    except (ValueError, TypeError):
                        return default

                plant = {
                    'gppd_id': str(row.get('gppd_idnr', ''))[:50],  # Limit string length
                    'name': str(row.get('name', 'Unknown Power Plant'))[:100],
                    'country': 'IND',
                    'latitude': safe_float(row.get('latitude'), 0),
                    'longitude': safe_float(row.get('longitude'), 0),
                    'primary_fuel': str(row.get('primary_fuel', 'unknown'))[:30],
                    'capacity_mw': safe_float(row.get('capacity_mw'), 0),
                    'commissioning_year': safe_int(row.get('commissioning_year')),
                    'owner': str(row.get('owner', ''))[:100] if pd.notna(row.get('owner')) else '',
                }

                # Only add if has valid coordinates
                if plant['latitude'] != 0 and plant['longitude'] != 0:
                    # Additional validation for JSON compliance
                    if -90 <= plant['latitude'] <= 90 and -180 <= plant['longitude'] <= 180:
                        if plant['capacity_mw'] >= 0:  # Positive capacity
                            plants.append(plant)

            print(f"[OK] Loaded {len(plants)} power plants with valid coordinates")
            return plants

        except Exception as e:
            print(f"[ERROR] Error loading Global Power Plant Database: {e}")
            return self._get_sample_data()

    def filter_by_fuel_type(self, plants: List[Dict], fuel_types: List[str]) -> List[Dict]:
        """
        Filter plants by fuel type
            plants: List of plant dictionaries
            fuel_types: List of fuel types (e.g., ['Coal', 'Gas', 'Nuclear'])

        Returns:
            Filtered list
        """
        return [
            plant for plant in plants
            if plant['primary_fuel'] in fuel_types
        ]

    def filter_by_capacity(self, plants: List[Dict], min_capacity: float = 0) -> List[Dict]:
        """
        Filter plants by minimum capacity
            plants: List of plant dictionaries
            min_capacity: Minimum capacity in MW

        Returns:
            Filtered list
        """
        return [
            plant for plant in plants
            if plant['capacity_mw'] >= min_capacity
        ]

    def get_statistics(self, plants: List[Dict]) -> Dict:
        """
        Get statistics for power plants
            plants: List of plant dictionaries

        Returns:
            Statistics dictionary
        """
        if not plants:
            return {}

        total_capacity = sum(p['capacity_mw'] for p in plants)
        fuel_types = {}

        for plant in plants:
            fuel = plant['primary_fuel']
            if fuel not in fuel_types:
                fuel_types[fuel] = {'count': 0, 'capacity': 0}
            fuel_types[fuel]['count'] += 1
            fuel_types[fuel]['capacity'] += plant['capacity_mw']

        return {
            'total_plants': len(plants),
            'total_capacity_mw': total_capacity,
            'average_capacity_mw': total_capacity / len(plants),
            'fuel_types': fuel_types,
            'largest_plant': max(plants, key=lambda x: x['capacity_mw']),
            'oldest_plant': min(
                [p for p in plants if p['commissioning_year']],
                key=lambda x: x['commissioning_year']
            ) if any(p['commissioning_year'] for p in plants) else None
        }

    def _get_sample_data(self) -> List[Dict]:
        """Sample data for testing when database not downloaded"""
        return [
            {
                'gppd_id': 'IND0000001',
                'name': 'Vindhyachal Thermal Power Station',
                'country': 'IND',
                'country_long': 'India',
                'latitude': 24.0954,
                'longitude': 82.6568,
                'primary_fuel': 'Coal',
                'capacity_mw': 4760,
                'commissioning_year': 1987,
                'owner': 'NTPC',
                'source': 'WRI',
                'url': '',
                'geolocation_source': 'Plant location',
                'wepp_id': '',
                'year_of_capacity_data': 2019,
                'other_fuel1': '',
                'other_fuel2': '',
                'other_fuel3': '',
                'generation_gwh_2017': 26000,
                'estimated_generation_gwh': 26000
            },
            {
                'gppd_id': 'IND0000002',
                'name': 'Mundra Thermal Power Station',
                'country': 'IND',
                'country_long': 'India',
                'latitude': 22.8395,
                'longitude': 69.7203,
                'primary_fuel': 'Coal',
                'capacity_mw': 4620,
                'commissioning_year': 2011,
                'owner': 'Adani Power',
                'source': 'WRI',
                'url': '',
                'geolocation_source': 'Plant location',
                'wepp_id': '',
                'year_of_capacity_data': 2019,
                'other_fuel1': '',
                'other_fuel2': '',
                'other_fuel3': '',
                'generation_gwh_2017': 23000,
                'estimated_generation_gwh': 23000
            },
            {
                'gppd_id': 'IND0000003',
                'name': 'Talcher Super Thermal Power Station',
                'country': 'IND',
                'country_long': 'India',
                'latitude': 20.9517,
                'longitude': 85.2315,
                'primary_fuel': 'Coal',
                'capacity_mw': 3000,
                'commissioning_year': 1999,
                'owner': 'NTPC',
                'source': 'WRI',
                'url': '',
                'geolocation_source': 'Plant location',
                'wepp_id': '',
                'year_of_capacity_data': 2019,
                'other_fuel1': '',
                'other_fuel2': '',
                'other_fuel3': '',
                'generation_gwh_2017': 15000,
                'estimated_generation_gwh': 15000
            }
        ]

global_power_plant_loader = GlobalPowerPlantLoader()
